import { Connection, Repository } from "typeorm";
import Token from "../entity/Token";
import User from "../entity/User";


export default class TokenService {
    private tokenRepository: Repository<Token>;

    /**
     * Creates token service
     * @param connection - Currenct database connection
     */
    constructor(connection: Connection) {
        this.tokenRepository = connection.getRepository(Token);
    }

    /**
     * Returns a token saved in database
     * @param tokenValue - Value of the token
     * @returns {Promise<Token>}
     */
    public async findTokenByValue(tokenValue: string): Promise<Token> {
        const token: Token | undefined = await this.tokenRepository.findOne({
            where: {
                tokenValue
            },
            relations: ["user"]
        });
        if(token) { 
            return token;
        }

        throw new Error("Token does not exist!");
    }

    /**
     * Returns the first token of a specific type saved in database
     * @param tokenType - Type of the token
     * @returns {Promise<Token>}
     */
    public async findTokenByType(tokenType: string): Promise<Token> {
        const token: Token | undefined = await this.tokenRepository.findOne({
            where: {
                type: tokenType
            },
            relations: ["user"]
        });
        if(token) { 
            return token;
        }

        throw new Error("Token does not exist!");
    }

    /**
     * Saves a token to database
     * @param tokenValue - Value of the token
     * @param tokenType - Type of the token
     * @returns {Promise<Token>}
     */
    public async createToken(
        tokenValue: string, 
        tokenType: "REFRESH_TOKEN" | "RESET_PASSWORD" | "CONFIRM_EMAIL" | "CONFIRM_SMS" | "CONFIRM_TRANSACTION"
    ): Promise<Token> {
        const _token: Token = new Token(tokenType, tokenValue);
        const token: Token = await this.tokenRepository.save(_token);
        return token;
    }
    /**
     * Deletes a token from database
     * @param token token to be deleted from database
     */
    public async deleteToken(token: Token): Promise<void> {
        await this.tokenRepository.remove(token);
    }
}