import { PassportStatic } from 'passport';
import { Strategy } from 'passport-local';
import { User } from '../../models/user';
import { BaseError } from '../../api/middleware/error-handler';

export const configurePassport = (passport: PassportStatic): PassportStatic => {

    passport.serializeUser((user: Express.User, done) => {
        console.log('user is serialized.');
        done(null, user);
    });

    passport.deserializeUser((user: Express.User, done) => {
        console.log('user is deserialized.');
        // Here you would typically fetch the user from your database
        // For simplicity, we'll just return a mock user TODO: Implement fetching user from database
        done(null, user);
    });

    passport.use('local', new Strategy((username: string, password: string, done: Function) => {
        if (username === 'test@test.com' && password === 'testpw') {
            done(null, new User(username, password));
        } else {
            throw new BaseError('Unauthorized', 401, 'Invalid username or password', 'backend passport');
        }
    }));

    return passport;
};
