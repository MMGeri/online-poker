import { FilterQuery, MongooseQueryOptions, ProjectionFields } from 'mongoose';
import { UserModel, IUser } from '../../models/user';
import { GameModel, IGame } from '../../models/game';
import { MessageModel, IMessage } from '../../models/message';
import { ChannelModel, IChannel } from '../../models/channel';

const maxTimeMs = 2000;

export const dbService = {
    getUsersByQuery(
        query: FilterQuery<typeof UserModel>,
        projection?: ProjectionFields<typeof UserModel>,
        options?: MongooseQueryOptions): Promise<IUser[]> {
        const users = UserModel.find(query, projection, { maxTimeMs, ...options }).lean().exec();
        return users;
    },

    updateUserById(
        id: string,
        update: Partial<IUser>,
        options?: MongooseQueryOptions): Promise<IUser | null> {
        return UserModel.findByIdAndUpdate(id, update, { maxTimeMs, ...options }).lean().exec();
    },

    createUser(user: Partial<IUser>): Promise<IUser> {
        return UserModel.create(user);
    },

    deleteUserById(id: string): Promise<IUser | null> {
        return UserModel.findByIdAndDelete(id, { maxTimeMs }).lean().exec();
    },

    getGamesByQuery(
        query: FilterQuery<typeof GameModel>,
        projection?: ProjectionFields<typeof GameModel>,
        options?: MongooseQueryOptions) {
        return GameModel.find(query, projection, { maxTimeMs, ...options }).lean().exec();
    },

    updateGameById(
        id: string,
        update: Partial<IGame>,
        options?: MongooseQueryOptions) {
        return GameModel.findByIdAndUpdate(id, update, { maxTimeMs, ...options }).lean().exec();
    },

    createGame(game: Partial<IGame>) {
        return GameModel.create(game);
    },

    deleteGameById(id: string) {
        return GameModel.findByIdAndDelete(id, { maxTimeMs }).lean().exec();
    },

    getMessagesByQuery(
        query: FilterQuery<typeof MessageModel>,
        projection?: ProjectionFields<typeof MessageModel>,
        options?: MongooseQueryOptions) {
        return MessageModel.find(query, projection, { maxTimeMs, ...options }).lean().exec();
    },

    updateMessageById(
        id: string,
        update: IMessage,
        options?: MongooseQueryOptions) {
        return MessageModel.findByIdAndUpdate(id, update, { maxTimeMs, ...options }).lean().exec();
    },

    createMessage(message: IMessage) {
        return MessageModel.create(message, { maxTimeMs });
    },

    deleteMessageById(id: string) {
        return MessageModel.findByIdAndDelete(id, { maxTimeMs }).lean().exec();
    },

    getChannelsByQuery(
        query: FilterQuery<typeof ChannelModel>,
        projection?: ProjectionFields<typeof ChannelModel>,
        options?: MongooseQueryOptions) {
        return ChannelModel.find(query, projection, { maxTimeMs, ...options }).lean().exec();
    },

    updateChannelById(
        id: string,
        update: Partial<IChannel>,
        options?: MongooseQueryOptions) {
        return ChannelModel.findByIdAndUpdate(id, update, { maxTimeMs, ...options }).lean().exec();
    },

    createChannel(channel: Partial<IChannel>) {
        return ChannelModel.create(channel);
    },

    deleteChannelById(id: string) {
        return ChannelModel.findByIdAndDelete(id, { maxTimeMs }).lean().exec();
    }
};
