import { Component, ElementRef } from '@angular/core';
import { GameSocketService } from '../../services/game-socket.service';
import { Router } from '@angular/router';
import { ICard, IGame, IPlayer, IUser } from '../../../../../backend/src/models/types';
import { BackendService } from '../../services/backend.service';
import { GameEvent, HybridEventNameEnum, PrivateEventNameEnum } from '../../../../../backend/src/game-server/game-events.model';
import { ChatComponent } from '../chats/chat-window/chat.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-game',
  standalone: true,
    imports: [ChatComponent, FormsModule, CommonModule, MatButtonModule, MatInputModule],
  templateUrl: './game.component.html',
    styleUrl: './game.component.css',
    providers: [
        GameSocketService,
        ChatComponent
    ]
})
export class GameComponent {
    gameId!: string;
    user: IUser | null = null;
    player?: IPlayer;
    gameState: IGame | null = null;

    canRaise: boolean = false;
    canCall: boolean = false;
    canCheck: boolean = false;
    canFold: boolean = false;

    isPlayersTurn: boolean = false;
    canIready: boolean = false;
    canIstart: boolean = false;
    betAmount: number = 0;
    myCards: ICard[] = [];

    errorMessage: string = '';

    constructor(
        private gameSocketService: GameSocketService,
        private router: Router, private host: ElementRef,
        private backendService: BackendService,
        private userService: UserService
    ) { }

    ngOnInit() {
        this.gameId = window.location.pathname.split('/').pop() ?? '';
        if (!this.gameId) {
            this.router.navigateByUrl('/home');
            return;
        }
        this.gameSocketService.joinGameChannel(this.gameId);
        this.backendService.getGameById(this.gameId).subscribe((game: IGame) => {
            this.gameState = game;
        });
        this.gameSocketService.getEvents().subscribe((e: { event: GameEvent, gameState: IGame }) => {
            this.gameState = e.gameState;
            this.handleGameEvent(e.event);
            this.updateStuff();
        });
        this.userService.getUser().subscribe((user) => {
            this.user = user ?? this.user;
        });
        this.gameSocketService.sendEvent({
            inputEvent: {
                name: HybridEventNameEnum.USER_CONNECTED,
                userId: this.user!._id,
            }, gameId: this.gameId
        });
        setTimeout(() => {
            this.updateStuff();
        }, 1000);
    }

    ngOnDestroy() {
        this.gameSocketService.sendEvent({
            inputEvent: {
                name: HybridEventNameEnum.USER_DISCONNECTED,
                userId: this.user!._id,
            }, gameId: this.gameId
        });
        this.gameSocketService.disconnect();
        this.host.nativeElement.remove();
    }

    get MyCards() {
        return JSON.stringify(this.myCards, null, 2);
    }

    get GameState() {
        return JSON.stringify(this.gameState, null, 2);
    }

    updateStuff() {
        const user = this.user!;
        this.player = this.gameState?.players.find((p) => p.userId === user._id);

        this.isPlayersTurn = this.gameState?.playerTurn === this.player?.positionAtTable;
        const gameStarted = this.gameState?.gameStarted === true;
        this.canIready = this.player?.ready === false && !gameStarted;
        this.canIstart = this.gameState?.ownerId === user._id && !gameStarted && !this.gameState.gameOver;

        this.canFold = this.player?.folded === false;
        this.canRaise = this.player?.folded === false &&
            this.player?.inGameBalance > this.getHighestBet();
        this.canCall = this.player?.folded === false &&
            this.player?.inGameBalance === this.getHighestBet();
        this.canCheck = !this.player?.folded === false &&
            (this.player.inGameBalance === this.getHighestBet() || this.player.tapped);

        this.canFold = this.canFold && this.isPlayersTurn && gameStarted;
        this.canRaise = this.canRaise && this.isPlayersTurn && gameStarted;
        this.canCall = this.canCall && this.isPlayersTurn && gameStarted;
        this.canCheck = this.canCheck && this.isPlayersTurn && gameStarted;
    }

    ready() {
        this.gameSocketService.sendEvent({
            inputEvent: {
                name: HybridEventNameEnum.USER_READY,
                userId: this.user!._id,
            }, gameId: this.gameId
        });
    }

    startGame() {
        this.gameSocketService.sendEvent({
            inputEvent: {
                name: HybridEventNameEnum.START_GAME,
                userId: this.user!._id,
            }, gameId: this.gameId
        });
    }

    fold() {
        this.gameSocketService.sendEvent({
            inputEvent: {
                name: HybridEventNameEnum.USER_FOLDED,
                userId: this.user!._id,
            }, gameId: this.gameId
        });
    }

    call() {
        this.gameSocketService.sendEvent({
            inputEvent: {
                name: HybridEventNameEnum.USER_CALLED,
                userId: this.user!._id,
            }, gameId: this.gameId
        });
    }

    raise() {
        this.gameSocketService.sendEvent({
            inputEvent: {
                name: HybridEventNameEnum.USER_RAISED,
                userId: this.user!._id,
                amount: this.betAmount,
            }, gameId: this.gameId
        });
    }

    check() {
        this.gameSocketService.sendEvent({
            inputEvent: {
                name: HybridEventNameEnum.USER_CHECKED,
                userId: this.user!._id,
            }, gameId: this.gameId
        });
    }

    handleGameEvent(event: GameEvent) {
        switch (event.name) {
            case PrivateEventNameEnum.CARDS_DEALT:
                this.myCards = event.cards!;
                break;
            case PrivateEventNameEnum.INSUFFICIENT_BALANCE:
                this.errorMessage = 'Insufficient balance';
                setTimeout(() => {
                    this.errorMessage = '';
                }, 5000);
                break;
            default:
                break;
        }
    }

    getHighestBet() {
        return this.gameState?.players.reduce((max, p) => Math.max(max, p.bet), 0) || 0;
    }
}
