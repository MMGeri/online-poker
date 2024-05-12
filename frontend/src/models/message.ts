export interface IMessage {
    channelId: string;
    senderId: string;
    senderName: string;
    message: string;
    createdAt: Date;
    updatedAt: Date;
    _id: string;
}