import { Connection, Repository } from "typeorm";
import Transaction from "../entity/Transaction";
import User from "../entity/User";

export default class TransactionService {
    private transactionRepository: Repository<Transaction>;

    /**
     * Creates transaction service
     * @param connection - Currenct database connection
     */
    constructor(connection: Connection) {
        this.transactionRepository = connection.getRepository(Transaction);
    }

    /**
     * Returns a transaction saved in database
     * @param id - The id of the transaction on the db
     * @returns {Promise<Transaction>}
     */
     public async findTransactionsById(id: number): Promise<Transaction> {
        const transaction: Transaction | undefined = await this.transactionRepository.findOne({
            where: {
                id
            },
            relations: ["user"]
        });
        if(transaction) { 
            return transaction;
        }

        throw new Error("Transaction with this Id does not exist!");
    }

    /**
     * Returns a transaction saved in database
     * @param hash - The hash of the transaction on the Ethereum blockchain
     * @returns {Promise<Transaction>}
     */
    public async findTransactionsByHash(hash: string): Promise<Transaction> {
        const transaction: Transaction | undefined = await this.transactionRepository.findOne({
            where: {
                hash
            },
            relations: ["user"]
        });
        if(transaction) { 
            return transaction;
        }

        throw new Error("Transaction with this hash does not exist!");
    }

    /**
     * Saves a transaction to database and initiates it
     * @param amount - Amount of the transaction
     * @param to - Receiver of the transaction
     * @returns {Promise<Transaction>}
     */
    public async createTransaction( amount: number, to: string ): Promise<Transaction> {
        const _transaction: Transaction = new Transaction(amount, to);
        const transaction: Transaction = await this.transactionRepository.save(_transaction);
        return transaction;
    }       
}