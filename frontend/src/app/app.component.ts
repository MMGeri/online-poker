import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './partial-components/header/header.component';
import { ChatComponent } from './components/chats/chat-window/chat.component';
import { LoginComponent } from './components/login/login.component';
import { MatSidenavModule } from '@angular/material/sidenav';
import { ChatListComponent } from './partial-components/chat-list/chat-list.component';
import { IUser } from '../../../backend/src/models/types';
import { UserService } from './services/user.service';
import { CommonModule } from '@angular/common';
import { ChatsContainerComponent } from './components/chats/chats-container/chats-container.component';
import { BehaviorSubject, Observable } from 'rxjs';

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
    chatListOpen: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    chatListOpenBool: boolean = false;
    user: IUser | null = null;

    constructor(private userService: UserService) { }

    ngOnInit() {
        this.userService.getUser().subscribe((user: IUser | null) => {
            this.user = user;
        });
    }

    openChatList(event: any) {
        this.chatListOpenBool = !this.chatListOpenBool;
        this.chatListOpen.next(this.chatListOpenBool);
    }
}
