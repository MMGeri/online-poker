import mongoose from 'mongoose';

const { Schema } = mongoose;

interface IMessage extends Document {
    _id: string;
    channelId: string;
    senderId: string;
    message: string;
}

const messageSchema = new Schema({
    channelId: {
        type: Schema.Types.ObjectId,
        ref: 'Game',
        index: true
    },
    senderId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    message: String
}, { timestamps: true }); // Automatically adds createdAt and updatedAt

const MessageModel = mongoose.model<IMessage>('Message', messageSchema);
export { MessageModel, IMessage };
