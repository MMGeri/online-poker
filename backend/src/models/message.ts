import e from 'express';
import mongoose from 'mongoose';

const { Schema } = mongoose;

export interface Message extends Document {
    _id: string;
    isGlobal: boolean;
    gameId: string;
    senderId: string;
    username: string;
    message: string;
    timestamp: Date;
}

const messageSchema = new Schema({
    isGlobal: {
        type: Boolean,
        index: true
    },
    gameId: {
        type: Schema.Types.ObjectId,
        ref: 'Game',
        index: true
    },
    senderId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    username: String,
    message: String,
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt

const MessageModel = mongoose.model<Message>('Message', messageSchema);
export default MessageModel;
