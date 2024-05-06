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

enum OutputEventNameEnum {
    GAME_ENDED = 'GAME_ENDED', // no additional data - o
    NEW_ROUND = 'NEW_ROUND', // no data - o

    CARDS_DEALT = 'CARDS_DEALT', // data: { cards: Card[] } - o (send to private rooms)

    GAME_PAUSED = 'GAME_PAUSED', // no data - o

    ROUND_ENDING = 'ROUND_ENDING', // no data, players can still raise - o
    ROUND_ENDED = 'ROUND_ENDED' // no data - all players have called or folded and revealed their cards, winners are known - o
}

interface Event {
    name: HybridEventNameEnum | OutputEventNameEnum;
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
    HybridEventNameEnum,
    OutputEventNameEnum
};
