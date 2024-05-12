import { Component, EventEmitter, Output } from '@angular/core';
import { BackendService } from '../../services/backend.service';
import { IUser } from '../../../models/user';
import { MatCardModule } from '@angular/material/card';
import { IChat } from '../../../models/chat';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-chat-list',
    standalone: true,
    imports: [MatCardModule, MatDividerModule, CommonModule, FormsModule, MatButtonModule],
    templateUrl: './chat-list.component.html',
    styleUrl: './chat-list.component.css'
})
export class ChatListComponent {
    constructor(private backendService: BackendService) { }
    chats: IChat[] = [];
    friends: IUser[] = [];
    @Output() chatSelected = new EventEmitter<string>();
    newUser: string = '';
    searchedUsers: IUser[] = [];

    ngOnInit() {
        this.backendService.getFriends().subscribe((friends: IUser[]) => {
            this.friends = friends;
        });
        this.backendService.getMyChats().subscribe((chats: any) => {
            this.chats = chats;
        });
    }

    onSelectChat(chatId: string) {
        this.chatSelected.emit(chatId);
    }

    removeFriend(friendId: string) {
        this.backendService.deleteFriend(friendId).subscribe(() => {
            this.friends = this.friends.filter(f => f._id !== friendId);
        });
    }

    onAddUser(friendId: string) {
        this.backendService.addFriend(friendId).subscribe((friend: IUser) => {
            this.friends.push(friend);
        });
    }

    onSelectFriend(friendId: string) {
    }

    searchUser() {
        if (!this.newUser) {
            return;
        }
        this.backendService.getUserByName(this.newUser).subscribe((users: IUser[]) => {
            this.searchedUsers = users;
        });
    }
}
