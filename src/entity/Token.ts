import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import User from "./User";

@Entity()
export default class Token {
    @PrimaryGeneratedColumn()
    public id!: number;

    @Column({
        nullable: true,
        enum: ["REFRESH_TOKEN", "RESET_PASSWORD", "CONFIRM_EMAIL", "CONFIRM_SMS", "CONFIRM_TRANSACTION"]
    })
    public type: "REFRESH_TOKEN" | "RESET_PASSWORD" | "CONFIRM_EMAIL" | "CONFIRM_SMS" | "CONFIRM_TRANSACTION";

    @Column()
    public tokenValue: string;

    @ManyToOne(() => User, user => user.tokens)
    public user!: User;

    constructor(tokenType: "REFRESH_TOKEN" | "RESET_PASSWORD" | "CONFIRM_EMAIL" | "CONFIRM_SMS" | "CONFIRM_TRANSACTION", tokenValue: string) {
        this.type = tokenType;
        this.tokenValue = tokenValue;
    }
}