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
    openChats: { chatId: string, chatName: string }[] = [];

    addChat(event: { chatId: string, chatName: string }) {
        if (this.openChats.find(chat => chat.chatId === event.chatId)) {
            return;
        }
        this.openChats.push(event);
    }

    closeChat(chatId: any) {
        this.openChats = this.openChats.filter(chat => chat.chatId !== chatId);
    }
}
