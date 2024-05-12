// getGames (pages), getGame, deleteGame, updateGame, createGame, joinGame, leaveGame
import { Request, Response } from 'express';
import _ from 'lodash';
import { IUser } from '../../models/user';
import { dbModels, dbService } from '../../shared/services/db.service';
import { BaseError } from '../middleware/error-handler';
import { decodeJWT, generateJWT } from '../../shared/utils/jwt-handler';
import { isBSONType, removeSensitiveData, secureUser } from '../../shared/utils/utils';
import { gems } from '../../game-server/game-event.manager';

async function createGame(req: Request, res: Response, next: any) {
    const game = req.body;
    const user = (req.user as IUser);
    let chat;
    try {
        chat = await dbService.createDocument(dbModels.Channel, {
            ownerId: user._id,
            whiteList: [user._id]
        });
    } catch (error: any) {
        next(new BaseError('DbError', 500, error.message, 'backend game controller'));
        return;
    }
    const players = new Map<string, any>();
    players.set(user._id, {
        userId: user._id,
        cards: [],
        inGameBalance: 0,
        bet: 0,
        called: false,
        checked: false,
        raisedTimes: 0,
        tapped: false,
        tappedAtPot: 0,
        positionAtTable: 0,
        folded: false,
        leftGame: false
    });
    const gameToCreate = {
        ...game,
        ownerId: user._id,
        chatChannelId: chat._id,
        options: { ...game.options, whiteList: [...game.options.whiteList, user._id] },
        players: players
    };
    if (gameToCreate.options.maxPlayers > gameToCreate.options.whiteList.length) {
        gameToCreate.options.maxPlayers = gameToCreate.options.whiteList.length;
    }
    if (!_.every(gameToCreate.options.whiteList, isBSONType)) {
        try {
            gameToCreate.options.whiteList = await convertUsernamesToIds(gameToCreate.options.whiteList);
        } catch (error: any) {
            next(new BaseError('Invalid usernames in whitelist', 400, error.message, 'backend game controller'));
            return;
        }
    }
    try {
        const createdGame = await dbService.createDocument(dbModels.Game, gameToCreate);
        gems.createGameEventManager(createdGame);
        res.status(201).send(createdGame);
    } catch (error: any) {
        next(new BaseError('DbError', 500, error.message, 'backend game controller'));
    }
}

async function convertUsernamesToIds(usernames: string[]) {
    const ids = _.filter(usernames, isBSONType);
    const names = _.difference(usernames, ids);
    const users = await dbService.getDocumentsByQuery(dbModels.User, { username: { $in: names } });
    if (users.length !== usernames.length) {
        throw new Error('Not all usernames could be found');
    }
    return users.map(user => user._id.toString()).concat(ids);
}

async function getGames(req: Request, res: Response) {
    const query: any = {};
    const user = (req.user as IUser);
    const page: number | undefined = parseInt(req.query.page as string, 10) ?? undefined;
    if (req.query.name) {
        query.name = { $regex: req.query.name as string };
    }
    if (req.query.myGames) {
        query.ownerId = user?._id;
    } else {
        query['options.isPublic'] = true;
    }
    const games = await dbService.getDocumentsByQuery(dbModels.Game, query, page);
    res.status(200).send(games.map(removeSensitiveData));
}

async function getGameById(req: Request, res: Response) {
    const gameId = req.query.gameId as string;
    if (!isBSONType(gameId)) {
        res.status(400).send('Invalid game id');
        return;
    }
    const game: any = await dbService.getDocumentById(dbModels.Game, gameId);
    const playersOnWhiteList = await dbService.getDocumentsByQuery(dbModels.User, { _id: { $in: game.options.whiteList } });
    playersOnWhiteList.map(u => secureUser(u));
    game.options.whiteList = playersOnWhiteList;
    res.status(200).send(removeSensitiveData(game));
}

async function updateGame(req: Request, res: Response, next: any) {
    try {
        const gameToUpdate = req.body;
        const gameId = req.query.gameId as string;
        if (!isBSONType(gameId)) {
            res.status(400).send('Invalid game id');
            return;
        }
        if (!_.every(gameToUpdate.options.whiteList, isBSONType)) {
            try {
                gameToUpdate.options.whiteList = await convertUsernamesToIds(gameToUpdate.options.whiteList);
            } catch (error: any) {
                next(new BaseError('Invalid usernames in whitelist', 400, error.message, 'backend game controller'));
                return;
            }
        }
        const updatedGame = await dbService.updateDocumentById(dbModels.Game, gameId, gameToUpdate);
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

    const gameId = req.query.gameId as string;
    if (!isBSONType(gameId)) {
        res.status(400).send('Invalid game id');
        return;
    }
    const gameEventManager = gems.gameEventManagers[gameId];
    if (gameEventManager) {
        await gameEventManager.deleteGame();
    }
    const deletedGame = await dbService.deleteDocumentById(dbModels.Game, gameId);
    if (!deletedGame) {
        res.status(404).send('Game not found');
        return;
    }
    const chatId = deletedGame.chatChannelId;
    const deletedChat = await dbService.deleteDocumentById(dbModels.Channel, chatId);
    if (!deletedChat) {
        next(new BaseError('DbError', 500, 'Chat not found', 'backend game controller'));
        return;
    }
    res.status(204).send();
}

async function joinGame(req: Request, res: Response) {
    const token = req.query.token as string;
    const gameId = req.query.gameId as string;
    const user = (req.user as IUser);

    if (!isBSONType(gameId)) {
        res.status(400).send('Invalid game id');
        return;
    }

    const game = await dbService.getDocumentById(dbModels.Game, gameId);
    if (game && game?.options.whiteList.includes(user._id.toString())) {
        res.status(200).json({ message: 'Already joined' });
        return;
    }
    if (game?.options?.isPublic) {
        // eslint-disable-next-line no-var
        var updatedGame = await dbService.updateDocumentById(dbModels.Game, gameId, {
            $addToSet: { 'options.whiteList': user._id },
            $set: {
                'players': { [user._id]: { userId: user._id } }
            }
        });
    } else if (token) {
        const decodedToken = decodeJWT(token);
        const userId: string | undefined = decodedToken.userId;
        if (userId && user._id !== userId) {
            res.status(401).send('Unauthorized');
            return;
        }
        // eslint-disable-next-line no-var
        var updatedGame = await dbService.updateDocumentById(dbModels.Game, gameId, {
            $addToSet: { 'options.whiteList': user._id },
            $set: { 'players': { [user._id]: { userId: user._id } } }
        });
    } else {
        res.status(400).send('Invalid token or gameId');
        return;
    }

    if (!updatedGame) {
        res.status(404).send('Game not found');
        return;
    }

    const updatedChat = await dbService.updateDocumentById(dbModels.Channel, updatedGame.chatChannelId, {
        $addToSet: { 'whiteList': user._id }
    });
    if (!updatedChat) {
        res.status(500).send('Chat not found');
        return;
    }
    res.status(204).send();
}

async function leaveGame(req: Request, res: Response) {
    const gameId = req.query.gameId as string;
    if (!isBSONType(gameId)) {
        res.status(400).send('Invalid game id');
        return;
    }
    const userId = (req.user as IUser)._id;
    const updatedGame = await dbService.updateDocumentById(dbModels.Game, gameId, {
        $pull: { 'options.whiteList': userId },
        $unset: { [`players.${userId}`]: '' }
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
    if (!isBSONType(userId) || !isBSONType(gameId)) {
        res.status(400).send('Invalid user or game id');
        return;
    }
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
    getGameById,
    deleteGame,
    updateGame,
    createGame,
    joinGame,
    leaveGame,
    inviteUser
};
