import { Injectable } from '@angular/core';
import { IUser } from '../../../../backend/src/models/types';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { SocketIoService } from './socket-io.service';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    user: BehaviorSubject<IUser | null> = new BehaviorSubject<IUser | null>(null);

    constructor(private router: Router, private socketIoService: SocketIoService) {
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

    logout() {
        this.setUser(null);
        this.router.navigateByUrl('/login');
        this.socketIoService.disconnect();
    }
}
