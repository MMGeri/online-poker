import { createHash } from 'crypto';
import { PassportStatic } from 'passport';
import { Strategy } from 'passport-local';
import { IUser } from '../../models/types/user';
import { BaseError } from '../../api/middleware/error-handler';
import { dbModels, dbService } from '../services/db.service';

export const configurePassport = (passport: PassportStatic): PassportStatic => {

    passport.serializeUser((user: Express.User, done) => {
        if (!user || !(user as IUser)._id) {
            done(new BaseError('Unauthorized', 401, 'Invalid username or password', 'backend passport'));
            return;
        }
        done(null, (user as IUser)._id);
    });

    passport.deserializeUser((_id: string, done) => {
        dbService.getDocumentById(dbModels.User, _id).then((user: IUser | null) => {
            done(null, user);
        });
    });

    passport.use('local', new Strategy(async (username: string, password: string, done: Function) => {
        if (!username) {
            done(new BaseError('Unauthorized', 401, 'Invalid username or password', 'backend passport'));
            return;
        }
        const userFromDb: IUser[] = await dbService.getDocumentsByQuery(dbModels.User, { username });
        if (userFromDb.length === 0) {
            done(new BaseError('Unauthorized', 401, 'Invalid username or password', 'backend passport'));
            return;
        }
        const hasRoles = userFromDb[0].roles.length > 0;
        if (checkPassword(password, userFromDb[0].hashedPassword) && hasRoles) {
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
