import { Response, Request } from 'express';
import passport from 'passport';
import { User } from '../../models/user';
import { BaseError } from '../middleware/error-handler';

async function login(req: Request, res: Response) {
    passport.authenticate('local', (error: string | null, user: User) => {
        if (error) {
            res.status(500).send(error);
        } else {
            req.login(user, (err: string | null) => {
                if (err) {
                    console.log(err);
                    throw new BaseError('LoginError', 500, err, 'backend login controller');
                } else {
                    res.status(200).send();
                }
            });
        }
    })(req, res);
}

module.exports = {
    login,
    logout: (req: Request, res: Response) => { },
    register: (req: Request, res: Response) => { }
};
