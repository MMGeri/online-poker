import { Component } from '@angular/core';
import { BackendService } from '../services/backend.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.css'
})
export class LoginComponent {
    username: string = '';
    password: string = '';

    constructor(private backendService: BackendService) { }

    login() {
        this.backendService.login(this.username, this.password).subscribe((response) => {
            console.log(response);
        });
    }

}
