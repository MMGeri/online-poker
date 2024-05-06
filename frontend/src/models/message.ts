export interface Message {
    _id?: string;
    channelId: string;
    senderId: string;
    senderName: string;
    message: string;
    timestamp: Date;
}