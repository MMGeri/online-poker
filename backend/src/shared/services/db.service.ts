import { FilterQuery, MongooseQueryOptions, ProjectionFields, UpdateQuery } from 'mongoose';
import { ChannelModel, GameModel, IChannel, IGame, IMessage, IUser, MessageModel, UserModel } from '../../models';

export enum dbModels {
    User = 'User',
    Game = 'Game',
    Message = 'Message',
    Channel = 'Channel'
}

type ModelType<T> = T extends dbModels.User ? typeof UserModel :
    T extends dbModels.Game ? typeof GameModel :
    T extends dbModels.Message ? typeof MessageModel :
    T extends dbModels.Channel ? typeof ChannelModel :
    never;

type InterfaceType<T> = T extends typeof UserModel ? IUser :
    T extends typeof GameModel ? IGame :
    T extends typeof MessageModel ? IMessage :
    T extends typeof ChannelModel ? IChannel :
    never;

function getModel<T extends dbModels>(model: T) {
    switch (model) {
        case dbModels.User:
            return UserModel;
        case dbModels.Game:
            return GameModel;
        case dbModels.Message:
            return MessageModel;
        case dbModels.Channel:
            return ChannelModel;
    }
    throw new Error('Invalid model');
}

export const dbService = {
    getDocumentById<T extends dbModels>(model: T, _id: string): Promise<InterfaceType<ModelType<T>> | null> {
        // @ts-expect-error - it's fine
        return getModel(model).findById(_id).exec();
    },

    // generic methods
    getDocumentsByQuery<T extends dbModels>(
        model: T,
        query?: FilterQuery<ModelType<T>>,
        page?: number,
        projection?: ProjectionFields<ModelType<T>>,
        options?: MongooseQueryOptions
    ): Promise<InterfaceType<ModelType<T>>[]> {
        const Model = getModel(model);
        // @ts-expect-error - it's fine
        let queryBuilder = Model.find(query, projection, options);
        if (page !== undefined) {
            queryBuilder = queryBuilder.skip(page * 10).limit(10);
        }
        return queryBuilder.exec();
    },

    updateDocumentById<T extends dbModels>(
        model: T,
        _id: string,
        update: UpdateQuery<Partial<InterfaceType<ModelType<T>>>>,
        options?: MongooseQueryOptions
    ): Promise<InterfaceType<ModelType<T>> | null> {
        // @ts-expect-error - it's fine
        return getModel(model).findByIdAndUpdate(_id, update, { new: true, ...options }).exec();
    },

    createDocument<T extends dbModels>(
        model: T,
        document: Partial<InterfaceType<ModelType<T>>>
    ): Promise<InterfaceType<ModelType<T>>> {
        // @ts-expect-error - it's fine
        return getModel(model).create(document);
    },

    deleteDocumentById<T extends dbModels>(
        model: T,
        _id: string
    ): Promise<InterfaceType<ModelType<T>> | null> {
        // @ts-expect-error - it's fine
        return getModel(model).findByIdAndDelete(_id).exec();
    },

    deleteDocumentsByIds<T extends dbModels>(
        model: T,
        _ids: string[]
    ): Promise<InterfaceType<ModelType<T>>[]> {
        // @ts-expect-error - it's fine
        return getModel(model).deleteMany({ _id: { $in: _ids } }).exec();
    },

    deleteDocumentsByQuery<T extends dbModels>(
        model: T,
        query: FilterQuery<ModelType<T>>
    ): Promise<InterfaceType<ModelType<T>>[]> {
        // @ts-expect-error - it's fine
        return getModel(model).deleteMany(query).exec();
    }
};
