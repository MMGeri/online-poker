import jwt from 'jsonwebtoken';
import { config } from '../../config';

export function generateJWT(input: any) {
    const payload = {
        ...input,
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // Token expires in 1 hour
    };
    const token = jwt.sign(payload, config.socketChannelSecret);
    return token;
}

export function decodeJWT(token: string) {
    try {
        const decodedToken = jwt.verify(token, config.socketChannelSecret);
        return decodedToken;
    } catch (err: any) {
        return null;
    }
}
