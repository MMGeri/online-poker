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
import { configurePassport } from './shared/utils/passport';

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
    validateResponses: {
        removeAdditional: 'failing',
        onError: (errors: any, req, res) => {
            throw new BaseError('ValidationError', 400, errors, 'backend');
        }
    },
    validateSecurity: {
        handlers: {
            cookieAuth: (req, scopes, schema) => req.isAuthenticated(),
            cookieAdminAuth: (req, scopes, schema) => req.isAuthenticated() && (req.user as IUser).roles.includes('admin')
        }
    }
}));
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    errorHandler.handleError(err, req, res, next);
});

// Connect to MongoDB
connect();


server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
import './game-server/socket-io';
import { IUser } from './models/user';

export default app;
export { io, passportSession, expressSessionMiddleware };
