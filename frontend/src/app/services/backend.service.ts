import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IMessage } from '../../../../backend/src/models/types';
import { IGame, IUser, IChannel } from '../../../../backend/src/models/types';
import axios from 'axios';

@Injectable({
    providedIn: 'root'
})
export class BackendService {
    signUp(username: string, password: string) {
        return this.http.post(`${this.backendUrl}/signup`, { username, password });
    }
    private backendUrl = environment.backendUrl;

    constructor(private http: HttpClient) { }

    login(username: string, password: string): Observable<any> {
        return this.http.post(`${this.backendUrl}/login`, { username, password }, { withCredentials: true });
    }

    logout() {
        return this.http.get(`${this.backendUrl}/logout`, { withCredentials: true });
    }

    register(username: string, password: string) {
        return this.http.post(`${this.backendUrl}/register`, { username, password });
    }

    getUserByName(username: string): Observable<IUser[]> {
        // return this.http.get<IUser[]>(`${this.backendUrl}/users`, { params: { username }, withCredentials: true });
        return new Observable((observer) => {
            axios.get(`${this.backendUrl}/users`, { params: { username }, withCredentials: true }).then((response) => {
                observer.next(response.data);
            }).catch((error) => {
                observer.error(error);
            });
        });
    }

    getUserById(userId: string): Observable<IUser> {
        return this.http.get<IUser>(`${this.backendUrl}/user/${userId}`, { withCredentials: true });
    }

    // -- friends

    getFriends(): Observable<IUser[]> {
        return this.http.get<IUser[]>(`${this.backendUrl}/friends`, { withCredentials: true });
    }

    deleteFriend(friendId: string) {
        return this.http.delete(`${this.backendUrl}/friends`, { params: { friendId }, withCredentials: true });
    }

    addFriend(friendId: string) {
        return this.http.post<IUser>(`${this.backendUrl}/friends`, { friendId }, { withCredentials: true });
    }

    checkAuth() {
        return this.http.get<IUser>(`${this.backendUrl}/checkAuth`, { withCredentials: true });
    }

    // --- Games

    getGameBySearchTerm(searchTerm: string, page: number = 0): Observable<IGame[]> {
        // return this.http.get<IGame[]>(`${this.backendUrl}/games`, { params: { name: searchTerm, page } });
        return new Observable((observer) => {
            axios.get(`${this.backendUrl}/games`, { params: { name: searchTerm, page } }).then((response) => {
                observer.next(response.data);
            }).catch((error) => {
                observer.error(error);
            });
        });
    }

    getGameById(gameId: string): Observable<IGame> {
        return this.http.get<IGame>(`${this.backendUrl}/game`, { params: { gameId }, withCredentials: true });
    }

    getGames(page: number = 0): Observable<IGame[]> {
        return this.http.get<IGame[]>(`${this.backendUrl}/games`);
    }

    createGame(game: Partial<IGame>): Observable<IGame> {
        return this.http.post<IGame>(`${this.backendUrl}/game`, game, { withCredentials: true });
    }

    updateGame(gameId: string, game: Partial<IGame>): Observable<IGame> {
        return this.http.put<IGame>(`${this.backendUrl}/game`, game, { params: { gameId }, withCredentials: true });
    }

    getMyGames(): Observable<IGame[]> {
        return this.http.get<IGame[]>(`${this.backendUrl}/games`, { params: { myGames: true }, withCredentials: true });
    }

    deletGame(gameId: string) {
        return this.http.delete(`${this.backendUrl}/game`, { params: { gameId }, withCredentials: true });
    }

    joinGame(gameId: string) {
        return this.http.get<any>(`${this.backendUrl}/game/join`, { params: { gameId }, withCredentials: true });
    }

    inviteToGame(gameId: string, userId: string) {
        return this.http.post<{token: string}>(`${this.backendUrl}/game/invite`, {}, { params: { gameId, userId }, withCredentials: true });
    }

    // --- Chat
    getMyChats(): Observable<IChannel[]> {
        return this.http.get<IChannel[]>(`${this.backendUrl}/chats`, { withCredentials: true });
    }
    getMessages(page: number, channelId: string): Observable<IMessage[]> {
        return this.http.get<IMessage[]>(`${this.backendUrl}/chat/messages`, { params: { page, channelId }, withCredentials: true });
    }
    createChat(chat: Partial<IChannel>): Observable<IChannel> {
        return this.http.post<IChannel>(`${this.backendUrl}/chat`, chat, { withCredentials: true });
    }
    deleteChat(channelId: string) {
        return this.http.delete(`${this.backendUrl}/chat`, { params: { channelId }, withCredentials: true });
    }
    leaveChat(channelId: string) {
        return this.http.get(`${this.backendUrl}/chat/leave`, { params: { channelId }, withCredentials: true });
    }
}