import { Connection, Repository } from "typeorm";
import ActivityTracker from "../entity/ActivityTracker";
import { Request } from 'express';
import { UAParser } from "ua-parser-js";

export default class ActivityTrackerService {

    private ActivityTrackerRepository: Repository<ActivityTracker>;

    /**
     * Create Activity Tracker Service
     * @param {Connection} connection - Database connection instance 
     */
    constructor(connection: Connection) {
        this.ActivityTrackerRepository = connection.getRepository(ActivityTracker);
    }

    /**
     * Creates a new Activity Log
     * Does not save it in the DB
     * @param {Request} req - Request
     * @returns {Promise<any | undefined>} 
     */
    public async createLog(req: Request): Promise<any | undefined> {
        const ua =  new UAParser(req.headers['user-agent'])
        const USER_AGENT = ua.getResult();

        const ip: any =  req.headers['x-forwarded-for'] 
                        ? req.headers['x-forwarded-for'] 
                        : req.socket.remoteAddress 
                        ? req.socket.remoteAddress 
                        : "undefined";
        const device = `${USER_AGENT.os.name}-${USER_AGENT.browser.name}`;

        const _log: ActivityTracker = new ActivityTracker(ip, device);
        return _log;
    }

    /**
     * Check if the user has used the device before or not
     * @param {string} device - Device used by the user
     * @returns {Promise<boolean>} 
     */
    public async isNewDevice(device: string): Promise<boolean> {
        const activityTracker = await this.ActivityTrackerRepository.findOne({
            where: {
                device
            }
        });

        if (activityTracker) {
            return false;
        } else {
            return true;
        };
    }
}