import { Component, Input, OnInit } from '@angular/core';
import { ChatService } from '../services/chat.service';
import { FormsModule } from '@angular/forms';
import { Message } from '../../models/message';

@Component({
    selector: 'app-chat',
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.css'],
    standalone: true,
    imports: [
        FormsModule
    ]
})
export class ChatComponent implements OnInit {

    message?: string;
    messages: Message[] = [];
    @Input() channelId!: string;

    constructor(private chatService: ChatService) { }

    ngOnInit() {
        this.chatService.getMessages().subscribe((message: Message) => {
            this.messages.push(message);
        });
    }

    sendMessage() {
        if (!this.message) {
            return;
        }
        this.chatService.sendMessage(this.message, this.channelId);
        this.message = '';
    }
}