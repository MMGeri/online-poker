import * as _ from 'lodash';
import { IGame, IPlayer } from '../models/game';
import { io } from '../app';
import { dbService } from '../shared/services/db.service';
import { GameEvent, HybridEvent, HybridEventNameEnum, OutputEventNameEnum } from './game-events.model';

// create a game event manager class with a game state (get from db)
// calculate new gameState and save it to db
// should have a list of all private rooms and the public room
// send card dealt events to private rooms
// send game events to public room
// if event is incoming only send response if input type event, else return null for it


interface GameEvenManagers {
    [key: string]: GameEventManager; // key is gameId
}

interface SafeGameState extends Omit<Partial<IGame>, 'cardsInDeck' | 'players'> {
    players: {
        [key: string]: Omit<IPlayer, 'cards'>;
    };
}

class GameEventManager {
    private gameState: IGame;
    private gameChannelIdentifier: string;

    constructor(gameState: IGame) {
        this.gameState = gameState;
        this.gameChannelIdentifier = `game:${gameState._id}`;
    }

    public togglePause(): void {
        this.gameState.paused = !this.gameState.paused;
        const event: GameEvent = {
            name: OutputEventNameEnum.GAME_PAUSED
        };
        io.to(this.gameChannelIdentifier).emit('game-event', { event, gameState: this.removeSensitiveData(this.gameState) });
    }

    public deleteGame(): void {
        // TODO: delete game and send event GAME_ENDED
    }

    public async getNewGameState(event: HybridEvent): Promise<{ event: GameEvent | null; gameState: SafeGameState }> {
        const result = await this.calculateNewGameState(event);
        this.gameState = _.merge(this.gameState, result.gameState);
        return result;
    }

    private async calculateNewGameState(event: HybridEvent): Promise<{ event: GameEvent | null; gameState: SafeGameState }> {
        const newState: SafeGameState = this.gameState;
        switch (event.name) {
            case HybridEventNameEnum.USER_JOINED:
                break; // do nothing
            case HybridEventNameEnum.USER_LEFT:
                break; // do nothing
            case HybridEventNameEnum.USER_CALLED:
                return this.callIfPossible(newState, event); // TODO: check if player is on turn
            case HybridEventNameEnum.USER_FOLDED:
                return this.playerFolded(newState, event); // TODO: check if player is on turn
            case HybridEventNameEnum.USER_CHECKED: // pass
                break;
            case HybridEventNameEnum.USER_RAISED:
                return this.raiseIfPossible(newState, event); // TODO: check if player is on turn
            case HybridEventNameEnum.START_GAME: // owner pressed start game
                return this.startGame(newState, event);
            case HybridEventNameEnum.USER_SET_BALANCE:
                return await this.setBalanceOfUser(newState, event);
            default:
                return { event: event, gameState: newState };
        }
        return { event: null, gameState: newState };
    }

    private removeSensitiveData(gameState: IGame): Partial<IGame> {
        return _.omit(gameState, ['cardsInDeck', 'players.cards']);
    }

    private playerFolded(newState: SafeGameState, event: HybridEvent) {
        const hasPlayerAlreadyFolded = newState.players[event.userId].leftGame;
        if (!hasPlayerAlreadyFolded) {
            newState.players[event.userId].stillPlayingInRound = false;
            return { event, gameState: newState };
        }
        return { event: null, gameState: newState };
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
        return { event: null, gameState: newState };
    }

    private raiseIfPossible(newState: SafeGameState, event: HybridEvent) {
        if (!event.amount) {
            return { event: null, gameState: newState };
        }
        const moneyNeeded = event.amount;
        const hasEnoughBalance = this.gameState.players[event.userId].inGameBalance >= moneyNeeded;
        if (hasEnoughBalance) {
            newState.players[event.userId].inGameBalance -= moneyNeeded;
            newState.players[event.userId].bet += moneyNeeded;
            newState.players[event.userId].raisedTimes++;
            return { event, gameState: newState };
        }
        return { event: null, gameState: newState };
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
                newState.players[event.userId].inGameBalance = event.amount;
                return { event, gameState: newState };
            }
        }
        return { event: null, gameState: newState };
    }
}
// TODO: if user leaves game for good or game is deleted or game is over, delete gameEventManager
// and send GAME_ENDED event to all players in game
// and set game to gameOver in db
// and set all players money to +=ingamebalance

class GameEventManagerService {
    private gameEventManagers: GameEvenManagers = {};

    public getGameEventManager(gameId: string): GameEventManager | undefined {
        return this.gameEventManagers[gameId];
    }

    public deleteGameEventManager(gameId: string): void {
        this.gameEventManagers[gameId].deleteGame();
        delete this.gameEventManagers[gameId];
    }

    public createGameEventManager(game: IGame): GameEventManager {
        const gameEventManager = new GameEventManager(game);
        this.gameEventManagers[game._id] = gameEventManager;
        return gameEventManager;
    }
}

export const gems = new GameEventManagerService();
