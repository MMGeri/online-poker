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

interface IGame extends Document {
    _id: string;
    ownerId: string;
    chatChannelId: string;
    players: IPlayer[];
    cardsOnTable: ICard[];
    cardsInDeck: ICard[];
    round: number;
    paused: boolean;
    phase: string;
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
    players: [{
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
    }],
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
