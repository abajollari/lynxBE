import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import User from "./User";

@Entity()
export default class Transaction {
    @PrimaryGeneratedColumn()
    public id!: number;

    @Column({
        nullable: true
    })
    public hash?: string;

    @Column()
    public status!: "INITIATED" | "PENDING" | "FAILED" | "UNAUTHORIZED" | "SUCCESSFUL";

    @Column()
    public amount!: number;

    @Column()
    public to!: string;

    @ManyToOne(() => User, user => user.transactions)
    public user!: User;

    constructor(amount: number, to: string) {
        this.status = "INITIATED";
        this.amount = amount;
        this.to = to;
    }
}