import * as _ from 'lodash';
import { IGame, IPlayer } from '../models/game';
import { io } from '../app';
import { dbService } from '../shared/services/db.service';
import { GameEvent, HybridEvent, HybridEventNameEnum, OutputEventNameEnum, PrivateEventNameEnum } from './game-events.model';

// create a game event manager class with a game state (get from db)
// calculate new gameState and save it to db
// should have a list of all private rooms and the public room
// send card dealt events to private rooms
// send game events to public room
// if event is incoming only send response if input type event, else return null for it


interface GameEvenManagers {
    [key: string]: GameEventManager; // key is gameId
}

interface SafeGameState extends Omit<IGame, 'cardsInDeck' | 'players'> {
    players: Map<string, Omit<IPlayer, 'cards'>>;
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

    private async calculateNewGameState(event: HybridEvent): Promise<{ events: GameEvent[]; newState: SafeGameState }> {
        let result: { events: GameEvent[]; newState: SafeGameState } = { events: [], newState: this.gameState };
        let eventResult: { event: GameEvent | null; gameState: SafeGameState };
    // TODO: if user action then check if it is his turn, if not return with no event
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
                result.newState = eventResult.gameState;
                break;
            default:
                return result;
        }
        result = this.calculateAdditionalEvents(result);
        return result;
    }

    private async processEvent(newState, event) {
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
                return { event: null, gameState: newState };
        }
    }

    private calculateAdditionalEvents(result: { events: GameEvent[]; newState: SafeGameState }) {
        result = this.checkIfRoundEnded(result);
        if (result.events.find((event) => event.name === OutputEventNameEnum.ROUND_ENDED)) {
            return result;
        }
        if (_.some(result.events, (event: GameEvent) => event.name in userActions)) {
            const nextUser = this.findNextPlayerWhoCanPlay();
            result.newState.playerTurn = nextUser.positionAtTable;
            result.events.push({ name: OutputEventNameEnum.NEXT_PLAYER, userId: nextUser.userId });
        }
        return result;
    }

    private checkIfRoundEnded(result: { events: GameEvent[]; newState: SafeGameState }) {
        const everyoneCalledOrFoldedOrAllInned = _.every(this.gameState.players, (player) => player.called || player.folded || player.inGameBalance === 0);
        const everyoneReachedMaxRaises = _.every(this.gameState.players, (player) => player.raisedTimes >= this.gameState.options.maxRaises);
        if (everyoneCalledOrFoldedOrAllInned || everyoneReachedMaxRaises) {
            result.newState.round++;
            // TODO: calculate winners and give them money
            result.newState.players.forEach((player) => { // TODO: move to fnction
                player.called = false;
                player.checked = false;
                player.raisedTimes = 0;
                player.bet = 0;
            });
            // TODO: shuffle users
            // TODO: set playerTurn to 0
            result.events.push({ name: OutputEventNameEnum.ROUND_ENDED });
        }
        return result;
    }

    private findNextPlayerWhoCanPlay() {
        const players = _.values(this.gameState.players);
        const playerTurn = this.gameState.playerTurn;
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
        const moneyNeeded = this.gameState.currentBet - this.gameState.players[event.userId].bet;
        const hasEnoughBalance = this.gameState.players[event.userId].inGameBalance >= moneyNeeded;
        if (hasEnoughBalance) {
            newState.players[event.userId].inGameBalance -= moneyNeeded;
            newState.players[event.userId].bet += moneyNeeded;
            newState.players[event.userId].called = true;
            return { event, gameState: newState };
        }
        return { event: { name: PrivateEventNameEnum.INSUFFICIENT_BALANCE, userId: event.userId }, gameState: newState };
    }

    private playerFolded(newState: SafeGameState, event: HybridEvent) {
        const hasPlayerAlreadyFolded = newState.players[event.userId].leftGame;
        if (!hasPlayerAlreadyFolded) {
            newState.players[event.userId].folded = false;
            return { event, gameState: newState };
        }
        return { event: null, gameState: newState };
    }

    private checkIfPossible(newState: SafeGameState, event: HybridEvent) {
        const hasPlayerAlreadyChecked = newState.players[event.userId].checked;
        const canPlayerCheck = this.gameState.currentBet === this.gameState.players[event.userId].bet;
        if (!hasPlayerAlreadyChecked && canPlayerCheck) {
            newState.players[event.userId].checked = true;
            return { event, gameState: newState };
        }
        return { event: null, gameState: newState };
    }

    private raiseIfPossible(newState: SafeGameState, event: HybridEvent) {
        if (!event.amount) {
            return { event: null, gameState: newState };
        }
        const moneyNeeded = event.amount;
        const hasEnoughBalance = this.gameState.players[event.userId].inGameBalance >= moneyNeeded;
        const hasntRaisedTooManyTimes = this.gameState.players[event.userId].raisedTimes < this.gameState.options.maxRaises;
        if (hasEnoughBalance && hasntRaisedTooManyTimes) {
            newState.players[event.userId].inGameBalance -= moneyNeeded;
            newState.players[event.userId].bet += moneyNeeded;
            newState.players[event.userId].raisedTimes++;
            return { event, gameState: newState };
        }
        return { event: { name: PrivateEventNameEnum.INSUFFICIENT_BALANCE, userId: event.userId }, gameState: newState };
    }

    private startGame(newState: SafeGameState, event: HybridEvent) {
        if (this.gameState.gameStarted) {
            return { event: null, gameState: newState };
        }
        newState.gameStarted = true;
        return { event, gameState: newState };
    }

    private async setBalanceOfUser(newState: SafeGameState, event: HybridEvent) {
        if (event.amount) {
            const playerFromDb = await dbService.getUsersByQuery({ _id: event.userId });
            const hasEnoughFunds = playerFromDb[0].balance >= event.amount;
            if (hasEnoughFunds) {
                await dbService.updateUserById(event.userId, { balance: playerFromDb[0].balance - event.amount });
                newState.players[event.userId].inGameBalance = event.amount;
                return { event, gameState: newState };
            }
        }
        return { event: null, gameState: newState };
    }
}
// TODO: if game is deleted or game is over, delete gameEventManager
// and send GAME_ENDED event to all players in game
// and set game to gameOver in db
// and set all players money to +=ingamebalance
// TODO: if user leaves game for good +=ingamebalance

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
