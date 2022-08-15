import winston, { transports } from "winston";
import { SqlTransport } from 'winston-sql-transport';
//const { SqlTransport } = require('winston-sql-transport');
require('dotenv').config();

/* Logger */
const app_logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({
            filename: "error.log",
            level: "error"
        }),
        new SqlTransport({
            client: <const>'mssql',
            connection: {
                user: process.env.DATABASE_USERNAME || "",
                password: process.env.DATABASE_PASSWORD || "",
                server: process.env.DATABASE_HOST || "",
                database: process.env.DATABASE_DB || "",
                encrypt: true,
                enableArithAbort: true,
            },
            name: 'mssql',
            tableName: 'lynxlogs',
            level: 'info'
        })
    ],
    exceptionHandlers: [
        new winston.transports.File({ filename: 'exceptions.log' })
    ]
});

if (process.env.ENV !== 'production') {
    app_logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        ),
        level: 'debug'
    }));
}

app_logger.info('logger started: ' + process.env.DATABASE_DB)
export default app_logger