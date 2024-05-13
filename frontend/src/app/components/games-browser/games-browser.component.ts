import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { IGame, IUser } from '../../../../../backend/src/models/types';
import { CommonModule } from '@angular/common';
import { BackendService } from '../../services/backend.service';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { UserService } from '../../services/user.service';
import { getErrorMessage } from '../../utils/utils';

@Component({
    selector: 'app-games-browser',
    standalone: true,
    imports: [FormsModule, MatCardModule, MatInputModule, CommonModule, MatCardModule, MatDividerModule, MatButtonModule],
    templateUrl: './games-browser.component.html',
    styleUrl: './games-browser.component.css'
})
export class GamesBrowserComponent {

    games: IGame[] = [];
    searchTerm: string = '';
    user: IUser | null = null;
    errorMessage: string = '';

    constructor(private backendService: BackendService, private router: Router, private userService: UserService) { }

    ngOnInit() {
        this.userService.getUser().subscribe((user) => {
            this.user = user;
        });
        this.backendService.getGames().subscribe((games: IGame[]) => {
            this.games = games;
        }, (error) => {
            console.error(error);
        });
    }

    editGame(gameId: string) {
        this.router.navigateByUrl(`/my-games/${gameId}`);
    }

    deleteGame(gameId: string) {
        this.backendService.deletGame(gameId).subscribe(() => {
            this.games = this.games.filter((game) => game._id !== gameId);
        }, (error) => {
            console.error(error);
        });
    }

    joinGame(gameId: string) {
        this.backendService.joinGame(gameId).subscribe(() => {
            this.router.navigateByUrl(`/game/${gameId}`);
        }, (error: any) => {
            this.errorMessage = getErrorMessage(error);
            setTimeout(() => {
                this.errorMessage = '';
            }, 5000);
        });
    }

    rejoinGame(gameId: string) {
        this.router.navigateByUrl(`/game/${gameId}`);
    }

    leaveGame(gameId: string) {
        this.backendService.leaveGame(gameId).subscribe(() => {
            this.games = this.games.map((game) => {
                if (game._id === gameId && this.user) {
                    game.players.delete(this.user._id);
                    game.options.whiteList = game.options.whiteList.filter((user) => user !== this.user?._id);
                }
                return game;
            });
        }, (error: any) => {
            this.errorMessage = getErrorMessage(error);
            setTimeout(() => {
                this.errorMessage = '';
            }, 5000);
        });
    }

    userInGame(game: IGame) {
        if (!this.user) {
            return false;
        }
        return (game.players as any)[this.user._id] !== undefined;
    }

    searchGames() {
        this.backendService.getGameBySearchTerm(this.searchTerm).subscribe((games: IGame[]) => {
            this.games = games.filter((game) => game.name.includes(this.searchTerm));
        }, (error) => {
            console.error(error);
        });
    }

    players(game: IGame) {
        return Object.keys(game.players).length;
    }
}
