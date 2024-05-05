import { Component, OnInit } from '@angular/core';
import { ChatService } from '../chat.service';
import { FormsModule } from '@angular/forms';

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
    messages: string[] = [];

    constructor(private chatService: ChatService) { }

    ngOnInit() {
        this.chatService.getMessages().subscribe((value: {
            user: String;
            message: String;
        }) => {
            this.messages.push(`${value.user}: ${value.message}`);
        });
    }

    sendMessage() {
        this.chatService.sendMessage(this.message!);
        this.message = '';
    }
}