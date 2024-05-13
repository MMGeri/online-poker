import { Component } from '@angular/core';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { BackendService } from '../../services/backend.service';
import { MatTableModule } from '@angular/material/table';
import { MatCard } from '@angular/material/card';
import { MatSortModule } from '@angular/material/sort';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

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

    constructor(private backendService: BackendService, private router: Router) { }

    ngOnInit() {
        this.backendService.getMyGames().subscribe((games: any[]) => {
            this.games = games;
        }, (error) => {
            console.error(error);
        });
    }

    players(element: any) {
        return element.players.length;
    }

    deleteGame(gameId: string) {
        this.backendService.deletGame(gameId).subscribe(() => {
            this.games = this.games.filter(g => g._id !== gameId);
        });
    }

    joinGame(gameId: string) {
        this.backendService.joinGame(gameId).subscribe(() => {
            this.router.navigateByUrl(`/game/${gameId}`);
        }, (error: any) => {
            console.error(error);
        });
    }
}


// TODO: sort
// TODO: update chat? 