import { CanActivateFn, Router } from '@angular/router';
import { BackendService } from './services/backend.service';
import { catchError, map, of } from 'rxjs';
import { inject } from '@angular/core';
import { UserService } from './services/user.service';

export const authGuard: CanActivateFn = (route, state) => {
    const router = inject(Router);
    const userService = inject(UserService);
    return inject(BackendService).checkAuth().pipe(map(isAuthenticated => {
        if (!isAuthenticated) {
            router.navigateByUrl('/login');
            userService.setUser(null);
            return false;
        }
        return true;
    }), catchError((error: any) => {
        router.navigateByUrl('/login');
        userService.setUser(null);
        return of(false);
    }));
};

export const gameGuard: CanActivateFn = (route, state) => {
    return true;
}