import express from "express";

export type AsyncMiddleware = ( req: express.Request, res: express.Response, next: express.NextFunction  ) => Promise<any>;

export default function(callback: AsyncMiddleware) {
    return async function (
        req: express.Request, 
        res: express.Response, 
        next: express.NextFunction): Promise<void> {
        try {
            await callback(req, res, next);
        } catch(error) {
            next(error);
        }
    }
}