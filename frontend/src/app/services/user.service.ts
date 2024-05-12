import { Injectable } from '@angular/core';
import { IUser } from '../../models/user';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    user: BehaviorSubject<IUser | null> = new BehaviorSubject<IUser | null>(null);

    constructor() {
        const user = localStorage.getItem('user');
        if (user) {
            this.user.next(JSON.parse(user));
        }
    }

    setUser(user: IUser | null) {
        this.user.next(user);
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            localStorage.removeItem('user');
        }
    }

    getUser() {
        return this.user.asObservable();
    }
}
