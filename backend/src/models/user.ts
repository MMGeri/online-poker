import mongoose, { Document, Model, Types } from 'mongoose';

const { Schema } = mongoose;
interface IUser extends Document {
    username: string;
    hashedPassword: string;
    roles: string[];
    balance: number;
    createdAt: Date;
    updatedAt: Date;
    friends: string[];
}

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
export { UserModel, IUser };
