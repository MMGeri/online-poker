import { Socket } from 'socket.io';
import { NextFunction, Response, Request } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { io, passportSession, expressSessionMiddleware } from '../app';
import { IUser } from '../models/user';
import { IMessage } from '../models/message';
import { dbService } from '../shared/services/db.service';
import { GameEvent, InputEventNameEnum, InputEvent } from './game-events.model';

// chat does not need to be managed
interface GameEvenManagers {
    [key: string]: GameEventManager; // key is gameId
}


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
    socket.on('game-event', (obj: { event: InputEvent; gameId: string }) => {
        if (!userIsPartOfChannel(sid, `game:${obj.gameId}`)) {
            return;
        }
        if (!isInputEvent(obj.event)) {
            return;
        }
        if (!userOwnsSocket(user._id, obj.event.userId)) {
            return;
        }
        // user specific or entire lobby gameState.userId; or not
        const gameState = {};
        // TODO: get new game state from gameEventManager
        // game state should not contain player cards
        // only calculate form Input events, server side events should return null and continue
        socket.to(`game:${obj.gameId}`).emit('game-event', gameState);
    });
    socket.on('disconnect', () => {
        console.log('user disconnected');
        // TODO: send user left to game:id or chat:id room event
        // TODO: send pause event? or throw in event.
    });
});

function isInputEvent(event: InputEvent): event is InputEvent {
    return (event as InputEvent).name in InputEventNameEnum;
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
    const game = await dbService.getGamesByQuery({ _id: gameId });
    return key === game[0]?.options.key;
}
