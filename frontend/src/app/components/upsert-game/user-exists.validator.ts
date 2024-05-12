import { AbstractControl, AsyncValidator } from "@angular/forms";
import { BackendService } from "../../services/backend.service";
import { ValidationError } from "express-openapi-validator/dist/framework/types";
import { Observable, catchError, map, of } from "rxjs";
import { IUser } from "../../../models/user";
import { Injectable } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class UserExistsValidator implements AsyncValidator {

    errorMessage: string = '';
    constructor(private backendService: BackendService) { }

    validate(control: AbstractControl<any, any>): Observable<{ userDoesntExist: boolean} | null> {
        const username: string = control.value;
        return this.backendService.getUserByName(username).pipe(
            map((users: IUser[]) => {
                if (users && users.length > 0) {
                    this['errorMessage'] = '';
                    return null;
                }
                this['errorMessage'] = 'User does not exist'; //workaround :)
                return { userDoesntExist: true };
            }, catchError((error: any) => {
                this['errorMessage'] = 'Error checking if user exists'; //workaround :)
                return of({ userDoesntExist: true});
            })));
    }
}
