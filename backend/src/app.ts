/* eslint-disable import/order */
import path from 'path';
import http from 'http';
import express, { NextFunction, Request, Response } from 'express';
import * as OpenApiValidator from 'express-openapi-validator';
import passport from 'passport';
import expressSession from 'express-session';
import cookieParser from 'cookie-parser';
import { Server } from 'socket.io';
import cors from 'cors';
import { BaseError, ErrorHandler } from './api/middleware/error-handler';
import { config } from './config';
import { connect } from './connection';
import { dbModels, dbService } from './shared/services/db.service';
import { configurePassport } from './shared/utils/passport';
import { IUser } from './models/user';


const port = config.port;
const apiDefPath = path.join(__dirname, 'api/openapi.yaml');
const sessionOptions: expressSession.SessionOptions = {
    secret: 'testsecret',
    resave: false,
    saveUninitialized: false
};

const whitelist = config.whitelist;
const app = express();
const server = http.createServer(app);

const passportSession = passport.session();
const expressSessionMiddleware = expressSession(sessionOptions);
const io = new Server(server, {
    cors: {
        origin: whitelist,
        credentials: true
    }
});
const corsOptions = {
    origin: (origin: string | undefined, callback: (error: Error | null, allowed?: boolean) => void) => {
        if (!config.production && !origin) {
            callback(null, true);
            return;
        }
        if (whitelist.indexOf(origin!) !== -1) {
            callback(null, true);
            return;
        } else {
            callback(new BaseError('CorsError', 403, 'Not allowed by CORS', 'backend cors middleware'));
            return;
        }
    },
    credentials: true
};
const errorHandler = new ErrorHandler();

// Connect to MongoDB
connect();

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    errorHandler.handleError(err, req, res, next);
});
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(expressSessionMiddleware);
app.use(passport.initialize());
app.use(passportSession);
configurePassport(passport);
app.use(OpenApiValidator.middleware({
    apiSpec: apiDefPath,
    operationHandlers: path.join(__dirname),
    ignoreUndocumented: true,
    validateRequests: true,
    validateResponses: false,
    // validateResponses: {
    //     removeAdditional: 'failing',
    //     onError: (errors: any, req, res) => {
    //         throw new BaseError('ValidationError', 400, errors, 'backend');
    //     }
    // },
    validateSecurity: {
        handlers: {
            cookieAuth: (req, scopes, schema) => req.isAuthenticated(),
            cookieAdminAuth: (req, scopes, schema) => req.isAuthenticated() && (req.user as IUser).roles.includes('admin'),
            userSpecificCookieAuth: (req, scopes, schema) => req.isAuthenticated() && req.query.userId === ((req.user as IUser)._id.toString()),
            chatOwnerAuth: async (req, scopes, schema) => {
                if (!req.isAuthenticated()) {
                    return false;
                }
                const user = req.user as IUser;
                const channelId = req.query.channelId as string;
                const chat = await dbService.getDocumentById(dbModels.Channel, channelId);
                if (!chat) {
                    return false;
                }
                return chat.ownerId === user._id.toString();
            },
            chatMemberAuth: async (req, scopes, schema) => {
                if (!req.isAuthenticated()) {
                    return false;
                }
                const user = req.user as IUser;
                const channelId = req.query.channelId as string;
                const chat = await dbService.getDocumentById(dbModels.Channel, channelId);
                if (!chat) {
                    return false;
                }
                return chat.whiteList.includes(user._id.toString());
            },
            gameOwnerAuth: async (req, scopes, schema) => {
                if (!req.isAuthenticated()) {
                    return false;
                }
                const user = req.user as IUser;
                const gameId = req.query.gameId as string;
                const game = await dbService.getDocumentById(dbModels.Game, gameId);
                if (!game) {
                    return false;
                }
                return game.ownerId === user._id.toString();
            },
            gamePlayerAuth: async (req, scopes, schema) => {
                const user = req.user as IUser;
                const gameId = req.query.gameId as string;
                const game = await dbService.getDocumentById(dbModels.Game, gameId);
                if (!game) {
                    return false;
                }
                return req.isAuthenticated() && game.options.whiteList.includes(user._id.toString());
            }
        }
    }
}));


app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    errorHandler.handleError(err, req, res, next);
});

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
import './game-server/socket-io';
import { GameModel } from './models';
import mongoose from 'mongoose';
import { isBSONType } from './shared/utils/utils';

export default app;
export { io, passportSession, expressSessionMiddleware };
