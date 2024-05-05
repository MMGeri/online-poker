import { Injectable } from '@angular/core';
import io from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ChatService {
    private socket = io('http://localhost:3000');

    sendMessage(message: string) {
        this.socket.emit('new-message', message);
    }

    getMessages() {
        let observable = new Observable<{ user: String, message: String }>(observer => {
            this.socket.on('new-message', (data) => {
                observer.next(data);
            });
            return () => { this.socket.disconnect(); };
        });
        return observable;
    }
}