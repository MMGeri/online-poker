import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router } from '@angular/router';
import { BackendService } from '../../services/backend.service';
import { IGame } from '../../../models/game';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { MatDivider } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { IUser } from '../../../models/user';
import { MatCheckbox } from '@angular/material/checkbox';
import { UserExistsValidator } from './user-exists.validator';

@Component({
    selector: 'app-upsert-game',
    standalone: true,
    imports: [
        MatListModule,
        MatIconModule, MatDivider,
        CommonModule, MatButtonModule,
        MatInputModule, ReactiveFormsModule, MatCardModule, MatCheckbox
    ],
    templateUrl: './upsert-game.component.html',
    styleUrl: './upsert-game.component.css'
})
export class UpsertGameComponent {
    gameForm: FormGroup = this.formBuilder.group({
        name: ['', Validators.required],
        options: this.formBuilder.group({
            whiteList: this.formBuilder.array([]),
            maxPlayers: [5, [Validators.required]],
            maxRaises: [4, [Validators.required]],
            isPublic: [true, [Validators.required]]
        })
    });
    game: IGame | null = null;
    gameId!: string | null;

    errorMessage = '';

    constructor(
        private backendService: BackendService,
        private route: ActivatedRoute,
        private formBuilder: FormBuilder,
        private router: Router,
        private userExistsValidator: UserExistsValidator) { }

    ngOnInit() {
        this.gameId = this.route.snapshot.paramMap.get('id');
        if (this.gameId) {
            this.backendService.getGameById(this.gameId).subscribe((game: IGame) => {
                this.game = game;
                this.gameForm = this.formBuilder.group({
                    name: [game.name, Validators.required],
                    options: this.formBuilder.group({
                        whiteList: this.formBuilder.array(game.options.whiteList.map((user) => (user as IUser).username)),
                        maxPlayers: [game.options.maxPlayers, [Validators.required, Validators.min(2), Validators.max(10)]],
                        maxRaises: [game.options.maxRaises, [Validators.required, Validators.min(1), Validators.max(10)]],
                        isPublic: [game.options.isPublic, [Validators.required]]
                    })
                });
            });
        }
        else {
            this.gameForm = this.formBuilder.group({
                name: ['', Validators.required],
                options: this.formBuilder.group({
                    whiteList: this.formBuilder.array([]),
                    maxPlayers: [5, [Validators.required]],
                    maxRaises: [4, [Validators.required]],
                    isPublic: [true, [Validators.required]]
                })
            });
        }
    }

    update() {
        const game = {
            name: this.gameForm.value.name,
            options: {
                whiteList: this.gameForm.value.options.whiteList,
                maxPlayers: this.gameForm.value.options.maxPlayers,
                maxRaises: this.gameForm.value.options.maxRaises,
                isPublic: this.gameForm.value.options.isPublic
            }
        };
        this.backendService.updateGame(this.gameId!, game).subscribe((game: IGame) => {
            this.router.navigateByUrl(`/game/${game._id}`);
        }, (error: any) => {
            this.errorMessage = error.error.message;
        });
    }

    create() {
        const game = {
            name: this.gameForm.value.name,
            options: {
                whiteList: this.gameForm.value.options.whiteList,
                maxPlayers: this.gameForm.value.options.maxPlayers,
                maxRaises: this.gameForm.value.options.maxRaises,
                isPublic: this.gameForm.value.options.isPublic
            }
        };
        this.backendService.createGame(game).subscribe((game: IGame) => {
            this.router.navigateByUrl(`/game/${game._id}`);
        }, (error: any) => {
            this.errorMessage = error.error;
        });
    }

    get whiteList() {
        return this.gameForm.get('options.whiteList') as FormArray<FormControl>;
    }

    removeFromWhiteList(index: number) {
        this.whiteList.removeAt(index);
    }

    addToWhiteList(username: string) {
        const item = new FormControl(
            username,
            [Validators.minLength(3), Validators.maxLength(20)],
            this.userExistsValidator.validate.bind(this) //doesnt seem to be working
        );
        this.whiteList.push(item);
        item.updateValueAndValidity();
    }
}
