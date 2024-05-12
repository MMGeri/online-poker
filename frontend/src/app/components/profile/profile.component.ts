import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { IUser } from '../../../models/user';
import { UserService } from '../../services/user.service';
import { MatDivider, MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [MatCardModule, MatDividerModule, MatDivider, MatButtonModule],
    templateUrl: './profile.component.html',
    styleUrl: './profile.component.css'
})
export class ProfileComponent {
    user: IUser | null = null;

    constructor(private userService: UserService) { }

    ngOnInit() {
        this.userService.getUser().subscribe((user: IUser | null) => {
            this.user = user;
        });
    }
}
