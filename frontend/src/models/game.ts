import { IUser } from "./user";

export interface ICard {
    value: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
    sign: 'hearts' | 'diamonds' | 'clubs' | 'spades';
}

export const phases = ['Getting-Ready', 'Pre-flop', 'Flop', 'Turn', 'River'] as const;


export interface IPlayer {
    userId: string;
    cards: ICard[];
    inGameBalance: number;
    bet: number;
    called: boolean;
    checked: boolean;
    raisedTimes: number;
    tapped: boolean;
    tappedAtPot: number;
    positionAtTable: number;
    folded: boolean;
    leftGame: boolean;
    ready: boolean;
}

export interface IGame extends Document {
    ownerId: string;
    name: string;
    chatChannelId: string;
    pot: number;
    players: Map<string, IPlayer>;
    playerTurn: number;
    cardsOnTable: ICard[];
    cardsInDeck: ICard[];
    round: number;
    phase: typeof phases[number];
    gameStarted: boolean;
    gameOver: boolean;
    options: {
        whiteList: IUser[] | string[];
        maxPlayers: number;
        maxRaises: number;
        isPublic: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
    _id: string;
}
