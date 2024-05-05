import path from 'path';
import express, { NextFunction, Request, Response } from 'express';
import * as OpenApiValidator from 'express-openapi-validator';
import passport from 'passport';
import expressSession from 'express-session';
import cookieParser from 'cookie-parser';
import { BaseError, ErrorHandler } from './api/middleware/error-handler';
import { config } from './config';
import { configurePassport } from './shared/utils/passport';
import { connect } from './connection';

const app = express();
const errorHandler = new ErrorHandler();
const port = config.port;
export const apiDefPath = path.join(__dirname, 'api/openapi.yaml');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
const sessionOptions: expressSession.SessionOptions = {
    secret: 'testsecret',
    resave: false,
    saveUninitialized: false
};
app.use(expressSession(sessionOptions));
app.use(passport.initialize());
app.use(passport.session());
configurePassport(passport);
app.use(OpenApiValidator.middleware({
    apiSpec: apiDefPath,
    operationHandlers: path.join(__dirname),
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

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

export default app;
