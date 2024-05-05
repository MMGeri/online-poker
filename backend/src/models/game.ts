import mongoose from 'mongoose';

const { Schema } = mongoose;

export interface Card {
    value: string;
    sign: string;
}

export interface Player {
    userId: string;
    cards: Card[];
    inGameBalance: number;
    bet: number;
    called: boolean;
    raisedTimes: number;
    positionAtTable: number;
    stillPlayingInRound: boolean;
    leftGame: boolean;
}

export interface Game extends Document {
    _id: string;
    ownerId: string;
    players: Player[];
    whiteList: string[];
    banList: string[];
    cardsOnTable: Card[];
    cardsInDeck: Card[];
    round: number;
    paused: boolean;
    phase: string;
}

const gameSchema = new Schema({
    ownerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
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
    whiteList: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    banList: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
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
    }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt

const GameModel = mongoose.model<Game>('Game', gameSchema);
export default GameModel;
