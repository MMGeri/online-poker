enum HybridEventNameEnum { // rather hybrid, in and out
    USER_JOINED = 'USER_JOINED', // only for visuals n shit
    USER_LEFT = 'USER_LEFT', // only for visuals n shit

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
    GAME_ENDED = 'GAME_ENDED', // no additional data - o
    NEXT_PLAYER = 'NEXT_PLAYER',
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
}

export type GameEvent = Event | HybridEvent;
export {
    HybridEvent,
    PrivateEventNameEnum,
    HybridEventNameEnum,
    OutputEventNameEnum
};
