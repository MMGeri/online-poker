import { createHash } from 'crypto';
import { Response, Request, NextFunction } from 'express';
import passport from 'passport';
import { IUser } from '../../models/types/user';
import { BaseError } from '../middleware/error-handler';
import { dbModels, dbService } from '../../shared/services/db.service';
import { secureUser } from '../../shared/utils/utils';

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
            res.status(200).json(secureUser(user as IUser, true));
        });
    })(req, res);
}

async function register(req: Request, res: Response, next: NextFunction) {
    const user = req.body;
    const users = await dbService.getDocumentsByQuery(dbModels.User, { username: user.username });
    if (users.length > 0) {
        res.status(400).send('Username is already taken');
        return;
    }
    if (user.password !== user.confirmPassword) {
        res.status(400).send('Passwords do not match');
        return;
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
        res.status(200).send();
    });
}

module.exports = {
    login,
    logout,
    register,
    checkAuth: (req: Request, res: Response) => {
        if (req.isAuthenticated()) {
            res.status(200).send(secureUser(req.user as IUser, true));
        } else {
            res.status(401).send('Unauthorized');
        }
    }
};
