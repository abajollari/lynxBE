import { 
    Column, 
    CreateDateColumn, 
    Entity, 
    PrimaryGeneratedColumn, 
    UpdateDateColumn, 
    Index,
    BeforeInsert,
    OneToMany,
    OneToOne,
    JoinColumn
} from "typeorm";
import { IsEmail, IsNotEmpty, IsPhoneNumber } from "class-validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Web3 from 'web3';
import ethers from 'ethers';
import ActivityTracker from "./ActivityTracker";
import Token from "./Token";
import KYC from './KYC';
import Transaction from "./Transaction";

@Entity()
export default class User {
    @PrimaryGeneratedColumn()
    public id!: Number;

    @Column()
    @Index({
        unique: true
    })
    @IsNotEmpty()
    @IsEmail()
    public email: string;

    @Column({
        nullable: false,
        default: false
    })
    public emailVerified!: boolean;


    @Column()
    @IsNotEmpty()
    public password: string;

    @CreateDateColumn()
    public createdAt!: Date;

    @UpdateDateColumn()
    public updatedAt!: Date;

    @OneToOne(() => KYC, { cascade: true })
    @JoinColumn()
    public kyc!: KYC;

    @OneToMany(() => ActivityTracker, activity => activity.user, { cascade: true })
    public activities!: ActivityTracker[]

    @OneToMany(() => Token, token => token.user, { cascade: true })
    public tokens!: Token[];

    @OneToMany(() => Transaction, transactions => transactions.user, { cascade: true })
    public transactions!: Transaction[];

    /**
     * Creates a User
     * @constructor
     * @param {string} email - User's email
     * @param {string} password - User's password
     */
    constructor(
        email: string,
        password: string,
    ) {
        this.email = email;
        this.password = password;
    }

    /**
     * Hash passowrd before inserting into database
     * @returns {Promise<void>}
     */
    @BeforeInsert()
    async beforeInsert(): Promise<void> {
        this.password = await this.hashPassword(this.password);        
    }

    /**
     * Hashes the password
     * @param {string} password - password to be hashed
     * @returns {Promise<string>}
     */
    public async hashPassword(password: string): Promise<string> {
        return await bcrypt.hash(password, 10);
    }

    /**
     * Changes the password
     * @param {string} password - new password to be set
     */
    public async setPassword(password: string): Promise<void> {
        this.password = await this.hashPassword(password);
    }

    /**
     * Compares user input password with hash saved on database
     * @param {string} password - Password that user gives for authentication
     * @returns {Promise<boolean>}
     */
    async checkPassword(password: string): Promise<boolean> {
        return await bcrypt.compare(password, this.password);
    }

    /**
     * Generates token
     * @param {string} key - Secret or private key to sign the payload with
     * @param {string | number} expiresIn - Expressed in seconds or a string describing 
     * a time span zeit/ms. Eg: 60, "2 days", "10h", "7d". The time span in which the token
     * will be available
     * @returns {string}
     */
    public async generateToken(key: string, expiresIn: string | number): Promise<string> {
        const token: string = jwt.sign({ "id": this.id }, key, { expiresIn });
        return token;
    }
    
    /**
     * TO BE UPDATED
     * Generate a wallet for the user
     * @returns {Promise<any>}
     */
    // public async generateWallet(): Promise<any>{
    //     const web3 = new Web3("https://ropsten.infura.io/v3/766c8254f4104de392184a6db207f89d");

    //     const account = web3.eth.accounts.create(web3.utils.randomHex(128));

    //     return account;
    // }
}