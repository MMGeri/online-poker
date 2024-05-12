import { Component } from '@angular/core';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { BackendService } from '../../services/backend.service';
import { MatTableModule } from '@angular/material/table';
import { MatCard } from '@angular/material/card';
import { MatSortModule } from '@angular/material/sort';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-my-games',
    standalone: true,
    imports: [MatButtonModule, MatButton, MatTableModule, MatCard, MatSortModule, RouterLink, MatIconModule],
    templateUrl: './my-games.component.html',
    styleUrl: './my-games.component.css'
})
export class MyGamesComponent {
    displayedColumns: string[] = ['name', 'players', 'gameStarted', 'gameOver', 'pot', 'phase', 'round', 'edit', 'delete'];
    games: any[] = [];

    constructor(private backendService: BackendService) { }

    ngOnInit() {
        this.backendService.getMyGames().subscribe((games: any[]) => {
            this.games = games;
            console.log(games);
        }, (error) => {
            console.error(error);
        });
    }

    players(element: any) {
        return Object.keys(element.players).length;
    }

    deleteGame(gameId: string) {
        this.backendService.deletGame(gameId).subscribe(() => {
            this.games = this.games.filter(g => g._id !== gameId);
        });
    }
}
