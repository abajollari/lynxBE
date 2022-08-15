import "reflect-metadata";
import express, { Router } from "express";
import dotenv from "dotenv";
import { createServer } from "./Server";
import createRoutes from "./routes";
import { createDatabase } from "./Database";
import { Connection } from "typeorm";
import app_logger from "./logger/index";
import "./types";
dotenv.config();

async function main() {
    const connection: Connection = await createDatabase();
    const server: express.Application = createServer(
        createRoutes(connection)
    );

    server.listen(
        parseInt(process.env.SERVER_PORT!) || 3001,
        () => app_logger.info(`Server running at port ${process.env.SERVER_PORT}`)
    );

}

main();
