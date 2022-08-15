import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import User from "./User";

@Entity()
export default class ActivityTracker {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ nullable: false })
    ip: string

    @Column({ nullable: false })
    device: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @ManyToOne(() => User, user => user.activities)
    @JoinColumn({ referencedColumnName: "id" })
    user!: User;

    /**
     * Creates an ActivityTracker
     * @param ip - IP from where user is signed In
     * @param device - Device that user has used to sign In
     */
    constructor(ip: string, device: string) {
        this.ip = ip;
        this.device = device;
    }
}