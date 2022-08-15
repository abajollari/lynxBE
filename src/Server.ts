import express, { json } from "express";
import cors from "cors";
import helmet from "helmet";
import bodyParser from "body-parser";
import HttpError, { StatusCode } from "./excptions/HttpError";
import app_logger from "./logger/index";

export function createServer(routes: express.Router) {
    const app: express.Application = express();
    /**
     * Middlewares
    */

    app.use(cors());
    app.use(helmet());
    app.use(express.urlencoded({ extended: false }));
    app.use(express.json());

    // app.options('*', cors) // include before other routes

    // app.use(function (req, res, next) {
    //     // CORS headers   
    //     res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
    //     // Set custom headers for CORS
    //     res.header("Access-Control-Allow-Headers", "Content-type,Accept,X-Custom-Header");

    //     if (req.method === "OPTIONS") {
    //         console.log('options **********')
    //         res.header('Access-Control-Allow-Origin', req.headers.origin)
    //         return res.status(200).end();
    //     }
    //     res.header("Access-Control-Allow-Origin", "*"); // restrict it to the required domain
    //     return next();
    // })


    app.use(function (request, response, next) {

        response.header('Access-Control-Allow-Origin', '*');
        response.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
        response.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

        //Handle Preflight 
        if (request.method === 'OPTIONS') {
            response.status(200).send();
        }
        else {
            next();
        }

    });

    /**
     * Routes
    */
    app.use("/", routes);

    /**
     * 404 Error Handler
    */
    app.use((
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) => {
        const error: HttpError = new HttpError("Not Found");
        error.statusCode = StatusCode.NOT_FOUND;
        next(error);
    });

    /**
     * Error Handler 
    */
    app.use((
        error: HttpError,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) => {
        const statusCode: number = error.statusCode ? error.statusCode.valueOf() : StatusCode.INTERNAL_SERVER_ERROR.valueOf();
        app_logger.error(`${statusCode} --- ${error.message}`);
        res
            .status(statusCode)
            .json({
                message: error.message
            });
    });
    app_logger.info('loging server start...')
    return app;
};