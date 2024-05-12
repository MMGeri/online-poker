import { Component, EventEmitter, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../services/user.service';
import { IUser } from '../../../models/user';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSidenavModule } from '@angular/material/sidenav';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [
        MatIconModule,
        RouterModule,
        CommonModule,
        MatDividerModule,
        MatTooltipModule
    ],
    templateUrl: './header.component.html',
    styleUrl: './header.component.css'
})
export class HeaderComponent {
    user!: IUser | null;
    @Output() openChatList = new EventEmitter<void>();

    constructor(private userService: UserService, private router: Router) { }

    ngOnInit() {
        this.userService.getUser().subscribe((user: IUser | null) => {
            this.user = user;
        });
    }

    onToggleChatList() {
        this.openChatList.emit();
    }

    logout() {
        this.userService.setUser(null);
        this.router.navigateByUrl('/login');
    }
}
