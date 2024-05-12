import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ChatService } from '../../../services/chat.service';
import { FormsModule } from '@angular/forms';
import { IMessage } from '../../../../models/message';
import { BackendService } from '../../../services/backend.service';

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
    messages: IMessage[] = [];
    @Input() channelId!: string;

    minimized: boolean = false;
    @Output() closeChat = new EventEmitter<string>();

    constructor(private chatService: ChatService, private backendService: BackendService) { }

    ngOnInit() {
        this.backendService.getMessages(0, this.channelId).subscribe((messages: IMessage[]) => {
            this.messages = messages;
        });
        this.chatService.joinChannel(this.channelId);
        this.chatService.getMessages().subscribe((message: IMessage) => {
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

    leaveChat() {
        //TODO: this.backendService.leaveChat(this.channelId);
    }

    toggleMinimize() {
        this.minimized = !this.minimized;
    }

    onClose(chatId: string) {
        this.closeChat.emit(chatId);
    }
}