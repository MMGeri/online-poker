import * as _ from 'lodash';
import { ICard, IGame, IPlayer, phases } from '../models/types/game';
import { io } from '../app';
import { dbModels, dbService } from '../shared/services/db.service';
import { calculateValueOfHand, removeSensitiveData, allDoneCondition, calculateMoneyNeeded } from '../shared/utils/utils';
import { GameEvent, HybridEvent, HybridEventNameEnum, NewStateResult, OutputEventNameEnum, PrivateEventNameEnum, SafeGameState } from './game-events.model';


const userActions = [
    HybridEventNameEnum.USER_CALLED,
    HybridEventNameEnum.USER_FOLDED,
    HybridEventNameEnum.USER_CHECKED,
    HybridEventNameEnum.USER_RAISED
];

class GameEventManager {
    private gameState: IGame;
    private gameChannelIdentifier: string;

    constructor(gameState: IGame) {
        this.gameState = gameState;
        this.gameChannelIdentifier = `game:${gameState._id}`;
    }

    // leave game for good, not the same as user left fire USER_DISCONNECTED event
    public async abandonGame(userId: string) {
        await this.refundMoney(userId);
        await this.updateFromDb();
        io.in(this.gameChannelIdentifier).emit('game-event', { event: { name: HybridEventNameEnum.USER_DISCONNECTED, userId }, gameState: this.gameState });
    }

    public async deleteGame() {
        await this.refundMoney();
        this.gameState.gameOver = true;
        await this.updateToDb();
        io.in(this.gameChannelIdentifier).emit('game-event', { event: { name: OutputEventNameEnum.GAME_ENDED }, gameState: this.gameState });
    }

    public async updateFromDb() {
        this.gameState = (await dbService.getDocumentById(dbModels.Game, this.gameState._id))!;
        io.in(this.gameChannelIdentifier).emit('game-event', { event: { name: OutputEventNameEnum.FORCE_UPDATE }, gameState: this.gameState });
    }

    public async getNewGameState(event: HybridEvent): Promise<{ events: GameEvent[]; gameState: Partial<SafeGameState> }> {
        const result = await this.calculateNewGameState(event);
        this.gameState = _.merge(this.gameState, result.newState);
        if (result.events.length > 0) {
            await this.updateToDb();
        }
        return { events: result.events, gameState: removeSensitiveData(this.gameState) };
    }

    private async calculateNewGameState(event: HybridEvent): Promise<NewStateResult> {
        let result: NewStateResult = { events: [], newState: this.gameState };
        let eventResult: { event: GameEvent | null; newState: IGame };
        const currentPlayerTurn: string =
            this.gameState.players
                .find((player) => player.positionAtTable === this.gameState.playerTurn)!
                .userId
                .toString();
        if (event.amount) {
            event.amount = parseInt(event.amount.toString(), 10);
            if (isNaN(event.amount) || event.amount < 0) {
                return result;
            }
        }

        switch (event.name) {
            case HybridEventNameEnum.USER_CONNECTED:
                result.newState.players.find((player) => player.userId === event.userId)!.connected = true;
                result.events.push(event);
                break;
            case HybridEventNameEnum.USER_DISCONNECTED:
                result.newState.players.find((player) => player.userId === event.userId)!.connected = false;
                result.events.push(event);
                break;
            case HybridEventNameEnum.START_GAME:
                if (!result.newState.gameStarted) {
                    this.handlePhaseChange(result);
                    this.newRound(result);
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
        const player = newState.players.find((p) => p.userId === event.userId)!;
        switch (event.name) {
            case HybridEventNameEnum.USER_CALLED:
                return this.handleCallEvent(newState, event, player);
            case HybridEventNameEnum.USER_FOLDED:
                return this.handleFoldEvent(newState, event, player);
            case HybridEventNameEnum.USER_CHECKED:
                return this.handleCheckEvent(newState, event, player);
            case HybridEventNameEnum.USER_RAISED:
                return this.handleRaiseEvent(newState, event, player);
            case HybridEventNameEnum.USER_SET_BALANCE:
                return await this.handleSetBalanceEvent(newState, event, player);
            case HybridEventNameEnum.USER_READY:
                if (newState.phase === 'Getting-Ready') {
                    player.ready = true;
                    return { event, newState };
                }
                return { event: null, newState };
            default:
                return { event: null, newState };
        }
    }

    private async updateToDb() {
        await dbService.updateDocumentById(dbModels.Game, this.gameState._id, this.gameState);
    }

    private async refundMoney(userId?: string) {
        if (userId) {
            const player = this.gameState.players.find((p) => p.userId === userId);
            if (player) {
                const playerFromDb = await dbService.getDocumentById(dbModels.User, userId);
                if (!playerFromDb) {
                    console.log('Could not find player in db', player.userId);
                    return;
                }
                await dbService.updateDocumentById(dbModels.User, userId, {
                    $set: { balance: player.inGameBalance + playerFromDb.balance + player.bet }
                });
            }
        } else {
            const players = this.gameState.players;
            for (const player of players) {
                const playerFromDb = await dbService.getDocumentById(dbModels.User, player.userId.toString());
                if (!playerFromDb) {
                    console.log('Could not find player in db', player.userId);
                    continue;
                }
                await dbService.updateDocumentById(dbModels.User, player.userId.toString(), {
                    $set: { balance: player.inGameBalance + playerFromDb.balance + player.bet }
                });
            }
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
        const players = result.newState.players;
        const allDone = _.every(players, allDoneCondition(result));
        const allReady = _.every(players, (player) => player.ready);
        const blind = players.find((player) => player.positionAtTable === 0);
        const blindsPlaced = blind ? blind.bet > 0 : false;

        // Pre-flop phase // everyone gets 2 cards dealt
        if (result.newState.phase === 'Getting-Ready' && allReady && blindsPlaced) {
            // shuffle players
            const randomSequence = _.shuffle(_.range(0, _.values(result.newState.players).length));
            let i = 0;
            result.newState.players.forEach(player => {
                player.positionAtTable = randomSequence[i++];
            });
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
            result = await this.payoutRoundWinners(result);
            result = this.newRound(result);
            result.events.push({ name: OutputEventNameEnum.ROUND_ENDED });
            return result;
        }
        return result;
    }

    private dealCards(result: NewStateResult) {
        const cards = result.newState.cardsInDeck;
        result.newState.players.forEach(player => {
            const twoCards = _.takeRight(cards, 2);
            player.cards = twoCards;
            result.events.push({ name: PrivateEventNameEnum.CARDS_DEALT, userId: player.userId, cards: twoCards });
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
        const playersLeft = _.every(result.newState.players, (player: IPlayer) => player.connected);
        if (playersLeft) {
            result.newState.gameOver = true;
            this.deleteGame();
        }
    }

    private async payoutRoundWinners(result: NewStateResult) {
        const players: IPlayer[] = result.newState.players;
        const playersInGame = players.filter((player) => !player.folded && !player.connected);
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
            const playerFromDb = await dbService.getDocumentById(dbModels.User, player.userId.toString());
            if (!playerFromDb) {
                continue;
            }
            const updated = await dbService.updateDocumentById(dbModels.User, player.userId.toString(), {
                $set: { balance: player.inGameBalance + playerFromDb.balance }
            });
            if (!updated) {
                console.log('Could not update player balance');
            }
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
        const players = result.newState.players;
        const condtion = (player: IPlayer) => !player.folded && !player.connected && !player.tapped;
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

    private handleCallEvent(newState: IGame, event: HybridEvent, player: IPlayer) {
        const isBlind = player.positionAtTable === 0;
        if (!event.amount || !isBlind && newState.phase === 'Getting-Ready') {
            return { event: null, newState };
        }
        const moneyNeeded = calculateMoneyNeeded(newState, event);
        const hasEnoughBalance = player.inGameBalance >= moneyNeeded;
        if (hasEnoughBalance) {
            player.inGameBalance -= moneyNeeded;
            player.bet += moneyNeeded;
            newState.pot += moneyNeeded;
            player.called = true;
            player.tapped = player.inGameBalance === 0;
            player.tappedAtPot = newState.pot;
            return { event, newState: newState };
        }
        return { event: { name: PrivateEventNameEnum.INSUFFICIENT_BALANCE, userId: event.userId }, newState };
    }

    private handleFoldEvent(newState: IGame, event: HybridEvent, player) {
        const hasPlayerAlreadyFolded = player.connected;
        if (!hasPlayerAlreadyFolded) {
            player.folded = false;
            return { event, newState };
        }
        return { event: null, newState };
    }

    private handleCheckEvent(newState: IGame, event: HybridEvent, player: IPlayer) {
        const hasPlayerAlreadyChecked = player.checked;
        const canPlayerCheck = newState.pot === player.bet;
        if (!hasPlayerAlreadyChecked && canPlayerCheck) {
            player.checked = true;
            return { event, newState };
        }
        return { event: null, newState };
    }

    private handleRaiseEvent(newState: IGame, event: HybridEvent, player: IPlayer) {
        const isBlind = player.positionAtTable === 0;
        if (!event.amount || !isBlind && newState.phase === 'Getting-Ready') {
            return { event: null, newState };
        }
        const moneyNeeded = calculateMoneyNeeded(newState, event);
        const hasEnoughBalance = player.inGameBalance >= moneyNeeded;
        const hasntRaisedTooManyTimes = player.raisedTimes < newState.options.maxRaises;
        if (hasEnoughBalance && hasntRaisedTooManyTimes) {
            player.inGameBalance -= moneyNeeded;
            player.bet += moneyNeeded;
            newState.pot += moneyNeeded;
            player.raisedTimes++;
            player.tapped = player.inGameBalance === 0;
            player.tappedAtPot = newState.pot;
            return { event, newState };
        }
        return { event: { name: PrivateEventNameEnum.INSUFFICIENT_BALANCE, userId: event.userId }, newState };
    }

    private async handleSetBalanceEvent(newState: IGame, event: HybridEvent, player: IPlayer) {
        if (!event.amount) {
            return { event: null, newState };
        }
        const playerFromDb = (await dbService.getDocumentById(dbModels.User, event.userId))!;
        const hasEnoughFunds = playerFromDb.balance >= event.amount;
        if (newState.phase === 'Getting-Ready' && hasEnoughFunds) {
            await dbService.updateDocumentById(dbModels.User, event.userId, {
                $set: { balance: playerFromDb.balance - event.amount }
            });
            player.inGameBalance = event.amount;
            return { event, newState };
        }
        return { event: null, newState };
    }
}

interface GameEvenManagers {
    [key: string]: GameEventManager; // key is gameId
}

class GameEventManagerService {
    public gameEventManagers: GameEvenManagers = {};

    constructor() {
        this.init();
    }

    async init() {
        setTimeout(async () => {
            const games = await dbService.getDocumentsByQuery(dbModels.Game, { gameOver: false });
            games.forEach((game) => {
                this.createGameEventManager(game);
            });
        }, 1000);
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
