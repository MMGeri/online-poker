import { Request, Response, NextFunction } from 'express';

export class BaseError extends Error {
    name: string;
    status: number;
    message: string;
    originatedFrom: string;

    constructor(name: string, status: number, message: string, originatedFrom: string) {
        super(message);
        this.name = name;
        this.status = status;
        this.message = message;
        this.originatedFrom = originatedFrom;
    }

    public getOriginatedFrom(): string {
        return this.originatedFrom;
    }
}

export class ErrorHandler {

    public async handleError(err: any, req: Request, res: Response, next?: NextFunction): Promise<Response | void> {
        console.error(err);
        if (err instanceof BaseError) {
            return this.sendErrorResponse(res, err.status, err.message, err.getOriginatedFrom());
        }
        if (err.errors) {
            return this.sendErrorResponse(res, err.status, err.errors);
        }
        this.sendErrorResponse(res, 500, 'Unexpected Error');
    }

    private async sendErrorResponse(res: Response, status: number, message: string, originatedFrom?: string | undefined) {
        return res.status(status).json({
            message: message,
            originatedFrom: originatedFrom || 'backend'
        });
    }
}
