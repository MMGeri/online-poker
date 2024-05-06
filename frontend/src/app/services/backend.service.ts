import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class BackendService {
    private backendUrl = environment.backendUrl;

    constructor(private http: HttpClient) { }

    login(username: string, password: string) {
        return this.http.post(`${this.backendUrl}/login`, { username, password }, { withCredentials: true });
    }

    register(username: string, password: string) {
        return this.http.post(`${this.backendUrl}/register`, { username, password });
    }
}