export const phases = ['Getting-Ready', 'Pre-flop', 'Flop', 'Turn', 'River'] as const;

interface ICard {
    value: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
    sign: 'hearts' | 'diamonds' | 'clubs' | 'spades';
}

interface IPlayer {
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
    connected: boolean;
    ready: boolean;
}

interface IGame {
    _id: string;
    ownerId: string;
    name: string;
    chatChannelId: string;
    pot: number;
    players: IPlayer[];
    playerTurn: number;
    cardsOnTable: ICard[];
    cardsInDeck: ICard[];
    round: number;
    phase: typeof phases[number];
    gameStarted: boolean;
    gameOver: boolean;
    options: {
        whiteList: string[];
        maxPlayers: number;
        maxRaises: number;
        isPublic: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
}

export { IGame, IPlayer, ICard };
