import { Socket } from 'socket.io';
import { NextFunction, Response, Request } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { io, passportSession, expressSessionMiddleware } from '../app';
import { IUser } from '../models/user';
import { IMessage } from '../models/message';
import { dbService } from '../shared/services/db.service';
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

    socket.use(applyRateLimiting(socket, user));

    socket.on('join-chat-channel', async (obj: { key: string; channelId: string }) => {
        if (await canJoinChatChannel(obj.key, obj.channelId)) {
            socket.join(`chat:${obj.channelId}`);
        }
    });
    socket.on('join-game-channel', async (obj: { key: string; gameId: string }) => {
        if (await canJoinGameChannel(obj.key, obj.gameId)) {
            socket.join(`game:${obj.gameId}`);
            socket.join(`game:${obj.gameId}:${user._id}`); // private room
        }
    });
    socket.on('new-message', (obj: { message: string; channelId: string }) => {
        if (!userIsPartOfChannel(sid, `chat:${obj.channelId}`)) {
            return;
        }
        const messageObj: Partial<IMessage> & { senderName: string } = {
            channelId: obj.channelId,
            senderId: user._id,
            senderName: user.username,
            message: obj.message
        };
        socket.to(`chat:${obj.channelId}`).emit('new-message', messageObj);
    });
    socket.on('game-event', async (obj: { inputEvent: HybridEvent; gameId: string }) => {
        obj.inputEvent.userId = user._id;
        if (!userIsPartOfChannel(sid, `game:${obj.gameId}`)) {
            return;
        }
        if (!isInputEvent(obj.inputEvent)) {
            return;
        }
        if (!userOwnsSocket(user._id, obj.inputEvent.userId)) {
            return;
        }
        const gameEventManager = gems.getGameEventManager(obj.gameId);
        if (!gameEventManager) {
            return;
        }
        const { event, gameState } = await gameEventManager.getNewGameState(obj.inputEvent);
        if (event) {
            socket.to(`game:${obj.gameId}`).emit('game-event', { event, gameState });
        }
    });
    socket.on('disconnect', () => {
        console.log('user disconnected');
        // TODO: send user left to game:id or chat:id room event
        // TODO: send pause event? or throw in event.
        // TODO: tell game manager?
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
        console.log(user._id);
        rateLimiter.consume(user._id)
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

function userIsPartOfChannel(sid: string, channelId: string): boolean {
    const rooms = io.of('/').adapter.rooms;
    const channelRoom = rooms.get(`channel:${channelId}`);
    return channelRoom?.has(sid) || false;
}

async function canJoinChatChannel(key: string, channelId: string): Promise<boolean> {
    const channel = await dbService.getChannelsByQuery({ _id: channelId });
    return key === channel[0]?.key;
}

async function canJoinGameChannel(key: string, gameId: string): Promise<boolean> {
    const game = await dbService.getGamesByQuery({ _id: gameId }); // TODO: whitelist and banlist
    return key === game[0]?.options.key;
}
