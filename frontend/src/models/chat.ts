export interface IChat {
    name: string;
    ownerId?: string;
    whiteList: string[];
    createdAt: Date;
    updatedAt: Date;
    standalone: boolean;
    _id: string;
}