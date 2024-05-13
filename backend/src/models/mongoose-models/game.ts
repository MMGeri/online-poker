import mongoose, { Schema, Model } from 'mongoose';
import { phases, IGame } from '../types/game';

const gameSchema = new Schema<IGame>({
    ownerId: {
        type: String,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        default: 'New Game'
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
                connected: {
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
        whiteList: {
            type: [{
                type: String,
                ref: 'User'
            }],
            default: []
        },
        maxPlayers: {
            type: Number,
            default: 6
        },
        maxRaises: {
            type: Number,
            default: 4
        },
        isPublic: {
            type: Boolean,
            default: true
        }
    }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt

const GameModel: Model<IGame> = mongoose.model<IGame>('Game', gameSchema);
export { GameModel };
