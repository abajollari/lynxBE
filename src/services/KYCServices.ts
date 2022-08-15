import { Connection, Repository } from "typeorm";
import KYC from "../entity/KYC";
import { Request } from 'express';

export default class KYCService {

    private KYCRepository: Repository<KYC>;

    /**
     * Create KYC Service
     * @param {Connection} connection - Database connection instance 
     */
    constructor(connection: Connection) {
        this.KYCRepository = connection.getRepository(KYC);
    }
}