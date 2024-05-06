import { Injectable } from '@angular/core';
import io from 'socket.io-client';
import { Observable } from 'rxjs';
import { Message } from '../../models/message';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ChatService {
    private socket = io(environment.backendUrl, { withCredentials: true });
    sendMessage(message: string, channelId: string) {
        this.socket.emit('new-message', { message, channelId });
    }

    getMessages() {
        let observable = new Observable<Message>(observer => {
            this.socket.on('new-message', (data) => {
                observer.next(data);
            });
            return () => { this.socket.disconnect(); };
        });
        return observable;
    }
}