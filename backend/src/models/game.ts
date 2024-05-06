import mongoose from 'mongoose';

const { Schema } = mongoose;

interface ICard {
    value: string;
    sign: string;
}

interface IPlayer {
    userId: string;
    cards: ICard[];
    inGameBalance: number;
    bet: number;
    called: boolean;
    checked: boolean;
    raisedTimes: number;
    positionAtTable: number;
    folded: boolean;
    leftGame: boolean;
}

export type Phase = 'Blinds' | 'Pre-flop' | 'Flop' | 'Turn' | 'River';

interface IGame extends Document {
    _id: string;
    ownerId: string;
    chatChannelId: string;
    currentBet: number;
    players: Map<string, IPlayer>;
    playerTurn: number; // TODO: default should be player at 0 position
    cardsOnTable: ICard[];
    cardsInDeck: ICard[];
    round: number;
    paused: boolean;
    phase: Phase;
    gameStarted: boolean;
    gameOver: boolean;
    options: {
        key?: string;
        whiteList: string[];
        banList: string[];
        maxRaises: number;
    };
}

const gameSchema = new Schema({
    ownerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    chatChannelId: {
        type: Schema.Types.ObjectId,
        ref: 'Channel',
        required: true
    },
    currentBet: Number,
    players: {
        type: Map,
        of: {
            userId: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            },
            cards: [{
                value: String,
                sign: String
            }],
            inGameBalance: Number,
            bet: Number,
            checked: Boolean,
            called: Boolean,
            raisedTimes: Number, // max 4 raises per round
            positionAtTable: Number,
            folded: Boolean,
            leftGame: Boolean
        }
    },
    playerTurn: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    cardsOnTable: [{
        value: String,
        sign: String
    }],
    cardsInDeck: [{
        value: String,
        sign: String
    }],
    round: Number,
    paused: Boolean,
    phase: {
        type: String,
        enum: ['Blinds', 'Pre-flop', 'Flop', 'Turn', 'River'],
        default: 'Blinds'
    },
    gameStarted: Boolean,
    gameOver: Boolean,
    options: {
        key: String,
        whiteList: [{
            type: Schema.Types.ObjectId,
            ref: 'User'
        }],
        banList: [{
            type: Schema.Types.ObjectId,
            ref: 'User'
        }],
        maxRaises: Number
    }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt

const GameModel = mongoose.model<IGame>('Game', gameSchema);
export { GameModel, IGame, IPlayer, ICard };
