import mongoose from 'mongoose';
import { config } from './config';
// import * as models from './models'; // create schemas
import { BaseError } from './api/middleware/error-handler';

async function connect() {
    const connection = {
        uri: config.dbUri,
        options: {
            dbName: 'poker'
        }
    };
    if (mongoose.connection.readyState === 0) {
        try {
            await mongoose.connect(connection.uri, connection.options);
            mongoose.connection.on('disconnected', () => {
                console.error('Connection lost to MongoDB.');
            });
        } catch (err) {
            console.error('MongoDB connection error:', err);
            setTimeout(connect, 5000);
        }
    }
}

async function disconnect() {
    if (mongoose.connection.readyState === 1) {
        await mongoose.disconnect();
    }
}

export {
    connect,
    disconnect
};
