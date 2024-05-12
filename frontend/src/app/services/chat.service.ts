import { Injectable } from '@angular/core';
import io from 'socket.io-client';
import { Observable } from 'rxjs';
import { IMessage } from '../../models/message';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ChatService {
    private socket = io(environment.backendUrl, { withCredentials: true });

    joinChannel(channelId: string) {
        this.socket.emit('join-chat-channel', { channelId });
    }

    sendMessage(message: string, channelId: string) {
        this.socket.emit('new-message', { message, channelId });
    }

    getMessages() {
        let observable = new Observable<IMessage>(observer => {
            this.socket.on('new-message', (data) => {
                observer.next(data);
            });
            return () => { this.socket.disconnect(); };
        });
        return observable;
    }
}