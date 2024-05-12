import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { IGame } from '../../../models/game';
import { CommonModule } from '@angular/common';
import { BackendService } from '../../services/backend.service';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';

@Component({
    selector: 'app-games-browser',
    standalone: true,
    imports: [FormsModule, MatCardModule, CommonModule, MatCardModule, MatDividerModule, MatButtonModule],
    templateUrl: './games-browser.component.html',
    styleUrl: './games-browser.component.css'
})
export class GamesBrowserComponent {

    games: IGame[] = [];
    searchTerm: string = '';

    constructor(private backendService: BackendService, private router: Router) { }

    ngOnInit() {
        this.backendService.getGames().subscribe((games: IGame[]) => {
            this.games = games;
        }, (error) => {
            console.error(error);
        });
    }

    joinGame(gameId: string) {
        this.backendService.joinGame(gameId).subscribe(() => {
            this.router.navigateByUrl(`/game/${gameId}`);
        }, (error: any) => {
            console.error(error);
        });
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
