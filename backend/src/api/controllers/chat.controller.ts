import { Request, Response } from 'express';
import { dbModels, dbService } from '../../shared/services/db.service';
import { IChannel, IUser } from '../../models/types';
import { decodeJWT } from '../../shared/utils/jwt-handler';
import { secureUser } from '../../shared/utils/utils';

// channel id and or page
async function getChats(req: Request, res: Response) {
    const userId = (req.user as IUser)._id;
    const query = {};
    query['$or'] = [{ ownerId: userId }, { whiteList: userId }];
    query['standalone'] = true;
    const page: number | undefined = parseInt(req.query.page as string, 10) ?? undefined;
    const chats: any = await dbService.getDocumentsByQuery(dbModels.Channel, query, page);
    for (const chat of chats) {
        const usersOfChat = await dbService.getDocumentsByQuery(dbModels.User, { _id: { $in: chat.whiteList } });
        chat.whiteList = usersOfChat.map(u => secureUser(u));
    }
    res.status(200).send(chats);
}

// create a chat
async function createChat(req: Request, res: Response) {
    const chat = req.body as Partial<IChannel>;
    chat.standalone = true;
    const createdChat = await dbService.createDocument(dbModels.Channel, chat);
    res.status(201).send(createdChat);
}

// delete a chat
async function deleteChat(req: Request, res: Response) {
    const channelId = req.query.channelId as string;
    const deletedChat = await dbService.deleteDocumentById(dbModels.Channel, channelId);
    if (!deletedChat) {
        res.status(404).send('Chat not found');
        return;
    }
    await dbService.deleteDocumentsByQuery(dbModels.Message, { channelId });
    res.status(204).send();
}

// update a chat
async function updateChat(req: Request, res: Response) {
    const channelId = req.query.channelId as string;
    const chat = req.body as Partial<IChannel>;
    const updatedChat = await dbService.updateDocumentById(dbModels.Channel, channelId, chat);
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
    const channelId: string = decodedToken.channelId;
    const userId: string | undefined = decodedToken.userId;
    const user = (req.user as IUser);
    if (userId && user._id.toString() !== userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    const updatedChat = await dbService.updateDocumentById(dbModels.Channel, channelId, {
        $addToSet: { 'whiteList': user._id.toString() }
    });
    if (!updatedChat) {
        res.status(404).send('Chat not found');
        return;
    }
    res.status(204).send();
}

async function leaveChat(req: Request, res: Response) {
    const channelId = req.query.channelId as string;
    const userId = (req.user as IUser)._id;
    const updatedChat = await dbService.updateDocumentById(dbModels.Channel, channelId, {
        $pull: { 'whiteList': userId }
    });
    if (!updatedChat) {
        res.status(404).send('Chat not found');
        return;
    }
    if (updatedChat.standalone && updatedChat?.whiteList.length < 2) {
        await dbService.deleteDocumentById(dbModels.Channel, channelId);
        await dbService.deleteDocumentsByQuery(dbModels.Message, { channelId });
    }
    res.status(204).send();
}


async function getMessages(req: Request, res: Response) {
    const channelId = req.query.channelId as string;
    if (!channelId) {
        res.status(400).send('Invalid channel id');
        return;
    }
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
