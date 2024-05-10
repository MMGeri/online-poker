import * as _ from 'lodash';
import { ICard, IGame, IPlayer } from '../models/game';
import { io } from '../app';
import { dbModels, dbService } from '../shared/services/db.service';
import { GameEvent, HybridEvent, HybridEventNameEnum, NewStateResult, OutputEventNameEnum, PrivateEventNameEnum, SafeGameState } from './game-events.model';
import { calculateValueOfHand, removeSensitiveData, allDoneCondition, calculateMoneyNeeded } from './utils';


const userActions = [
    HybridEventNameEnum.USER_CALLED,
    HybridEventNameEnum.USER_FOLDED,
    HybridEventNameEnum.USER_CHECKED,
    HybridEventNameEnum.USER_RAISED
];

export const phases = ['Getting-Ready', 'Pre-flop', 'Flop', 'Turn', 'River'] as const;

class GameEventManager {
    private gameState: IGame;
    private gameChannelIdentifier: string;

    constructor(gameState: IGame) {
        this.gameState = gameState;
        this.gameChannelIdentifier = `game:${gameState._id}`;
    }

    public async deleteGame() {
        io.of('/').in(this.gameChannelIdentifier).emit('game-event', { name: OutputEventNameEnum.GAME_ENDED });
        await dbService.updateDocumentById(dbModels.Game, this.gameState._id, { gameOver: true });
        this.gameState.gameOver = true;
        // disconnect sockets
        const namespace = io.of('/').in(this.gameChannelIdentifier);
        namespace.fetchSockets().then((sockets) => {
            sockets.forEach((socket) => {
                socket.disconnect();
            });
        });
    }

    public async getNewGameState(event: HybridEvent): Promise<{ events: GameEvent[]; gameState: Partial<SafeGameState> }> {
        const result = await this.calculateNewGameState(event);
        this.gameState = _.merge(this.gameState, result.newState);
        if (result.events.length > 0) {
            // const originalGameState = await dbService.getGamesByQuery({ _id: this.gameState._id });
            // this.gameState.options = originalGameState[0].options;
            await dbService.updateDocumentById(dbModels.Game, this.gameState._id, this.gameState);
        }
        return { events: result.events, gameState: removeSensitiveData(this.gameState) };
    }

    private async calculateNewGameState(event: HybridEvent): Promise<NewStateResult> {
        let result: NewStateResult = { events: [], newState: this.gameState };
        let eventResult: { event: GameEvent | null; newState: IGame };
        const currentPlayerTurn: string = Object.values(this.gameState.players).find((player) => player.positionAtTable === this.gameState.playerTurn)!.userId;
        if (event.amount) {
            event.amount = parseInt(event.amount.toString(), 10);
            if (isNaN(event.amount) || event.amount < 0) {
                return result;
            }
        }

        switch (event.name) {
            case HybridEventNameEnum.OPTIONS_CHANGED:
                if (event.options && event.userId === this.gameState.ownerId) {
                    result.newState.options = event.options;
                    result.events.push(event);
                }
                break;
            case HybridEventNameEnum.USER_JOINED:
                result.newState.players[event.userId].leftGame = false;
                result.events.push(event);
                break;
            case HybridEventNameEnum.USER_LEFT:
                result.newState.players[event.userId].leftGame = true;
                result.events.push(event);
                break;
            case HybridEventNameEnum.START_GAME:
                if (!result.newState.gameStarted) {
                    result.newState.gameStarted = true;
                    result.events.push(event);
                }
                break;
            case HybridEventNameEnum.USER_CALLED:
            case HybridEventNameEnum.USER_FOLDED:
            case HybridEventNameEnum.USER_CHECKED:
            case HybridEventNameEnum.USER_RAISED:
            case HybridEventNameEnum.USER_SET_BALANCE:
            case HybridEventNameEnum.USER_READY:
                if (event.userId !== currentPlayerTurn) {
                    break;
                }
                eventResult = await this.processUserEvent(result.newState, event);
                if (eventResult.event) {
                    result.events.push(eventResult.event);
                    result.newState = eventResult.newState;
                    result = await this.calculateAdditionalEvents(result);
                }
                break;
            default:
                return result;
        }

        return result;
    }

    private async processUserEvent(newState: IGame, event: HybridEvent): Promise<{ event: GameEvent | null; newState: IGame }> {
        switch (event.name) {
            case HybridEventNameEnum.USER_CALLED:
                return this.handleCallEvent(newState, event);
            case HybridEventNameEnum.USER_FOLDED:
                return this.handleFoldEvent(newState, event);
            case HybridEventNameEnum.USER_CHECKED:
                return this.handleCheckEvent(newState, event);
            case HybridEventNameEnum.USER_RAISED:
                return this.handleRaiseEvent(newState, event);
            case HybridEventNameEnum.USER_SET_BALANCE:
                return await this.handleSetBalanceEvent(newState, event);
            case HybridEventNameEnum.USER_READY:
                if (newState.phase === 'Getting-Ready') {
                    newState.players[event.userId].ready = true;
                    return { event, newState };
                }
                return { event: null, newState };
            default:
                return { event: null, newState };
        }
    }

    private async calculateAdditionalEvents(result: NewStateResult) {
        result = await this.handlePhaseChange(result);
        this.handleGameEnded(result);
        const hasUserAction = _.some(result.events, (event: GameEvent) => event.name in userActions);
        const nextRequired = !result.events.find(
            (event) => event.name in [OutputEventNameEnum.ROUND_ENDED, OutputEventNameEnum.GAME_ENDED, OutputEventNameEnum.NEW_PHASE]
        );
        /* if there is a new phase, it will change the game state
        thus no next player calculation is required
        next player calculation is only required for betting actions
        */
        if (hasUserAction && nextRequired) {
            const nextUser = this.findNextPlayerWhoCanPlay(result);
            result.newState.playerTurn = nextUser.positionAtTable;
            result.events.push({ name: OutputEventNameEnum.NEXT_PLAYER, userId: nextUser.userId });
        }
        return result;
    }

    private async handlePhaseChange(result: NewStateResult) {
        const players = Object.values(result.newState.players);
        const allDone = _.every(players, allDoneCondition(result));
        const allReady = _.every(players, (player) => player.ready);
        const blindsPlaced = _.find(players, (player) => player.positionAtTable === 0).bet > 0;

        // Pre-flop phase // everyone gets 2 cards dealt
        if (result.newState.phase === 'Getting-Ready' && allReady && blindsPlaced) {
            result = this.nextPhase(result);
            result = this.dealCards(result);
            result.events.push({ name: OutputEventNameEnum.NEW_PHASE });
            return result;
        }
        // Flop phase // 3 cards dealt
        if (result.newState.phase === 'Pre-flop' && allDone) {
            result = this.nextPhase(result);
            result = this.placeCards(result, 3);
            result.events.push({ name: OutputEventNameEnum.NEW_PHASE });
            return result;
        }
        // Turn phase // fourth card dealt
        if (result.newState.phase === 'Flop' && allDone) {
            result = this.nextPhase(result);
            result = this.placeCards(result, 1);
            result.events.push({ name: OutputEventNameEnum.NEW_PHASE });
            return result;
        }
        // River phase // fifth card dealt
        if (result.newState.phase === 'Turn' && allDone) {
            result = this.nextPhase(result);
            result = this.placeCards(result, 1);
            result.events.push({ name: OutputEventNameEnum.NEW_PHASE });
            return result;
        }
        if (result.newState.phase === 'River' && allDone) {
        // shuffle players
            const randomSequence = _.shuffle(_.range(0, _.values(result.newState.players).length));
            result.newState.players.forEach((value: IPlayer, key: string) => {
                value.positionAtTable = randomSequence[value.positionAtTable];
            });
            result = await this.payoutRoundWinners(result);
            result = this.newRound(result);
            result.events.push({ name: OutputEventNameEnum.ROUND_ENDED });
            return result;
        }
        return result;
    }

    private dealCards(result: NewStateResult) {
        const cards = result.newState.cardsInDeck;
        result.newState.players.forEach((player: IPlayer, key: string) => {
            const twoCards = _.takeRight(cards, 2);
            player.cards = twoCards;
        });
        return result;
    }

    private placeCards(result: NewStateResult, amount: number) {
        const cards = result.newState.cardsInDeck;
        const cardsOnTable = result.newState.cardsOnTable;
        const newCards = _.takeRight(cards, amount);
        result.newState.cardsOnTable = [...cardsOnTable, ...newCards];
        return result;
    }

    private handleGameEnded(result: NewStateResult) {
        const playersLeft = _.every(result.newState.players, (player: IPlayer) => player.leftGame);
        if (playersLeft) {
            result.newState.gameOver = true;
            this.deleteGame();
        }
    }

    private async payoutRoundWinners(result: NewStateResult) {
        const players: IPlayer[] = Object.values(result.newState.players);
        const playersInGame = players.filter((player) => !player.folded && !player.leftGame);
        const playerHandValues = playersInGame.map(
            (player) => ({ ...player, value: calculateValueOfHand(player.cards.concat(result.newState.cardsOnTable)) })
        );

        const orderOfPlayers = _.sortBy(playerHandValues, (player: IPlayer & { value: number }) => player.value);

        const bestHand = orderOfPlayers[orderOfPlayers.length - 1].value;
        const secondBestHand = orderOfPlayers.find((player: IPlayer & { value: number }) => player.value !== bestHand)!.value;

        const winners = orderOfPlayers.filter((player: IPlayer & { value: number }) => player.value === bestHand);
        const winnersWithTap = winners.filter((player) => player.tapped);
        const winnersWithoutTap = winners.filter((player) => !player.tapped);

        const secondaryWinners = orderOfPlayers.filter((player: IPlayer & { value: number }) => player.value === secondBestHand);
        const secondaryWinnersWithTap = secondaryWinners.filter((player) => player.tapped);
        const secondaryWinnersWithoutTap = secondaryWinners.filter((player) => !player.tapped);

        for (const winner of winnersWithTap) {
            winner.inGameBalance -= winner.tappedAtPot;
            result.newState.pot -= winner.tappedAtPot;
        }

        if (winnersWithoutTap.length <= 0) {
            for (const secondaryWinner of secondaryWinnersWithTap) {
                secondaryWinner.inGameBalance -= secondaryWinner.tappedAtPot;
                result.newState.pot -= secondaryWinner.tappedAtPot;
            }
            for (const secondaryWinner of secondaryWinnersWithoutTap) {
                secondaryWinner.inGameBalance += result.newState.pot / secondaryWinnersWithoutTap.length;
            }
        } else {
            for (const winner of winnersWithoutTap) {
                winner.inGameBalance += result.newState.pot / winnersWithoutTap.length;
            }
        }
        for (const player of players) {
            const playerFromDb = await dbService.getDocumentsByQuery(dbModels.User, { _id: player.userId });
            await dbService.updateDocumentById(dbModels.User, player.userId, { balance: player.inGameBalance + playerFromDb[0].balance });
        }

        return result;
    }

    private nextPhase(result: NewStateResult) {
        const currentPhaseIndex = phases.indexOf(result.newState.phase);
        result.newState.phase = phases[currentPhaseIndex + 1];
        result.newState.playerTurn = 0;
        result.newState.players.forEach((player) => {
            player.called = false;
            player.checked = false;
            player.raisedTimes = 0;
        });
        return result;
    }

    private newRound(result: NewStateResult) {
        const newDeck = (): ICard[] => {
            const signs: ICard['sign'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
            const values: ICard['value'][] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
            const deck: ICard[] = [];
            signs.forEach((sign) => {
                values.forEach((value) => {
                    deck.push({ sign, value });
                });
            });
            const shuffledDeck = _.shuffle(deck);
            return shuffledDeck;
        };
        result.newState.round++;
        result.newState.cardsOnTable = [];
        result.newState.cardsInDeck = newDeck();
        result.newState.phase = 'Getting-Ready';
        result.newState.playerTurn = 0;
        result.newState.pot = 0;
        result.newState.players.forEach((player) => {
            player.cards = [];
            player.called = false;
            player.checked = false;
            player.tapped = false;
            player.folded = false;
            player.raisedTimes = 0;
            player.bet = 0;
            player.ready = false;
        });
        return result;
    }

    private findNextPlayerWhoCanPlay(result: NewStateResult) {
        const playerTurn = result.newState.playerTurn;
        const players = Object.values(result.newState.players);
        const condtion = (player: IPlayer) => !player.folded && !player.leftGame && !player.tapped;
        let nextPlayer: IPlayer;
        for (let i = 0; i < players.length; i++) {
            const player = players[(playerTurn + i) % players.length];
            if (condtion(player)) {
                nextPlayer = player;
                break;
            }
        }
        return nextPlayer!;
    }

    private handleCallEvent(newState: IGame, event: HybridEvent) {
        const isBlind = newState.players[event.userId].positionAtTable === 0;
        if (!event.amount || !isBlind && newState.phase === 'Getting-Ready') {
            return { event: null, newState };
        }
        const moneyNeeded = calculateMoneyNeeded(newState, event);
        const hasEnoughBalance = newState.players[event.userId].inGameBalance >= moneyNeeded;
        if (hasEnoughBalance) {
            newState.players[event.userId].inGameBalance -= moneyNeeded;
            newState.players[event.userId].bet += moneyNeeded;
            newState.pot += moneyNeeded;
            newState.players[event.userId].called = true;
            newState.players[event.userId].tapped = newState.players[event.userId].inGameBalance === 0;
            newState.players[event.userId].tappedAtPot = newState.pot;
            return { event, newState: newState };
        }
        return { event: { name: PrivateEventNameEnum.INSUFFICIENT_BALANCE, userId: event.userId }, newState };
    }

    private handleFoldEvent(newState: IGame, event: HybridEvent) {
        const hasPlayerAlreadyFolded = newState.players[event.userId].leftGame;
        if (!hasPlayerAlreadyFolded) {
            newState.players[event.userId].folded = false;
            return { event, newState };
        }
        return { event: null, newState };
    }

    private handleCheckEvent(newState: IGame, event: HybridEvent) {
        const hasPlayerAlreadyChecked = newState.players[event.userId].checked;
        const canPlayerCheck = newState.pot === newState.players[event.userId].bet;
        if (!hasPlayerAlreadyChecked && canPlayerCheck) {
            newState.players[event.userId].checked = true;
            return { event, newState };
        }
        return { event: null, newState };
    }

    private handleRaiseEvent(newState: IGame, event: HybridEvent) {
        const isBlind = newState.players[event.userId].positionAtTable === 0;
        if (!event.amount || !isBlind && newState.phase === 'Getting-Ready') {
            return { event: null, newState };
        }
        const moneyNeeded = calculateMoneyNeeded(newState, event);
        const hasEnoughBalance = newState.players[event.userId].inGameBalance >= moneyNeeded;
        const hasntRaisedTooManyTimes = newState.players[event.userId].raisedTimes < newState.options.maxRaises;
        if (hasEnoughBalance && hasntRaisedTooManyTimes) {
            newState.players[event.userId].inGameBalance -= moneyNeeded;
            newState.players[event.userId].bet += moneyNeeded;
            newState.pot += moneyNeeded;
            newState.players[event.userId].raisedTimes++;
            newState.players[event.userId].tapped = newState.players[event.userId].inGameBalance === 0;
            newState.players[event.userId].tappedAtPot = newState.pot;
            return { event, newState };
        }
        return { event: { name: PrivateEventNameEnum.INSUFFICIENT_BALANCE, userId: event.userId }, newState };
    }

    private async handleSetBalanceEvent(newState: IGame, event: HybridEvent) {
        if (!event.amount) {
            return { event: null, newState };
        }
        const playerFromDb = await dbService.getDocumentsByQuery(dbModels.User, { _id: event.userId });
        const hasEnoughFunds = playerFromDb[0].balance >= event.amount;
        if (newState.phase === 'Getting-Ready' && hasEnoughFunds) {
            await dbService.updateDocumentById(dbModels.User, event.userId, { balance: playerFromDb[0].balance - event.amount });
            newState.players[event.userId].inGameBalance = event.amount;
            return { event, newState };
        }
        return { event: null, newState };
    }
}

interface GameEvenManagers {
    [key: string]: GameEventManager; // key is gameId
}

class GameEventManagerService {
    private gameEventManagers: GameEvenManagers = {};

    public getGameEventManager(gameId: string): GameEventManager | undefined {
        return this.gameEventManagers[gameId];
    }

    public async deleteGameEventManager(gameId: string) {
        await this.gameEventManagers[gameId].deleteGame();
        delete this.gameEventManagers[gameId];
    }

    public createGameEventManager(game: IGame): GameEventManager {
        const gameEventManager = new GameEventManager(game);
        this.gameEventManagers[game._id] = gameEventManager;
        return gameEventManager;
    }
}

export const gems = new GameEventManagerService();
