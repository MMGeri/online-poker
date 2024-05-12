import { Router, RouterLink } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, Validators } from '@angular/forms';
import { BackendService } from '../../services/backend.service';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-signup',
    templateUrl: './signup.component.html',
    standalone: true,
    imports: [ReactiveFormsModule, CommonModule, MatInputModule, MatFormFieldModule, FormsModule, MatButtonModule],
    styleUrls: ['./signup.component.scss']
})
export class SignupComponent implements OnInit {

    signUpForm!: FormGroup;
    errorMessage: string = '';
    constructor(
        private formBuilder: FormBuilder,
        private router: Router,
        private backendService: BackendService
    ) { }

    ngOnInit(): void {
        this.signUpForm = this.formBuilder.group({
            username: ['', [Validators.required, Validators.minLength(4)]],
            password: ['', [Validators.required]],
            confirmPassword: ['', [Validators.required]]
        }, {
            validator: this.mustMatch('password', 'confirmPassword')
        });
    }

    mustMatch(controlName: string, matchingControlName: string) {
        return (formGroup: FormGroup) => {
            const control = formGroup.controls[controlName];
            const matchingControl = formGroup.controls[matchingControlName];

            if (matchingControl.errors && matchingControl.errors['mustMatch']) {
                return;
            }

            if (control.value !== matchingControl.value) {
                matchingControl.setErrors({ mustMatch: true });
            } else {
                matchingControl.setErrors(null);
            }
        }
    }

    onSubmit() {
        if (this.errorMessage) {
            return;
        }
        const username = this.signUpForm.value.username;
        const password = this.signUpForm.value.password;
        this.backendService.signUp(username!, password!).subscribe((response: any) => {
            this.router.navigateByUrl('/login');
        }, (error: any) => {
            this.errorMessage = 'Invalid form data. Please try again.'
        });
    }

    goToLogin() {
        this.router.navigateByUrl('/login');
    }

}