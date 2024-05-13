interface IMessage {
    _id: string;
    channelId: string;
    senderId: string;
    senderName?: string;
    message: string;
    createdAt: Date;
    updatedAt: Date;
}

export { IMessage };
