import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { dbModels, dbService } from '../../shared/services/db.service';
import { IUser } from '../../models';
import { decodeJWT } from '../../shared/utils/jwt-handler';

// channel id and or page
async function getChats(req: Request, res: Response) {
    const userId = (req.user as IUser)._id;
    let query: any = req.query.chatId ? { _id: new ObjectId(req.query.chatId as string) } : {};
    query = { ...query, $or: [{ ownerId: userId }, { whiteList: userId }] };

    const page: number | undefined = parseInt(req.query.page as string, 10) ?? undefined;
    const chats: any = await dbService.getDocumentsByQuery(dbModels.Channel, query, page);
    for (const chat of chats) {
        const usersOfChat = await dbService.getDocumentsByQuery(dbModels.User, { _id: { $in: chat.whiteList } });
        chat.whiteList = usersOfChat.map((user: Partial<IUser>) => ({ ...user, hashedPassword: undefined }));
    }
    res.status(200).send(chats);
}

// create a chat
async function createChat(req: Request, res: Response) {
    const chat = req.body;
    const createdChat = await dbService.createDocument(dbModels.Channel, chat);
    res.status(201).send(createdChat);
}

// delete a chat
async function deleteChat(req: Request, res: Response) {
    const deletedChat = await dbService.deleteDocumentById(dbModels.Channel, req.query.chatId as string);
    if (!deletedChat) {
        res.status(404).send('Chat not found');
        return;
    }
    await dbService.deleteDocumentsByQuery(dbModels.Message, { channelId: req.query.chatId as string });
    res.status(204).send();
}

// update a chat
async function updateChat(req: Request, res: Response) {
    const updatedChat = await dbService.updateDocumentById(dbModels.Channel, req.query.chatId as string, req.body);
    if (!updatedChat) {
        res.status(404).send('Chat not found');
        return;
    }
    res.status(200).send(updatedChat);
}

// join a chat
async function joinChat(req: Request, res: Response) {
    const token = req.query.token as string;
    const decodedToken = decodeJWT(token);
    const chatId: string = decodedToken.chatId;
    const userId: string | undefined = decodedToken.userId;
    const user = (req.user as IUser);
    if (userId && user._id !== userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    const updatedChat = await dbService.updateDocumentById(dbModels.Channel, chatId, {
        $addToSet: { 'whiteList': user._id }
    });
    if (!updatedChat) {
        res.status(404).send('Chat not found');
        return;
    }
    res.status(204).send();
}

async function leaveChat(req: Request, res: Response) {
    const chatId = req.query.chatId as string;
    const userId = (req.user as IUser)._id;
    const updatedChat = await dbService.updateDocumentById(dbModels.Channel, chatId, {
        $pull: { 'whiteList': userId }
    });
    if (!updatedChat) {
        res.status(404).send('Chat not found');
        return;
    }
    res.status(204).send();
}


async function getMessages(req: Request, res: Response) {
    const channelId = req.query.channelId as string;
    const page: number | undefined = parseInt(req.query.page as string, 10) ?? 0;
    const messages = await dbService.getDocumentsByQuery(dbModels.Message, { channelId }, page);
    res.status(200).send(messages);
}


module.exports = {
    getChats,
    createChat,
    deleteChat,
    updateChat,
    joinChat,
    leaveChat,
    getMessages
};
