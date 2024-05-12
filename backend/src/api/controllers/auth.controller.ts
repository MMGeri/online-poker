import { createHash } from 'crypto';
import { Response, Request, NextFunction } from 'express';
import passport from 'passport';
import { IUser } from '../../models/user';
import { BaseError } from '../middleware/error-handler';
import { dbModels, dbService } from '../../shared/services/db.service';

async function login(req: Request, res: Response) {
    passport.authenticate('local', (error: any, user: IUser) => {
        if (error) {
            res.status(error.status ?? 500).send({ message: error.message, ...error });
            return;
        }
        req.login(user, (err: string | null) => {
            if (err) {
                res.status(401).send('Unauthorized');
                return;
            }
            user._id = user._id.toString();
            res.status(200).json(user);
        });
    })(req, res);
}

async function register(req: Request, res: Response, next: NextFunction) {
    const user = req.body;
    const users = await dbService.getDocumentsByQuery(dbModels.User, { username: user.username });
    if (users.length > 0) {
        res.status(400).send('Username is already taken');
    }
    const hashedPassword = createHash('sha256').update(req.body.password).digest('hex');
    try {
        await dbService.createDocument(dbModels.User, { username: user.username, hashedPassword });
    } catch (error: any) {
        next(new BaseError('RegisterError', 500, error.message, 'backend register controller'));
    }
    res.status(200).send();
}

async function logout(req: Request, res: Response) {
    req.logout((error) => {
        if (error) {
            console.log(error);
            res.status(500).send('Internal server error.');
        }
        res.status(200).send('Successfully logged out.');
    });
}

module.exports = {
    login,
    logout,
    register,
    checkAuth: (req: Request, res: Response) => {
        if (req.isAuthenticated()) {
            res.status(200).send(true);
        } else {
            res.status(401).send('Unauthorized');
        }
    }
};
