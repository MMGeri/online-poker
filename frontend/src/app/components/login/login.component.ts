import { Component } from '@angular/core';
import { BackendService } from '../../services/backend.service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user.service';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ChatSocketService } from '../../services/chat-socket.service';
import { getErrorMessage } from '../../utils/utils';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [FormsModule, RouterLink, CommonModule, MatButtonModule, MatInputModule, ReactiveFormsModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.css'
})
export class LoginComponent {
    // username: string = '';
    // password: string = '';
    loginForm!: FormGroup;
    errorMessage: string = '';

    constructor(
        private formBuilder: FormBuilder,
        private backendService: BackendService,
        private router: Router,
        private userService: UserService,
        private chatSocketService: ChatSocketService
    ) { }

    ngOnInit(): void {
        this.loginForm = this.formBuilder.group({
            username: ['', [Validators.required]],
            password: ['', [Validators.required]]
        });
    }


    login() {
        const username = this.loginForm.value.username;
        const password = this.loginForm.value.password;
        this.backendService.login(username, password).subscribe((response) => {
            this.router.navigate(['/home']);
            this.userService.setUser(response);
            this.chatSocketService.reconnect();
        }, (error) => {
            this.errorMessage = getErrorMessage(error);
        });
    }
}
