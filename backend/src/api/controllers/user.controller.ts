import { Response, Request } from 'express';

module.exports = {
    deleteUser: (req: Request, res: Response) => { },
    updateUser: (req: Request, res: Response) => { },
    getUser: (req: Request, res: Response) => {
        res.status(200).send({ user: req.user });
    }
};
