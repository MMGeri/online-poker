import { Response, Request } from 'express';
import _ from 'lodash';
import { dbModels, dbService } from '../../shared/services/db.service';
import { IChannel, IGame, IUser } from '../../models/types';
import { isBSONType, secureUser } from '../../shared/utils/utils';
import { gems } from '../../game-server/game-event.manager';

async function deleteUser(req: Request, res: Response) {
    const user = req.user as IUser;
    const chatRoomsOfUser: IChannel[] = await dbService.getDocumentsByQuery(dbModels.Channel, { ownerId: user._id.toString() });
    const gamesOfUser: IGame[] = await dbService.getDocumentsByQuery(dbModels.Game, { ownerId: user._id.toString() });
    const chatRoomsToDelete = chatRoomsOfUser.map(chat => chat._id);
    const gamesToDelete = gamesOfUser.map(game => game._id.toString());
    await dbService.deleteDocumentsByIds(dbModels.Channel, chatRoomsToDelete);
    await dbService.deleteDocumentsByIds(dbModels.Game, gamesToDelete);
    for (const game of gamesToDelete) {
        try{
            await gems.gameEventManagers[game].deleteGame();
        } catch (error) {
            console.error(error);
        }
    }
    const deletedUser = await dbService.deleteDocumentById(dbModels.User, user._id.toString());
    if (!deletedUser) {
        res.status(404).send('User not found');
        return;
    }
    res.status(204).send();
}

async function updateUser(req: Request, res: Response) {
    const user = req.user as IUser;
    const userUpdate = req.body as Partial<IUser>;
    const updatedUser = await dbService.updateDocumentById(dbModels.User, user._id.toString(), userUpdate);
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
    const users = await dbService.getDocumentsByQuery(dbModels.User, { username: { $regex: username, $options: 'i' } });
    res.status(200).send(users.map(u => secureUser(u)));
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
    if (user.friends.includes(friend._id.toString())) {
        res.status(400).send('User is already your friend');
        return;
    }
    console.log(friend._id.toString(), user._id.toString());
    if (friend._id.toString() === user._id.toString()) {
        res.status(400).send('You cannot add yourself as a friend');
        return;
    }
    user.friends.push(friend._id.toString());
    await dbService.updateDocumentById(dbModels.User, user._id.toString(), user);
    await dbService.updateDocumentById(dbModels.User, friend._id.toString(), { $addToSet: { friends: user._id.toString() } });
    res.status(201).send(secureUser(friend, true));
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
    await dbService.updateDocumentById(dbModels.User, user._id.toString(), { $pull: { friends: friend._id.toString() } });
    await dbService.updateDocumentById(dbModels.User, friend._id.toString(), { $pull: { friends: user._id.toString() } });
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
