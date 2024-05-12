import mongoose, { ObjectId, Types, Document } from 'mongoose';

const { Schema } = mongoose;

interface IChannel extends Document {
    ownerId?: string;
    whiteList: string[];
}

const channelSchema = new Schema<IChannel>({
    ownerId: {
        type: String,
        ref: 'User',
        get: (v: ObjectId) => v.toString()
    },
    whiteList: [{
        type: String,
        ref: 'User'
    }]
}, { timestamps: true });

const ChannelModel = mongoose.model<IChannel>('Channel', channelSchema);
export { ChannelModel, IChannel };
