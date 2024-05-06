import dotenv from 'dotenv';
import * as env from 'env-var';

dotenv.config();

export const config = {
    port: env.get('PORT').default('3000').asPortNumber(),
    dbUri: env.get('DB_URI').required().asString(),
    whitelist: env.get('WHITELIST').required().asArray(),
    production: env.get('NODE_ENV').asString() === 'production'
};
