import mongoose, { Schema, Model } from 'mongoose';
import { IMessage } from '../types';

const messageSchema = new Schema<IMessage>({
    senderName: {
        type: String,
        ref: 'User',
        required: false
    },
    channelId: {
        type: String,
        ref: 'Game',
        index: true,
        required: true
    },
    senderId: {
        type: String,
        ref: 'User',
        required: true
    },
    message: String
}, { timestamps: true }); // Automatically adds createdAt and updatedAt

const MessageModel: Model<IMessage> = mongoose.model<IMessage>('Message', messageSchema);
export { MessageModel };
