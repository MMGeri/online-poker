import { Routes } from '@angular/router';
import { GamesBrowserComponent } from './components/games-browser/games-browser.component';
import { authGuard, gameGuard, gameOwnerGuard } from './auth.guard';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./components/login/login.component').then(c => c.LoginComponent)
    },
    {
        path: 'signup',
        loadComponent: () => import('./components/signup/signup.component').then(c => c.SignupComponent)
    },
    {
        path: 'home',
        component: GamesBrowserComponent
    },
    {
        path: 'game/:id',
        loadComponent: () => import('./components/game/game.component').then(c => c.GameComponent),
        canActivate: [authGuard, gameGuard]
    },
    {
        path: 'profile',
        loadComponent: () => import('./components/profile/profile.component').then(c => c.ProfileComponent),
        canActivate: [authGuard]
    },
    {
        path: 'my-games',
        loadComponent: () => import('./components/my-games/my-games.component').then(c => c.MyGamesComponent),
        canActivate: [authGuard]
    },
    {
        path: 'my-games/new-game',
        loadComponent: () => import('./components/upsert-game/upsert-game.component').then(c => c.UpsertGameComponent),
        canActivate: [authGuard]
    },
    {
        path: 'my-games/:id',
        loadComponent: () => import('./components/upsert-game/upsert-game.component').then(c => c.UpsertGameComponent),
        canActivate: [authGuard, gameOwnerGuard]
    },
    {
        path: '**',
        redirectTo: 'home'
    }
];
