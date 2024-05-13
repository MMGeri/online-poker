import { Socket } from 'socket.io';
import { NextFunction, Response, Request } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { io, passportSession, expressSessionMiddleware } from '../app';
import { IUser } from '../models/types/user';
import { IMessage } from '../models/types/message';
import { dbModels, dbService } from '../shared/services/db.service';
import { HybridEventNameEnum, HybridEvent } from './game-events.model';
import { gems } from './game-event.manager';

const rateLimiter = new RateLimiterMemory({
    points: 10,
    duration: 10
});

io.engine.use(onlyForHandshake(expressSessionMiddleware));
io.engine.use(onlyForHandshake(passportSession));
io.engine.use(onlyForHandshake(sessionAuth));

io.on('connection', (socket: Socket) => {
    const user = socket.request['user'] as IUser;
    const sid = socket.id;
    console.log(user.username, 'connected');

    socket.use(applyRateLimiting(socket, user));

    socket.on('join-chat-channel', async (obj: { key: string; channelId: string }) => {
        if (await canJoinChatChannel(user._id.toString(), obj.channelId)) {
            console.log('join chat channel', user.username, obj.channelId);
            socket.join(`chat:${obj.channelId}`);
        }
    });
    socket.on('join-game-channel', async (obj: { key: string; gameId: string }) => {
        if (await canJoinGameChannel(obj.key, obj.gameId)) {
            console.log('join game channel', user.username, obj.gameId);
            socket.join(`game:${obj.gameId}`);
            socket.join(`game:${obj.gameId}:${user._id.toString()}`); // private room
        }
    });
    socket.on('leave-chat-channel', (obj: { channelId: string }) => {
        console.log('leave chat channel', user.username, obj.channelId);
        socket.leave(`chat:${obj.channelId}`);
    });
    socket.on('leave-game-channel', (obj: { gameId: string }) => {
        console.log('leave game channel', user.username, obj.gameId);
        socket.leave(`game:${obj.gameId}`);
        socket.leave(`game:${obj.gameId}:${user._id.toString()}`); // private room
    });
    socket.on('new-message', (obj: { message: string; channelId: string }) => {
        console.log('new message', obj);
        const messageObj: Partial<IMessage> & { senderName: string } = {
            channelId: obj.channelId,
            senderId: user._id.toString(),
            senderName: user.username,
            message: obj.message
        };
        io.in(`chat:${obj.channelId}`).emit('new-message', messageObj);
        dbService.createDocument(dbModels.Message, messageObj);
    });
    socket.on('game-event', async (obj: { inputEvent: HybridEvent; gameId: string }) => {
        console.log('game event', obj);
        obj.inputEvent.userId = user._id.toString();
        if (!isInputEvent(obj.inputEvent) ||
            !userOwnsSocket(user._id.toString(), obj.inputEvent.userId)) {
            return;
        }
        const gameEventManager = gems.gameEventManagers[obj.gameId];
        if (!gameEventManager) {
            return;
        }
        const { events, gameState } = await gameEventManager.getNewGameState(obj.inputEvent);
        for (const event of events) {
            io.in(`game:${obj.gameId}`).emit('game-event', { event, gameState });
        }
    });
    socket.on('disconnect', () => {
        console.log(user.username, 'disconnected');
    });
});

function isInputEvent(event: HybridEvent): event is HybridEvent {
    return (event as HybridEvent).name in HybridEventNameEnum;
}

function userOwnsSocket(userId: string, socketUserId: string): boolean {
    return userId === socketUserId;
}

function applyRateLimiting(socket: Socket, user: IUser) {
    return (packet, next) => {
        rateLimiter.consume(user._id.toString())
            .then(() => {
                next();
            })
            .catch(() => {
                socket.disconnect();
                next(new Error('Rate limit exceeded'));
            });
    };
}

function onlyForHandshake(middleware) {
    return (req, res: Response, next: NextFunction) => {
        const isHandshake = req._query.sid === undefined;
        if (isHandshake) {
            middleware(req, res, next);
        } else {
            next();
        }
    };
}

async function sessionAuth(req: Request, res: Response, next: NextFunction) {
    if (req.user) {
        next();
    } else {
        res.writeHead(401);
        res.end();
    }
}

async function canJoinChatChannel(userId: string, channelId: string): Promise<boolean> {
    const chat = await dbService.getDocumentById(dbModels.Channel, channelId);
    if (!chat) {
        return false;
    }
    const canJoin = chat.whiteList.includes(userId);
    return canJoin;
}

async function canJoinGameChannel(key: string, gameId: string): Promise<boolean> {
    const game = await dbService.getDocumentsByQuery(dbModels.Game, { _id: gameId });
    const canJoin = (game[0].options.whiteList.indexOf(game[0].ownerId) !== -1);
    return canJoin;
}
