import { CanActivateFn, Router } from '@angular/router';
import { BackendService } from './services/backend.service';
import { catchError, map, of } from 'rxjs';
import { inject } from '@angular/core';
import { UserService } from './services/user.service';
import { IGame } from '../../../backend/src/models/types';

export const authGuard: CanActivateFn = (route, state) => {
    const router = inject(Router);
    const userService = inject(UserService);
    return inject(BackendService).checkAuth().pipe(map(user => {
        if (!user) {
            userService.logout();
            return false;
        }
        userService.setUser(user);
        return true;
    }), catchError((error: any) => {
        userService.logout();
        return of(false);
    }));
};

export const gameGuard: CanActivateFn = (route, state) => {
    const router = inject(Router);
    const gameId = route.params['id'];
    let user = inject(UserService).user.value;
    if (!user) {
        router.navigateByUrl('/home');
        return of(false);
    }
    return inject(BackendService).getGameById(gameId).pipe(map((game: IGame) => {
        if (!game) {
            router.navigateByUrl('/home');
            return false;
        } else if (!(game.players as any)[user._id]) {
            router.navigateByUrl('/home');
            return false;
        }
        return true;
    }), catchError((error: any) => {
        router.navigateByUrl('/home');
        return of(false);
    }));
}

export const gameOwnerGuard: CanActivateFn = (route, state) => {
    const router = inject(Router);
    const gameId = route.params['id'];
    let user = inject(UserService).user.value;
    return inject(BackendService).getGameById(gameId).pipe(map((game: IGame) => {
        if (!game) {
            router.navigateByUrl('/home');
            return false;
        } else if (game.ownerId !== user?._id && user?.roles.indexOf('admin') === -1) {
            router.navigateByUrl('/home');
            return false;
        }
        return true;
    }), catchError((error: any) => {
        router.navigateByUrl('/home');
        return of(false);
    }));
}