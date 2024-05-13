// getGames (pages), getGame, deleteGame, updateGame, createGame, joinGame, leaveGame
import { Request, Response } from 'express';
import _ from 'lodash';
import { IUser } from '../../models/types/user';
import { dbModels, dbService } from '../../shared/services/db.service';
import { BaseError } from '../middleware/error-handler';
import { decodeJWT, generateJWT } from '../../shared/utils/jwt-handler';
import { isBSONType, removeSensitiveData, secureUser } from '../../shared/utils/utils';
import { gems } from '../../game-server/game-event.manager';
import { config } from '../../config';
import { IGame, IPlayer } from '../../models/types';

const defaultPlayerSettings = {
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
    connected: false,
    ready: false
};

async function createGame(req: Request, res: Response, next: any) {
    const game = req.body as unknown as IGame;
    const user = (req.user as IUser);
    let chat;
    try {
        chat = await dbService.createDocument(dbModels.Channel, {
            ownerId: user._id.toString(),
            whiteList: [user._id.toString()]
        });
    } catch (error: any) {
        next(new BaseError('DbError', 500, error.message, 'backend game controller'));
        return;
    }
    const players: IPlayer[] = [{
        ...defaultPlayerSettings,
        userId: user._id.toString()
    }];
    const gameToCreate = {
        ...game,
        ownerId: user._id.toString(),
        chatChannelId: chat._id.toString(),
        options: { ...game.options, whiteList: [...(game.options?.whiteList ?? []), user._id.toString()] },
        players: players
    };
    if (!gameToCreate.options?.maxPlayers || gameToCreate.options.maxPlayers < gameToCreate.options.whiteList.length) {
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
        const queriedGame = await dbService.getDocumentById(dbModels.Game, createdGame._id.toString());
        if (queriedGame) {
            gems.createGameEventManager(createdGame);
            res.status(201).send(createdGame);
        } else {
            res.status(500).send('Game could not be created');
        }
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
        query.name = { $regex: req.query.name as string, $options: 'i' };
    }
    if (req.query.myGames) {
        query.ownerId = user?._id;
    } else {
        query['options.isPublic'] = true;
    }
    const games = await dbService.getDocumentsByQuery(dbModels.Game, query, page);
    res.status(200).send(games.map(g => removeSensitiveData(g)));
}

async function getGameById(req: Request, res: Response) {
    const gameId = req.query.gameId as string;
    if (!isBSONType(gameId)) {
        res.status(400).send('Invalid game id');
        return;
    }
    const game: any = (await dbService.getDocumentById(dbModels.Game, gameId));
    const playersOnWhiteList = await dbService.getDocumentsByQuery(dbModels.User, { _id: { $in: game.options.whiteList } });
    game.options.whiteList = playersOnWhiteList.map(u => secureUser(u));
    res.status(200).send(removeSensitiveData(game));
}

async function updateGame(req: Request, res: Response, next: any) {
    try {
        const user = (req.user as IUser);
        let gameToUpdate = req.body as Partial<IGame>;
        if (!user.roles.includes('admin')) {
            gameToUpdate = _.pick(gameToUpdate, ['name', 'options', 'isPublic']);
        }
        const gameId = req.query.gameId as string;
        if (!isBSONType(gameId)) {
            res.status(400).send('Invalid game id');
            return;
        }
        if (gameToUpdate.options && !_.every(gameToUpdate.options.whiteList, isBSONType)) {
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
    const gameId = req.query.gameId as string;
    const user = (req.user as IUser);

    if (!isBSONType(gameId)) {
        res.status(400).send('Invalid game id');
        return;
    }

    const game = await dbService.getDocumentById(dbModels.Game, gameId);
    if (game && game?.options.whiteList.includes(user._id.toString())) {
        res.status(400).json({ message: 'Already joined' });
        return;
    }
    if (game && game.options.maxPlayers && game.options.whiteList.length >= game.options.maxPlayers) {
        res.status(400).json({ message: 'Game is full' });
        return;
    }
    if (game?.options?.isPublic) {
        // eslint-disable-next-line no-var
        var updatedGame = await dbService.updateDocumentById(dbModels.Game, gameId, {
            $addToSet: { 'options.whiteList': user._id.toString() },
            $push: { 'players': { ...defaultPlayerSettings, userId: user._id.toString() } }
        });
    } else {
        res.status(400).send('Invalid gameId');
        return;
    }

    if (!updatedGame) {
        res.status(404).send('Game not found');
        return;
    }
    await gems.gameEventManagers[gameId].updateFromDb();
    const updatedChat = await dbService.updateDocumentById(dbModels.Channel, updatedGame.chatChannelId, {
        $addToSet: { 'whiteList': user._id.toString() }
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
    const userId = (req.user as IUser)._id.toString();
    const updatedGame = await dbService.updateDocumentById(dbModels.Game, gameId,
        {
            $pull: {
                'options.whiteList': userId,
                'players': { userId }
            }
        }
    );
    if (!updatedGame) {
        res.status(404).send('Game not found');
        return;
    }
    try {
        gems.gameEventManagers[gameId].abandonGame(userId);
    } catch (error) {
        console.error(error);
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
    res.status(200).send({ token: generateJWT({ gameId, userId }) });
}

async function getMagicLink(req: Request, res: Response) {
    const gameId = req.query.gameId as string;
    const token = req.query.token as string;
    if (!isBSONType(gameId)) {
        res.status(400).send('Invalid game id');
        return;
    }
    if (token) {
        const decodedToken = decodeJWT(token);
        const userId: string = decodedToken.userId;
        const game = await dbService.getDocumentById(dbModels.Game, gameId);
        if (game) {
            const isUserInWhiteList = game.options.whiteList.includes(userId);
            if (isUserInWhiteList) {
                res.redirect(301, `${config.frontendUrl}/game/${gameId}`);
                return;
            }
        } else {
            res.status(404).send('Game not found');
            return;
        }
        await dbService.updateDocumentById(dbModels.Game, gameId,
            {
                $addToSet: { 'options.whiteList': userId },
                $push: { 'players': { ...defaultPlayerSettings, userId } }
            }
        );
        gems.gameEventManagers[gameId].updateFromDb();
        const updatedChat = await dbService.updateDocumentById(dbModels.Channel, game.chatChannelId, {
            $addToSet: { 'whiteList': userId }
        });
    }
    res.redirect(301, `${config.frontendUrl}/game/${gameId}`);
}

module.exports = {
    getGames,
    getGameById,
    deleteGame,
    updateGame,
    createGame,
    joinGame,
    leaveGame,
    inviteUser,
    getMagicLink
};
