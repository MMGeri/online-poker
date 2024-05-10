import mongoose, { Document, Schema, Model, Types } from 'mongoose';

interface IMessage extends Document {
    channelId: string;
    senderId: string;
    message: string;
}

const messageSchema = new Schema<IMessage>({
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
export { MessageModel, IMessage };
