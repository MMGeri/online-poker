import { createHash } from 'crypto';
import { PassportStatic } from 'passport';
import { Strategy } from 'passport-local';
import { User } from '../../models/user';
import { BaseError } from '../../api/middleware/error-handler';
import { dbService } from '../services/db.service';

export const configurePassport = (passport: PassportStatic): PassportStatic => {

    passport.serializeUser((user: Express.User, done) => {
        console.log('user is serialized.');
        done(null, user);
    });

    passport.deserializeUser((user: User, done) => {
        console.log('user is deserialized.');
        done(null, user);
    });

    passport.use('local', new Strategy(async (username: string, password: string, done: Function) => {
        const userFromDb: User[] = await dbService.getUsersByQuery({ username });
        if (checkPassword(password, userFromDb[0].hashedPassword)) {
            done(null, userFromDb[0]);
        } else {
            done(new BaseError('Unauthorized', 401, 'Invalid username or password', 'backend passport'));
        }
    }));

    return passport;
};

function checkPassword(password: string, hashedPassword: string): boolean {
    const incomingPasswordHashed = createHash('sha256').update(password).digest('hex');
    return incomingPasswordHashed === hashedPassword;
}
