import * as _ from 'lodash';
import { IGame, IPlayer } from '../models/game';
import { io } from '../app';
import { dbService } from '../shared/services/db.service';
import { GameEvent, HybridEvent, HybridEventNameEnum, OutputEventNameEnum, PrivateEventNameEnum } from './game-events.model';

interface GameEvenManagers {
    [key: string]: GameEventManager; // key is gameId
}

interface SafeGameState extends Omit<IGame, 'cardsInDeck' | 'players'> {
    players: Map<string, Omit<IPlayer, 'cards'>>;
}

interface NewStateResult {
    events: GameEvent[];
    newState: SafeGameState;
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
        this.gameState.gameOver = true;
        await dbService.updateGameById(this.gameState._id, { gameOver: true });
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
        return { events: result.events, gameState: this.removeSensitiveData(this.gameState) };
    }

    private async calculateNewGameState(event: HybridEvent): Promise<NewStateResult> {
        let result: NewStateResult = { events: [], newState: this.gameState };
        let eventResult: { event: GameEvent | null; newState: SafeGameState };
        // if user action then check if it is his turn, if not return with no event
        const currentPlayerTurn: string = Object.values(result.newState.players).find((player) => player.positionAtTable === result.newState.playerTurn).userId;
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

    private async processEvent(newState: SafeGameState, event: HybridEvent) {
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
            const randomSequence = _.shuffle(_.range(0, Object.values(result.newState.players).length));
            let i = 0;
            for (const player of _.values(result.newState.players)) {
                player.positionAtTable = randomSequence[i++];
            }
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

    private findNextPlayerWhoCanPlay(result: NewStateResult) {
        const players = _.values(result.newState.players);
        const playerTurn = result.newState.playerTurn;
        const condtion = (player: IPlayer) => !player.folded && !player.leftGame && player.inGameBalance > 0;
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

    private removeSensitiveData(gameState: IGame): SafeGameState {
        return _.omit(gameState, ['cardsInDeck', 'players.cards']);
    }

    private callIfPossible(newState: SafeGameState, event: HybridEvent) {
        const moneyNeeded = newState.currentBet - newState.players[event.userId].bet;
        const hasEnoughBalance = newState.players[event.userId].inGameBalance >= moneyNeeded;
        if (hasEnoughBalance) {
            newState.players[event.userId].inGameBalance -= moneyNeeded;
            newState.players[event.userId].bet += moneyNeeded;
            newState.players[event.userId].called = true;
            return { event, newState: newState };
        }
        return { event: { name: PrivateEventNameEnum.INSUFFICIENT_BALANCE, userId: event.userId }, newState };
    }

    private playerFolded(newState: SafeGameState, event: HybridEvent) {
        const hasPlayerAlreadyFolded = newState.players[event.userId].leftGame;
        if (!hasPlayerAlreadyFolded) {
            newState.players[event.userId].folded = false;
            return { event, newState };
        }
        return { event: null, newState };
    }

    private checkIfPossible(newState: SafeGameState, event: HybridEvent) {
        const hasPlayerAlreadyChecked = newState.players[event.userId].checked;
        const canPlayerCheck = newState.currentBet === newState.players[event.userId].bet;
        if (!hasPlayerAlreadyChecked && canPlayerCheck) {
            newState.players[event.userId].checked = true;
            return { event, newState };
        }
        return { event: null, newState };
    }

    private raiseIfPossible(newState: SafeGameState, event: HybridEvent) {
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
            return { event, newState };
        }
        return { event: { name: PrivateEventNameEnum.INSUFFICIENT_BALANCE, userId: event.userId }, newState };
    }

    private startGame(newState: SafeGameState, event: HybridEvent) {
        if (newState.gameStarted) {
            return { event: null, newState };
        }
        newState.gameStarted = true;
        return { event, newState };
    }

    private async setBalanceOfUser(newState: SafeGameState, event: HybridEvent) {
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
