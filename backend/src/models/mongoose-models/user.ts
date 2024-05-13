import _ from 'lodash';
import mongoose, { Model } from 'mongoose';
import { IUser } from '../types';

const { Schema } = mongoose;

const userSchema = new Schema<IUser>({
    username: {
        type: String,
        required: true,
        unique: true
    },
    hashedPassword: {
        type: String,
        required: true
    },
    roles: {
        type: [String],
        enum: ['user', 'admin'],
        default: ['user']
    },
    balance: {
        type: Number,
        default: 0
    },
    friends: {
        type: [String],
        ref: 'User'
    }
}, { timestamps: true });

const UserModel: Model<IUser> = mongoose.model<IUser>('User', userSchema);
export { UserModel };
