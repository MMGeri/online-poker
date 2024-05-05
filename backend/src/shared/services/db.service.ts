import { FilterQuery, MongooseQueryOptions, ProjectionFields } from 'mongoose';
import * as models from '../../models/index';
import { User } from '../../models/user';
import { Game } from '../../models/game';
import { Message } from '../../models/message';

const maxTimeMs = 2000;

export const dbService = {
    getUsersByQuery(
        query: FilterQuery<typeof models.User>,
        projection?: ProjectionFields<typeof models.User>,
        options?: MongooseQueryOptions): Promise<User[]> {
        const users = models.User.find(query, projection, { maxTimeMs, ...options }).lean().exec();
        return users;
    },

    updateUserById(
        id: string,
        update: Partial<User>,
        options?: MongooseQueryOptions): Promise<User | null> {
        return models.User.findByIdAndUpdate(id, update, { maxTimeMs, ...options }).lean().exec();
    },

    createUser(user: Partial<User>): Promise<User> {
        return models.User.create(user);
    },

    deleteUserById(id: string): Promise<User | null> {
        return models.User.findByIdAndDelete(id, { maxTimeMs }).lean().exec();
    },

    getGamesByQuery(
        query: FilterQuery<typeof models.Game>,
        projection?: ProjectionFields<typeof models.Game>,
        options?: MongooseQueryOptions) {
        return models.Game.find(query, projection, { maxTimeMs, ...options }).lean().exec();
    },

    updateGameById(
        id: string,
        update: Partial<Game>,
        options?: MongooseQueryOptions) {
        return models.Game.findByIdAndUpdate(id, update, { maxTimeMs, ...options }).lean().exec();
    },

    createGame(game: Partial<Game>) {
        return models.Game.create(game);
    },

    deleteGameById(id: string) {
        return models.Game.findByIdAndDelete(id, { maxTimeMs }).lean().exec();
    },

    getMessagesByQuery(
        query: FilterQuery<typeof models.Message>,
        projection?: ProjectionFields<typeof models.Message>,
        options?: MongooseQueryOptions) {
        return models.Message.find(query, projection, { maxTimeMs, ...options }).lean().exec();
    },

    updateMessageById(
        id: string,
        update: Message,
        options?: MongooseQueryOptions) {
        return models.Message.findByIdAndUpdate(id, update, { maxTimeMs, ...options }).lean().exec();
    },

    createMessage(message: Message) {
        return models.Message.create(message, { maxTimeMs });
    },

    deleteMessageById(id: string) {
        return models.Message.findByIdAndDelete(id, { maxTimeMs }).lean().exec();
    }
};
