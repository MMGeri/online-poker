import mongoose, { ObjectId, Types, Document } from 'mongoose';

const { Schema } = mongoose;

interface IChannel extends Document {
    name: string;
    ownerId?: string;
    whiteList: string[];
    standalone: boolean;
}

const channelSchema = new Schema<IChannel>({
    name: {
        type: String,
        default: 'New Channel'
    },
    ownerId: {
        type: String,
        ref: 'User',
        get: (v: ObjectId) => v.toString()
    },
    whiteList: [{
        type: String,
        ref: 'User'
    }],
    standalone: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const ChannelModel = mongoose.model<IChannel>('Channel', channelSchema);
export { ChannelModel, IChannel };
