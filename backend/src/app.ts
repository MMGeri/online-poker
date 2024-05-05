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
import { configurePassport } from './shared/utils/passport';
import { connect } from './connection';

const port = config.port;
const apiDefPath = path.join(__dirname, 'api/openapi.yaml');
const sessionOptions: expressSession.SessionOptions = {
    secret: 'testsecret',
    resave: false,
    saveUninitialized: false
};

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const errorHandler = new ErrorHandler();

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    errorHandler.handleError(err, req, res, next);
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(expressSession(sessionOptions));
app.use(passport.initialize());
app.use(passport.session());
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
            cookieAuth: (req, scopes, schema) => req.isAuthenticated()
        }
    }
}));

// Connect to MongoDB
connect();

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    errorHandler.handleError(err, req, res, next);
});

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});
app.use(cors());

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

export default app;
