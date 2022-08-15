import { Column, Entity, OneToOne, PrimaryGeneratedColumn, Index } from "typeorm";
import { IsEmail, IsNotEmpty, IsPhoneNumber } from "class-validator";
import User from "./User";

@Entity()
export default class KYC {
    @PrimaryGeneratedColumn()
    public id!: number;

    @Column({nullable: true})
    public firstName?: string;

    @Column({nullable: true})
    public middleName?: string;

    @Column({nullable: true})
    public lastName?: string;

    @Column({nullable: true})
    public country?: string;

    @Column({nullable: true})
    public address?: string;

    @Column({nullable: true})
    public birthday?: string;

    @Column({nullable: true})
    @Index({
        unique: true,
        where: "idNumber IS NOT NULL"
    })
    public idNumber?: string;

    @Column({
        nullable: false,
        default: false
    })
    public phoneVerified?: boolean;
    
    @Column({nullable: true})
    @Index({
        unique: true,
        where: "phoneNumber IS NOT NULL"
    })
    @IsPhoneNumber()
    public phoneNumber?: string;

    @Column({nullable: true})
    public publicKey?: string;

    @Column({nullable: true})
    public privateKey?: string;
}