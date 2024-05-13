import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { io } from 'socket.io-client';
import { Observable } from 'rxjs';
import { IGame } from '../../../../backend/src/models/types';
import { GameEvent, HybridEvent } from '../../../../backend/src/game-server/game-events.model';

@Injectable({
    providedIn: 'root'
})
export class GameSocketService {
    private socket = io(environment.backendUrl, { withCredentials: true });

    constructor(private router: Router) {
        this.socket.on('connect_error', (error: any) => {
            if (error.description === 401) {
                this.disconnect();
                this.router.navigateByUrl('/profile');
            }
        });
    }

    joinGameChannel(gameId: string) {
        this.socket.emit('join-game-channel', { gameId });
    }

    leaveGameChannel(gameId: string) {
        this.socket.emit('leave-game-channel', { gameId });
    }

    sendEvent(event: { inputEvent: GameEvent; gameId: string }) {
        this.socket.emit('game-event', event);
    }

    getEvents() {
        let observable = new Observable<{ event: GameEvent, gameState: IGame }>(observer => {
            this.socket.on('game-event', (data) => {
                observer.next(data);
            });
            return () => { this.socket.disconnect(); };
        });
        return observable;
    }

    reconnect() {
        this.socket.connect();
    }

    disconnect() {
        console.log('disconnecting');
        this.socket.disconnect();
    }
}