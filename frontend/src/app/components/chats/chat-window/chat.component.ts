import { Component, ElementRef, EventEmitter, Input, OnInit, Output, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { SocketIoService } from '../../../services/socket-io.service';
import { FormsModule } from '@angular/forms';
import { IMessage } from '../../../../../../backend/src/models/types';
import { BackendService } from '../../../services/backend.service';
import { UserService } from '../../../services/user.service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-chat',
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.css'],
    standalone: true,
    imports: [
        FormsModule,
        CommonModule,
        MatButtonModule
    ]
    // providers: [ChatService]
})
export class ChatComponent implements OnInit {

    message?: string;
    messages: IMessage[] = [];
    @Input() channel!: { chatId: string, chatName: string };
    @Input() channelName!: string;

    minimized: boolean = false;
    @Output() closeChat = new EventEmitter<string>();

    @ViewChildren('messageContainer') messageContainers!: QueryList<ElementRef>;

    constructor(
        private socketIoService: SocketIoService,
        private backendService: BackendService,
        private host: ElementRef<HTMLElement>,
        private userService: UserService
    ) { }

    ngAfterViewInit() {
        this.scrollToBottom(); // For messages already present
        this.messageContainers.changes.subscribe(() => {
            this.scrollToBottom(); // For messages added later
        });
    }

    ngOnInit() {
        this.userService.getUser().subscribe((user) => {
            if (!user) {
                this.onClose();
            }
        });
        this.backendService.getMessages(0, this.channel.chatId).subscribe((messages: IMessage[]) => {
            this.messages = messages;
        });
        this.socketIoService.joinChatChannel(this.channel.chatId);
        this.socketIoService.getMessages().subscribe((message: any) => {
            if (message.channelId === this.channel.chatId) {
                this.scrollToBottom();
                this.messages.push(message);
            }
        });
    }

    scrollToBottom(): void {
        const messageContainer = this.messageContainers.last;
        if (messageContainer) {
            messageContainer.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }

    trackByFn(index: number, item: any) {
        return item._id; // unique id corresponding to the item
    }

    sendMessage() {
        if (!this.message) {
            return;
        }
        this.socketIoService.sendMessage(this.message, this.channel.chatId);
        this.message = '';
    }

    leaveChat() {
        this.backendService.leaveChat(this.channel.chatId).subscribe(() => {
            this.closeChat.emit(this.channel.chatId);
            this.socketIoService.leaveChatChannel(this.channel.chatId);
        });
    }

    toggleMinimize() {
        this.minimized = !this.minimized;
    }

    onClose() {
        this.closeChat.emit(this.channel.chatId);
        this.host.nativeElement.remove();
    }

    ngOnDestroy() {
        this.socketIoService.leaveChatChannel(this.channel.chatId);
    }
}