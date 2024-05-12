import { Response, Request } from 'express';
import _ from 'lodash';
import { dbModels, dbService } from '../../shared/services/db.service';
import { IChannel, IGame, IUser } from '../../models';
import { isBSONType, secureUser } from '../../shared/utils/utils';

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

async function getUserById(req: Request, res: Response) {
    const userId = req.params.userId;
    if (!isBSONType(userId)) {
        res.status(400).send('Invalid user id');
        return;
    }
    const user = await dbService.getDocumentById(dbModels.User, userId);
    if (!user) {
        res.status(404).send('User not found');
        return;
    }
    res.status(200).send(secureUser(user));
}

async function getUsers(req: Request, res: Response) {
    const username = req.query.username as string;
    const users = await dbService.getDocumentsByQuery(dbModels.User, { username });
    users.map(u => secureUser(u));
    res.status(200).send(users);
}

async function getFriends(req: Request, res: Response) {
    const user = (req.user as IUser);
    const users = await dbService.getDocumentsByQuery(dbModels.User, { _id: { $in: user.friends } });
    res.status(200).send(users.map(u => secureUser(u)));
}

async function addFriend(req: Request, res: Response) {
    const user = (req.user as IUser);
    const friendId = req.body.friendId;
    if (!isBSONType(friendId)) {
        res.status(400).send('Invalid friend id');
        return;
    }
    const friend = await dbService.getDocumentById(dbModels.User, friendId);
    if (!friend) {
        res.status(404).send('User not found');
        return;
    }
    if (user.friends.includes(friend._id)) {
        res.status(400).send('User is already your friend');
        return;
    }
    user.friends.push(friend._id);
    await dbService.updateDocumentById(dbModels.User, user._id, user);
    await dbService.updateDocumentById(dbModels.User, friend._id, { $addToSet: { friends: user._id } });
    res.status(201).send(friend);
}

async function removeFriend(req: Request, res: Response) {
    const user = (req.user as IUser);
    const friendId = req.query.friendId as string;
    if (!isBSONType(friendId)) {
        res.status(400).send('Invalid friend id');
        return;
    }
    const friend = await dbService.getDocumentById(dbModels.User, friendId);
    if (!friend) {
        res.status(404).send('User not found');
        return;
    }
    await dbService.updateDocumentById(dbModels.User, user._id, { $pull: { friends: friend._id } });
    await dbService.updateDocumentById(dbModels.User, friend._id, { $pull: { friends: user._id } });
    res.status(204).send();
}



module.exports = {
    deleteUser,
    updateUser,
    getUsers,
    getUserById,
    getFriends,
    addFriend,
    removeFriend
};
