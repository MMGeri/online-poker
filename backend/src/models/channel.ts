import mongoose from 'mongoose';

const { Schema } = mongoose;

interface IChannel extends Document {
    _id: string;
    ownerId?: string;
    whiteList: string[];
    banList: string[];
    key: string;
}

const channelSchema = new Schema({
    ownerId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    whiteList: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    banList: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

const ChannelModel = mongoose.model<IChannel>('Channel', channelSchema);
export { ChannelModel, IChannel };
