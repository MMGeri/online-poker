export interface IUser {
    username: string;
    hashedPassword?: string;
    roles?: string[];
    balance: number;
    createdAt: Date;
    updatedAt: Date;
    _id: string;
}
