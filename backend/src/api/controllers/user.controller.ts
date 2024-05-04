import { Response, Request } from 'express';
import { get } from 'mongoose';
import passport from 'passport';

module.exports = {
    deleteUser: (req: Request, res: Response) => { },
    updateUser: (req: Request, res: Response) => { },
    getUser: (req: Request, res: Response) => {
        res.status(200).send({ user: req.user });
    }
};
