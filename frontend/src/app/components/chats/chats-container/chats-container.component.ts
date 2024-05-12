import { Component, Input } from '@angular/core';
import { ChatComponent } from '../chat-window/chat.component';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-chats-container',
    standalone: true,
    imports: [ChatComponent, CommonModule],
    templateUrl: './chats-container.component.html',
    styleUrl: './chats-container.component.css'
})
export class ChatsContainerComponent {
    openChats: string[] = [];

    addChat(chatId: string) {
        if (this.openChats.includes(chatId)) {
            return;
        }
        this.openChats.push(chatId);
    }

    closeChat(chatId: any) {
        this.openChats = this.openChats.filter(id => id !== chatId);
    }
}
