import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import { phases } from '../game-server/game-event.manager';

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
    leftGame: boolean;
    ready: boolean;
}

interface IGame extends Document {
    ownerId: string;
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
        key?: string;
        whiteList: string[];
        banList: string[];
        maxPlayers: number;
        maxRaises: number;
    };
}

const gameSchema = new Schema<IGame>({
    ownerId: {
        type: String,
        ref: 'User',
        required: true
    },
    chatChannelId: {
        type: String,
        ref: 'Channel',
        required: true
    },
    pot: {
        type: Number,
        default: 0
    },
    players: {
        type: Map,
        of: {
            type: {
                userId: {
                    type: String,
                    ref: 'User',
                    required: true
                },
                cards: {
                    type: [{
                        value: String,
                        sign: String
                    }],
                    default: []
                },
                inGameBalance: {
                    type: Number,
                    default: 0
                },
                bet: {
                    type: Number,
                    default: 0
                },
                checked: {
                    type: Boolean,
                    default: false
                },
                called: {
                    type: Boolean,
                    default: false
                },
                raisedTimes: {
                    type: Number,
                    default: 0
                },
                tapped: {
                    type: Boolean,
                    default: false
                },
                tappedAtPot: {
                    type: Number,
                    default: 0
                },
                positionAtTable: {
                    type: Number,
                    default: 0
                },
                folded: {
                    type: Boolean,
                    default: false
                },
                leftGame: {
                    type: Boolean,
                    default: false
                }
            }
        }
    },
    playerTurn: {
        type: Number,
        default: 0
    },
    cardsOnTable: {
        type: [{
            value: String,
            sign: String
        }],
        default: []
    },
    cardsInDeck: {
        type: [{
            value: String,
            sign: String
        }],
        default: []
    },
    round: {
        type: Number,
        default: 0
    },
    phase: {
        type: String,
        enum: phases,
        default: 'Getting-Ready'
    },
    gameStarted: {
        type: Boolean,
        default: false
    },
    gameOver: {
        type: Boolean,
        default: false
    },
    options: {
        key: String,
        whiteList: {
            type: [{
                type: String,
                ref: 'User'
            }],
            default: []
        },
        banList: {
            type: [{
                type: String,
                ref: 'User'
            }],
            default: []
        },
        maxRaises: {
            type: Number,
            default: 4
        }
    }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt

const GameModel: Model<IGame> = mongoose.model<IGame>('Game', gameSchema);
export { GameModel, IGame, IPlayer, ICard };
