import { Component } from '@angular/core';
import { NavigationStart, Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from './partial-components/header/header.component';
import { ChatComponent } from './components/chats/chat-window/chat.component';
import { LoginComponent } from './components/login/login.component';
import { MatSidenavModule } from '@angular/material/sidenav';
import { ChatListComponent } from './partial-components/chat-list/chat-list.component';
import { IUser } from '../models/user';
import { UserService } from './services/user.service';
import { CommonModule } from '@angular/common';
import { ChatsContainerComponent } from './components/chats/chats-container/chats-container.component';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [
        RouterOutlet,
        ChatComponent,
        LoginComponent,
        HeaderComponent,
        MatSidenavModule,
        ChatListComponent,
        CommonModule,
        ChatsContainerComponent
    ],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css'
})
export class AppComponent {
    title = 'Poker Géjmz';
    showHead = true;
    chatListOpen = false;
    user: IUser | null = null;

    constructor(private userService: UserService) { }

    ngOnInit() {
        this.userService.getUser().subscribe((user: IUser | null) => {
            this.user = user;
        });
    }

    openChatList(event: any) {
        this.chatListOpen = !this.chatListOpen;
    }
}
