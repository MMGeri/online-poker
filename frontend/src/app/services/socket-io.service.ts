import { Injectable } from '@angular/core';
import io from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class SocketIoService {
    private socket = io(environment.backendUrl, { withCredentials: true });

    constructor() {
        this.socket.on('connect_error', (error: any) => {
            if (error.description === 401) {
                this.disconnect();
            }
        });
    }

    joinChatChannel(channelId: string) {
        this.socket.emit('join-chat-channel', { channelId });
    }

    joinGameChannel(gameId: string) {
        this.socket.emit('join-game-channel', { gameId });
    }

    leaveChatChannel(channelId: string) {
        this.socket.emit('leave-chat-channel', { channelId });
    }

    leaveGameChannel(gameId: string) {
        this.socket.emit('leave-game-channel', { gameId });
    }

    sendMessage(message: string, channelId: string) {
        this.socket.emit('new-message', { message, channelId });
    }

    getMessages() {
        let observable = new Observable<any>(observer => {
            this.socket.on('new-message', (data) => {
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