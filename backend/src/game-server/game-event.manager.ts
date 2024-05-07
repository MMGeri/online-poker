import * as _ from 'lodash';
import { ICard, IGame, IPlayer } from '../models/game';
import { io } from '../app';
import { dbService } from '../shared/services/db.service';
import { GameEvent, HybridEvent, HybridEventNameEnum, OutputEventNameEnum, PrivateEventNameEnum } from './game-events.model';

interface GameEvenManagers {
    [key: string]: GameEventManager; // key is gameId
}

type SafePlayer = Omit<IPlayer, 'cards'>;

interface SafeGameState extends Omit<IGame, 'cardsInDeck' | 'players'> {
    players: Map<string, SafePlayer>;
}

interface NewStateResult {
    events: GameEvent[];
    newState: IGame;
}

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

    public async deleteGame() {
        io.of('/').in(this.gameChannelIdentifier).emit('game-event', { name: OutputEventNameEnum.GAME_ENDED });
        await dbService.updateGameById(this.gameState._id, { gameOver: true });
        this.gameState.gameOver = true;
        // disconnect sockets
        const namespace = io.of('/').in(this.gameChannelIdentifier);
        namespace.fetchSockets().then((sockets) => {
            sockets.forEach((socket) => {
                socket.disconnect();
            });
        });
    }

    public async getNewGameState(event: HybridEvent): Promise<{ events: GameEvent[]; gameState: SafeGameState }> {
        const result = await this.calculateNewGameState(event);
        this.gameState = _.merge(this.gameState, result.newState);
        await dbService.updateGameById(this.gameState._id, this.gameState);
        return { events: result.events, gameState: this.removeSensitiveData(this.gameState) };
    }

    private async calculateNewGameState(event: HybridEvent): Promise<NewStateResult> {
        let result: NewStateResult = { events: [], newState: this.gameState };
        let eventResult: { event: GameEvent | null; newState: IGame };
        // if user action then check if it is his turn, if not return with no event
        const currentPlayerTurn: string = Object.values(this.gameState.players).find((player) => player.positionAtTable === this.gameState.playerTurn)!.userId;
        if (event.userId !== currentPlayerTurn) {
            return result;
        }
        switch (event.name) {
            case HybridEventNameEnum.USER_JOINED:
            case HybridEventNameEnum.USER_LEFT:
                result.events.push(event);
                break;
            case HybridEventNameEnum.USER_CALLED:
            case HybridEventNameEnum.USER_FOLDED:
            case HybridEventNameEnum.USER_CHECKED:
            case HybridEventNameEnum.USER_RAISED:
            case HybridEventNameEnum.START_GAME:
            case HybridEventNameEnum.USER_SET_BALANCE:
                eventResult = await this.processEvent(result.newState, event);
                if (eventResult.event) {
                    result.events.push(eventResult.event);
                }
                result.newState = eventResult.newState;
                break;
            default:
                return result;
        }
        result = this.calculateAdditionalEvents(result);
        return result;
    }

    private async processEvent(newState: IGame, event: HybridEvent): Promise<{ event: GameEvent | null; newState: IGame }> {
        switch (event.name) {
            case HybridEventNameEnum.USER_CALLED:
                return this.callIfPossible(newState, event);
            case HybridEventNameEnum.USER_FOLDED:
                return this.playerFolded(newState, event);
            case HybridEventNameEnum.USER_CHECKED:
                return this.checkIfPossible(newState, event);
            case HybridEventNameEnum.USER_RAISED:
                return this.raiseIfPossible(newState, event);
            case HybridEventNameEnum.START_GAME:
                return this.startGame(newState, event);
            case HybridEventNameEnum.USER_SET_BALANCE:
                return await this.setBalanceOfUser(newState, event);
            default:
                return { event: null, newState };
        }
    }

    private calculateAdditionalEvents(result: NewStateResult) {
        result = this.checkIfRoundEnded(result);
        result = this.checkIfGameEnded(result);
        if (result.events.find((event) => event.name in [OutputEventNameEnum.ROUND_ENDED, OutputEventNameEnum.GAME_ENDED])) {
            return result;
        }
        if (_.some(result.events, (event: GameEvent) => event.name in userActions)) {
            const nextUser = this.findNextPlayerWhoCanPlay(result);
            result.newState.playerTurn = nextUser.positionAtTable;
            result.events.push({ name: OutputEventNameEnum.NEXT_PLAYER, userId: nextUser.userId });
        }
        return result;
    }

    private checkIfGameEnded(result: NewStateResult) {
        const playersLeft = _.every(result.newState.players, (player: IPlayer) => player.leftGame);
        if (playersLeft) {
            result.newState.gameOver = true;
            result.events.push({ name: OutputEventNameEnum.GAME_ENDED });
            this.deleteGame();
        }
        return result;
    }

    private checkIfRoundEnded(result: NewStateResult) {
        const everyoneCalledOrFoldedOrAllInned = _.every(result.newState.players,
            (player: IPlayer) => player.called || player.folded || player.inGameBalance === 0);
        const everyoneReachedMaxRaises = _.every(result.newState.players,
            (player: IPlayer) => player.raisedTimes >= result.newState.options.maxRaises);
        if (everyoneCalledOrFoldedOrAllInned || everyoneReachedMaxRaises) {
            const randomSequence = _.shuffle(_.range(0, _.values(result.newState.players).length));
            result.newState.players.forEach((value: IPlayer, key: string) => {
                value.positionAtTable = randomSequence[value.positionAtTable];
            });
            this.payoutRoundWinners(result);
            result.newState.playerTurn = 0;
            result.newState.round++;
            result.newState.players.forEach((player) => {
                player.called = false;
                player.checked = false;
                player.raisedTimes = 0;
                player.bet = 0;
            });
            result.events.push({ name: OutputEventNameEnum.ROUND_ENDED });
        }
        return result;
    }

    private async payoutRoundWinners(result: NewStateResult) {
        const players: IPlayer[] = Object.values(result.newState.players);
        const playersInGame = players.filter((player) => !player.folded);
        const playerHandValues = playersInGame.map(
            (player) => ({ ...player, value: this.calculateValueOfHand(player.cards.concat(result.newState.cardsOnTable)) })
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
        result.newState.pot = 0;
    }

    // TODO: move to anuther file
    private calculateValueOfHand(cards: ICard[]): number {
        const valuesMap: { [key: string]: number } = {
            '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7, '9': 8, '10': 9, 'J': 10, 'Q': 11, 'K': 12, 'A': 13
        };
        const isStraight = (cs: ICard[]) => {
            const groupedBySign = _.groupBy(cs, 'sign');
            const hasFiveSameSign = _.some(groupedBySign, (group) => group.length >= 5);
            if (!hasFiveSameSign) {
                return null;
            }
            const groupWithFive = _.find(groupedBySign, (group) => group.length >= 5);
            if (!groupWithFive) {
                return null;
            }
            const areConsecutive = _.every(groupWithFive, (card, index, array) => {
                if (index === 0) {
                    return true;
                }
                return valuesMap[card.value] - valuesMap[array[index - 1].value] === 1;
            });
            if (!areConsecutive) {
                return null;
            }
            const highestCard = valuesMap[_.maxBy(groupWithFive, (card) => valuesMap[card.value])?.value!];
            return highestCard;
        };
        const isFlush = (cs: ICard[]) => {
            const groupedBySign = _.groupBy(cs, 'sign');
            const fiveSameSignGroup = _.find(groupedBySign, (group) => group.length >= 5);
            if (!fiveSameSignGroup) {
                return null;
            }
            return valuesMap[_.maxBy(fiveSameSignGroup, (card) => valuesMap[card.value])!.value]!;
        };
        const isRoyalFlush = (cs: ICard[]) => {
            const straight = isStraight(cs);
            const flush = isFlush(cs);
            const ace = cs.find((c) => c.value === 'A');
            return straight && ace && flush;
        };
        const isStraightFlush = (cs: ICard[]) => {
            const straight = isStraight(cs);
            const flush = isFlush(cs);
            return straight && flush;
        };
        const isFourOfAKind = (cs: ICard[]) => {
            const groupedByValue = _.groupBy(cs, 'value');
            const fourSameValue = _.filter(groupedByValue, (group) => group.length === 4);
            return 4 * valuesMap[fourSameValue[0][0].value];
        };
        const isFullHouse = (cs: ICard[]) => {
            const groupedByValue = _.groupBy(cs, 'value');
            const threeSameValue = _.filter(groupedByValue, (group) => group.length === 3);
            const twoSameValue = _.filter(groupedByValue, (group) => group.length === 2);
            return 3 * valuesMap[threeSameValue[0][0].value] + 2 * valuesMap[twoSameValue[0][0].value];
        };
        const isThreeOfAKind = (cs: ICard[]) => {
            const groupedByValue = _.groupBy(cs, 'value');
            const hasThreeSameValue = _.some(groupedByValue, (group) => group.length === 3);
            return hasThreeSameValue;
        };
        const isTwoPair = (cs: ICard[]) => {
            const groupedByValue = _.groupBy(cs, 'value');
            const hasTwoSameValue = _.filter(groupedByValue, (group) => group.length === 2).length >= 2;
            return hasTwoSameValue;
        };
        const isOnePair = (cs: ICard[]) => {
            const groupedByValue = _.groupBy(cs, 'value');
            const hasTwoSameValue = _.some(groupedByValue, (group) => group.length === 2);
            return hasTwoSameValue;
        };

        if (isRoyalFlush(cards)) {
            return 245 + isStraight(cards)!;
        }
        if (isStraightFlush(cards)) {
            return 308 + isStraight(cards)!;
        }
        if (isFourOfAKind(cards)) {
            return 256 + isFourOfAKind(cards);
        }
        if (isFullHouse(cards)) {
            return 193 + isFullHouse(cards);
        }
        if (isFlush(cards)) {
            return 180 + isFlush(cards)!;
        }
        if (isStraight(cards)) {
            return 167 + isStraight(cards)!;
        }
        if (isThreeOfAKind(cards)) {
            const three = _.find(_.groupBy(cards, 'value'), (group) => group.length === 3)![0];
            return 128 + valuesMap[three.value] * 3;
        }
        if (isTwoPair(cards)) {
            const pairs = _.filter(_.groupBy(cards, 'value'), (group) => group.length === 2);
            return 76 + valuesMap[pairs[0][0].value] * 2 + valuesMap[pairs[1][0].value] * 2;
        }
        if (isOnePair(cards)) {
            const pair = _.find(_.groupBy(cards, 'value'), (group) => group.length === 2)![0];
            return 76 + valuesMap[pair[0].value] * 2;
        }
        return _.sumBy(cards, (card) => valuesMap[card.value]);
    }

    private findNextPlayerWhoCanPlay(result: NewStateResult) {
        const playerTurn = result.newState.playerTurn;
        const players = Object.values(result.newState.players);
        const condtion = (player: IPlayer) => !player.folded && !player.leftGame && player.inGameBalance > 0;
        let nextPlayer: IPlayer;
        for (let i = 0; i < players.length; i++) {
            const player = players[(playerTurn + i) % players.length];
            if (condtion(player)) {
                nextPlayer = player;
            }
        }
        return nextPlayer!;
    }

    private removeSensitiveData(gameState: IGame): SafeGameState {
        const { players } = gameState;
        return {
            ...gameState, players: Object.entries(players).reduce((acc, [key, player]) => {
                acc[key] = { ...player, cards: undefined };
                return acc;
            }, {} as Map<string, Omit<IPlayer, 'cards'>>)
        };
    }

    private callIfPossible(newState: IGame, event: HybridEvent) {
        const moneyNeeded = newState.pot - newState.players[event.userId].bet;
        const hasEnoughBalance = newState.players[event.userId].inGameBalance >= moneyNeeded;
        if (hasEnoughBalance) {
            newState.players[event.userId].inGameBalance -= moneyNeeded;
            newState.players[event.userId].bet += moneyNeeded;
            newState.players[event.userId].called = true;
            newState.players[event.userId].tapped = newState.players[event.userId].inGameBalance === 0;
            return { event, newState: newState };
        }
        return { event: { name: PrivateEventNameEnum.INSUFFICIENT_BALANCE, userId: event.userId }, newState };
    }

    private playerFolded(newState: IGame, event: HybridEvent) {
        const hasPlayerAlreadyFolded = newState.players[event.userId].leftGame;
        if (!hasPlayerAlreadyFolded) {
            newState.players[event.userId].folded = false;
            return { event, newState };
        }
        return { event: null, newState };
    }

    private checkIfPossible(newState: IGame, event: HybridEvent) {
        const hasPlayerAlreadyChecked = newState.players[event.userId].checked;
        const canPlayerCheck = newState.pot === newState.players[event.userId].bet;
        if (!hasPlayerAlreadyChecked && canPlayerCheck) {
            newState.players[event.userId].checked = true;
            return { event, newState };
        }
        return { event: null, newState };
    }

    private raiseIfPossible(newState: IGame, event: HybridEvent) {
        if (!event.amount) {
            return { event: null, newState };
        }
        const moneyNeeded = event.amount;
        const hasEnoughBalance = newState.players[event.userId].inGameBalance >= moneyNeeded;
        const hasntRaisedTooManyTimes = newState.players[event.userId].raisedTimes < newState.options.maxRaises;
        if (hasEnoughBalance && hasntRaisedTooManyTimes) {
            newState.players[event.userId].inGameBalance -= moneyNeeded;
            newState.players[event.userId].bet += moneyNeeded;
            newState.players[event.userId].raisedTimes++;
            newState.players[event.userId].tapped = newState.players[event.userId].inGameBalance === 0;
            return { event, newState };
        }
        return { event: { name: PrivateEventNameEnum.INSUFFICIENT_BALANCE, userId: event.userId }, newState };
    }

    private startGame(newState: IGame, event: HybridEvent) {
        if (newState.gameStarted) {
            return { event: null, newState };
        }
        newState.gameStarted = true;
        return { event, newState };
    }

    private async setBalanceOfUser(newState: IGame, event: HybridEvent) {
        if (event.amount) {
            const playerFromDb = await dbService.getUsersByQuery({ _id: event.userId });
            const hasEnoughFunds = playerFromDb[0].balance >= event.amount;
            if (hasEnoughFunds) {
                await dbService.updateUserById(event.userId, { balance: playerFromDb[0].balance - event.amount });
                newState.players[event.userId].inGameBalance = event.amount;
                return { event, newState };
            }
        }
        return { event: null, newState };
    }
}
// and set all players money to +=ingamebalance
// TODO: if user leaves game for good +=ingamebalance
// TODO: check every loop if its ok IPlayer

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
