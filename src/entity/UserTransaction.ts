import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, JoinColumn, CreateDateColumn } from "typeorm";
import User from "./User";

@Entity()
export default class UserTransaction {
    @PrimaryGeneratedColumn()
    public id!: number;

    @Column({
        nullable: true
    })
    public hash?: string;

    @Column()
    public status!: "INITIATED" | "PENDING" | "FAILED" | "UNAUTHORIZED" | "SUCCESSFUL";

    @Column()
    public transactionType!: string;

    @Column()
    public tokenCode!: string;

    @Column()
    public amount!: number;

    // @CreateDateColumn()
    // public transactionDate!: Date;

    @Column()
    public transactionDate!: string;

    @Column()
    public walletAddress!: string;

    @ManyToOne(() => User, user => user.transactions)
    @JoinColumn({ referencedColumnName: "id" })
    public user!: User;

    constructor(transactionType: string, amount: number, transactionDate: string, walletAddress: string, tokenCode: string) {
        this.transactionType = transactionType;
        this.tokenCode = tokenCode;
        this.status = "SUCCESSFUL";
        this.amount = amount;
        this.transactionDate = transactionDate;
        this.walletAddress = walletAddress;
    }

}