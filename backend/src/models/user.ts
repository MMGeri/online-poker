import mongoose, { Document, Model } from 'mongoose';

const { Schema } = mongoose;
interface IUser extends Document {
    _id: string;
    username: string;
    hashedPassword: string;
    roles: string[];
    balance: number;
    createdAt: Date;
    updatedAt: Date;
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
    }
}, { timestamps: true });

const UserModel: Model<IUser> = mongoose.model<IUser>('User', userSchema);
export { UserModel, IUser };
