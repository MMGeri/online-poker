import { Phase } from '../models/game';

enum InputEventNameEnum {
    USER_JOINED = 'USER_JOINED',
    USER_LEFT = 'USER_LEFT',
    USER_CALLED = 'USER_CALLED',
    USER_FOLDED = 'USER_FOLDED',
    USER_CHECKED = 'USER_CHECKED',
    USER_RAISED = 'USER_RAISED',
    START_GAME = 'START_GAME'
}

enum OutputEventNameEnum {
    GAME_ENDED = 'GAME_ENDED', // no additional data - o
    NEW_ROUND = 'NEW_ROUND', // no data - o

    // 'Blinds', 'Pre-flop', 'Flop', 'Turn', 'River'
    PHASE_CHANGE = 'PHASE_CHANGE', // data: { phase: string } - o

    CARDS_DEALT = 'CARDS_DEALT', // data: { cards: Card[] } - o (send to private rooms)

    ROUND_ENDING = 'ROUND_ENDING', // no data, players can still raise - o
    ROUND_ENDED = 'ROUND_ENDED' // no data - all players have called or folded and revealed their cards, winners are known - o
}

interface Event {
    name: InputEventNameEnum | OutputEventNameEnum;
    userId?: string;
}

interface PhaseChangeEvent extends Event {
    name: OutputEventNameEnum.PHASE_CHANGE;
    phase: Phase;
}

interface InputEvent {
    name: InputEventNameEnum;
    userId: string;
}

interface UserInputEvent extends InputEvent {
    name:
    InputEventNameEnum.USER_JOINED |
    InputEventNameEnum.USER_LEFT |
    InputEventNameEnum.USER_CALLED |
    InputEventNameEnum.USER_FOLDED |
    InputEventNameEnum.USER_CHECKED;
    userId: string;
}

interface UserRaisedEvent extends UserInputEvent {
    amount: number;
}

export type GameEvent = Event | UserRaisedEvent | UserInputEvent | PhaseChangeEvent;
export {
    InputEvent,
    InputEventNameEnum,
    OutputEventNameEnum,
    UserInputEvent,
    UserRaisedEvent,
    PhaseChangeEvent
};
