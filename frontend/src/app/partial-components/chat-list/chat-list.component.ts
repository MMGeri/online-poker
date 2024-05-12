import { Component, EventEmitter, Output } from '@angular/core';
import { BackendService } from '../../services/backend.service';
import { IUser } from '../../../models/user';
import { MatCardModule } from '@angular/material/card';
import { IChat } from '../../../models/chat';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { UserService } from '../../services/user.service';
import { IGame } from '../../../models/game';
import { MatSelectModule } from '@angular/material/select';

@Component({
    selector: 'app-chat-list',
    standalone: true,
    imports: [MatCardModule, MatDividerModule, CommonModule, FormsModule, MatButtonModule, MatSelectModule, FormsModule],
    templateUrl: './chat-list.component.html',
    styleUrl: './chat-list.component.css'
})
export class ChatListComponent {
    constructor(private backendService: BackendService, private userService: UserService) { }
    chats: IChat[] = [];
    friends: IUser[] = [];
    @Output() chatSelected = new EventEmitter<{chatId: string, chatName: string}>();
    newUser: string = '';
    searchedUsers: IUser[] = [];

    user: IUser | null = null;
    myGames: IGame[] = [];

    ngOnInit() {
        this.backendService.getFriends().subscribe((friends: IUser[]) => {
            this.friends = friends;
        });
        this.backendService.getMyChats().subscribe((chats: any) => {
            this.chats = chats;
        });
        this.backendService.getMyGames().subscribe((games: IGame[]) => {
            this.myGames = games;
        });
        this.userService.getUser().subscribe((user: IUser | null) => {
            this.user = user;
        });
    }

    onSelectChat(chatId: string, chatName: string) {
        this.chatSelected.emit({ chatId, chatName });
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
        // create chat if it doesnt already exist or open it
        const chat = this.chats.find(c => c.whiteList.includes(friendId) && c.whiteList.length === 2);
        if (chat) {
            this.onSelectChat(chat._id, chat.name);
        } else if (this.user) {
            const friend = this.friends.find(f => f._id === friendId)!;
            this.backendService.createChat(
                {
                    name: `${friend?.username}&${this.user.username}`,
                    ownerId: this.user._id,
                    standalone: true,
                    whiteList: [this.user._id, friend._id]
                }
            ).subscribe((chat: IChat) => {
                this.chats.push(chat);
            });
        }
    }

    leaveChat(chatId: string) {
        this.backendService.leaveChat(chatId).subscribe(() => {
            this.chats = this.chats.filter(c => c._id !== chatId);
        });
    }

    removeChat(chatId: string) {
        this.backendService.deleteChat(chatId).subscribe(() => {
            this.chats = this.chats.filter(c => c._id !== chatId);
        });
    }

    searchUser() {
        if (!this.newUser) {
            return;
        }
        this.backendService.getUserByName(this.newUser).subscribe((users: IUser[]) => {
            this.searchedUsers = users;
        });
    }

    inviteToGame(gameId: string, friendId: string) {
        // create chat and send message? 
        this.backendService.inviteToGame(gameId, friendId).subscribe((token: string) => {
            console.log('Invited to game', token);
        });
    }
}
