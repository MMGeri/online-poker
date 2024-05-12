export interface IMessage {
    channelId: string;
    senderId: string;
    message: string;
    createdAt: Date;
    updatedAt: Date;
    _id: string;
}