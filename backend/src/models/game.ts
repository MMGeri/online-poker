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
    raisedTimes: number;
    positionAtTable: number;
    stillPlayingInRound: boolean;
    leftGame: boolean;
}

export type Phase = 'Blinds' | 'Pre-flop' | 'Flop' | 'Turn' | 'River';

interface IGame extends Document {
    _id: string;
    ownerId: string;
    chatChannelId: string;
    currentBet: number;
    players: {
        [key: string]: IPlayer; // key is player.userId
    };
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
            called: Boolean,
            raisedTimes: Number,
            positionAtTable: Number,
            stillPlayingInRound: Boolean,
            leftGame: Boolean
        }
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
        }]
    }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt

const GameModel = mongoose.model<IGame>('Game', gameSchema);
export { GameModel, IGame, IPlayer, ICard };
