// getGames (pages), getGame, deleteGame, updateGame, createGame, joinGame, leaveGame
import * as crypto from 'crypto';
import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { IGame } from '../../models/game';
import { IUser } from '../../models/user';
import { dbModels, dbService } from '../../shared/services/db.service';
import { BaseError } from '../middleware/error-handler';
import { decodeJWT, generateJWT } from '../../shared/utils/jwt-handler';

async function createGame(req: Request, res: Response, next: any) {
    const options: IGame['options'] = req.body.options;
    const user = (req.user as IUser);
    let chat;
    try {
        chat = await dbService.createDocument(dbModels.Channel, {
            ownerId: user._id,
            whiteList: [user._id],
            banList: [],
            key: crypto.randomUUID()
        });
    } catch (error: any) {
        next(new BaseError('DbError', 500, error.message, 'backend game controller'));
    }
    const players = new Map<string, any>();
    players.set(user._id, {
        userId: user._id
    });
    const gameToCreate: Partial<IGame> = {
        ownerId: user._id,
        chatChannelId: chat._id,
        options: { ...options, whiteList: [...options.whiteList, user._id] },
        players: players
    };
    try {
        const game = await dbService.createDocument(dbModels.Game, gameToCreate);
        res.status(201).send(game);
    } catch (error: any) {
        next(new BaseError('DbError', 500, error.message, 'backend game controller'));
    }
}

async function getGames(req: Request, res: Response) {
    const query = req.query.gameId ? { _id: new ObjectId(req.query.gameId as string) } : {};
    const page: number | undefined = parseInt(req.query.page as string, 10) ?? undefined;
    const games = await dbService.getDocumentsByQuery(dbModels.Game, query, page);
    if (games.length === 0) {
        res.status(404).send('Game not found');
        return;
    }
    res.status(200).send(games);
}

async function updateGame(req: Request, res: Response, next: any) {
    try {
        const updatedGame = await dbService.updateDocumentById(dbModels.Game, req.query.gameId as string, req.body);
        if (!updatedGame) {
            res.status(404).send('Game not found');
            return;
        }
        res.status(200).send(updatedGame);
    } catch (error: any) {
        next(new BaseError('DbError', 500, error.message, 'backend game controller'));
    }
}

async function deleteGame(req: Request, res: Response, next: any) {
    try {
        const deletedGame = await dbService.deleteDocumentById(dbModels.Game, req.query.gameId as string);
        if (!deletedGame) {
            res.status(404).send('Game not found');
            return;
        }
        res.status(204).send();
    } catch (error: any) {
        next(new BaseError('DbError', 500, error.message, 'backend game controller'));
    }
}

async function joinGame(req: Request, res: Response) {
    const token = req.query.token as string;
    const decodedToken = decodeJWT(token);
    const gameId: string = decodedToken.gameId;
    const userId: string | undefined = decodedToken.userId;
    const user = (req.user as IUser);
    if (userId && user._id !== userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    const updatedGame = await dbService.updateDocumentById(dbModels.Game, gameId, {
        $addToSet: { 'options.whiteList': user._id }
    });
    if (!updatedGame) {
        res.status(404).send('Game not found');
        return;
    }
    const updatedChat = await dbService.updateDocumentById(dbModels.Channel, updatedGame.chatChannelId, {
        $addToSet: { 'whiteList': userId }
    });
    if (!updatedChat) {
        res.status(500).send('Chat not found');
        return;
    }
    res.status(204).send();
}

async function leaveGame(req: Request, res: Response) {
    const gameId = req.query.gameId as string;
    const userId = (req.user as IUser)._id;
    const updatedGame = await dbService.updateDocumentById(dbModels.Game, gameId, {
        $pull: { 'options.whiteList': userId }
    });
    if (!updatedGame) {
        res.status(404).send('Game not found');
        return;
    }
    res.status(204).send();
}

async function inviteUser(req: Request, res: Response) {
    const gameId = req.query.gameId as string;
    const userId = req.query.userId as string;
    const game = await dbService.getDocumentById(dbModels.Game, gameId);
    if (!game) {
        res.status(404).send('Game not found');
        return;
    }
    if (userId) {
        res.status(200).send(generateJWT({ gameId, userId }));
        return;
    }
    res.status(200).send(generateJWT({ gameId }));
}

module.exports = {
    getGames,
    deleteGame,
    updateGame,
    createGame,
    joinGame,
    leaveGame,
    inviteUser
};
