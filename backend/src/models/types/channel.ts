interface IChannel {
    _id: string;
    name: string;
    ownerId?: string;
    whiteList: string[];
    standalone: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export { IChannel };
