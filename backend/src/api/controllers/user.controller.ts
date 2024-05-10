import { Response, Request } from 'express';
import { dbModels, dbService } from '../../shared/services/db.service';
import { IChannel, IGame, IUser } from '../../models';

async function deleteUser(req: Request, res: Response) {
    const user = req.user as IUser;
    const chatRoomsOfUser: IChannel[] = await dbService.getDocumentsByQuery(dbModels.Channel, { ownerId: user._id });
    const gamesOfUser: IGame[] = await dbService.getDocumentsByQuery(dbModels.Game, { ownerId: user._id });
    const chatRoomsToDelete = chatRoomsOfUser.map(chat => chat._id);
    const gamesToDelete = gamesOfUser.map(game => game._id);
    await dbService.deleteDocumentsByIds(dbModels.Channel, chatRoomsToDelete);
    await dbService.deleteDocumentsByIds(dbModels.Game, gamesToDelete);
    const deletedUser = await dbService.deleteDocumentById(dbModels.User, user._id);
    if (!deletedUser) {
        res.status(404).send('User not found');
        return;
    }
    res.status(204).send();
}

async function updateUser(req: Request, res: Response) {
    const user = req.user as IUser;
    const updatedUser = await dbService.updateDocumentById(dbModels.User, user._id, req.body);
    if (!updatedUser) {
        res.status(404).send('User not found');
        return;
    }
    res.status(200).send(updatedUser);
}

async function getUser(req: Request, res: Response) {
    res.status(200).send({ user: req.user });
}

module.exports = {
    deleteUser,
    updateUser,
    getUser
};
