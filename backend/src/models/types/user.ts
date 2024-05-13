interface IUser {
    _id: string;
    username: string;
    hashedPassword: string;
    roles: string[];
    balance: number;
    createdAt: Date;
    updatedAt: Date;
    friends: string[];
}

export { IUser };
