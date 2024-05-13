import { IGame, IPlayer } from '../models/types/game';

enum HybridEventNameEnum { // rather hybrid, in and out
    USER_CONNECTED = 'USER_CONNECTED', // only for visuals n shit
    USER_DISCONNECTED = 'USER_DISCONNECTED', // only for visuals n shit

    USER_READY = 'USER_READY',

    USER_SET_BALANCE = 'USER_SET_BALANCE',
    USER_CALLED = 'USER_CALLED',
    USER_FOLDED = 'USER_FOLDED',
    USER_CHECKED = 'USER_CHECKED',
    USER_RAISED = 'USER_RAISED',
    START_GAME = 'START_GAME'
}

enum PrivateEventNameEnum {
    CARDS_DEALT = 'CARDS_DEALT', // data: { cards: Card[] } - o (send to private rooms)
    INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE'
}

enum OutputEventNameEnum {
    FORCE_UPDATE = 'FORCE_UPDATE',
    GAME_ENDED = 'GAME_ENDED', // no additional data - o
    NEXT_PLAYER = 'NEXT_PLAYER',
    NEW_PHASE = 'NEW_PHASE',
    ROUND_ENDED = 'ROUND_ENDED' // no data - all players have called or folded and revealed their cards, winners are known - o
}

interface Event {
    name: HybridEventNameEnum | OutputEventNameEnum | PrivateEventNameEnum;
    userId?: string;
}
interface HybridEvent {
    name: HybridEventNameEnum;
    userId: string;
    amount?: number;
    options?: IGame['options'];
}

export type SafePlayer = Omit<IPlayer, 'cards'>;

export interface SafeGameState extends Omit<IGame, 'cardsInDeck' | 'players'> {
    players: Map<string, SafePlayer>;
}

export interface NewStateResult {
    events: GameEvent[];
    newState: IGame;
}

export type GameEvent = Event | HybridEvent;
export {
    HybridEvent,
    PrivateEventNameEnum,
    HybridEventNameEnum,
    OutputEventNameEnum
};
