import mongoose, { Document, Model } from 'mongoose';

const { Schema } = mongoose;
export interface User extends Document {
    _id: string;
    username: string;
    hashedPassword: string;
    roles: string[];
    balance: number;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<User>({
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
    }
}, { timestamps: true });

const UserModel: Model<User> = mongoose.model<User>('User', userSchema);
export default UserModel;
