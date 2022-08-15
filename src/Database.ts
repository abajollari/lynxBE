import { Connection, createConnection } from "typeorm";

/**
 * @returns Promise<Connection>
 */
export async function createDatabase(): Promise<Connection> {
    const connection: Connection = await createConnection();
    return connection;
}