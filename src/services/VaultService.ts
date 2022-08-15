import crypto, { Cipher, Decipher } from "crypto";
import { Buffer } from "buffer";
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import logger from "../logger/index";

export enum KYCDataType {
    FIRST_NAME="firstName",
    MIDDLE_NAME="middleName",
    LAST_NAME="lastName",
    ID_NUMBER="idNumber",
    COUNTRY="contry",
    ADDRESS="adress",
    BIRTHDAY="birthday"
}
export default class VaultService {

    private agent!: AxiosInstance;

    /**
     * Creates Vault Service
     * @param {string} roleId - role_id vault authentication id
     * @param {string} secretId - secret_id vault authentication secret
     * @param {string} vaultAddress - vault service address
    */
    constructor(roleId: string, secretId: string, vaultAddress: string) {
        // axios
        //     .post(`${vaultAddress}/v1/auth/approle/login`, {
        //         "role_id": roleId,
        //         "secret_id": secretId
        //     })
        //     .then((response: AxiosResponse) => {
        //         this.agent = axios.create({
        //             baseURL: `${vaultAddress}/v1`,
        //             headers: {
        //                 "Content-type": "Application/json"
        //             }
        //         });

        //         this.agent.interceptors.request.use((request: AxiosRequestConfig) => {
        //             request.headers["X-Vault-Token"] = response.data.auth.client_token;
        //             return request;
        //         });
        //     })
        //     .catch(error => {
        //         throw error;
        //     });
    }
    /**
     * Saves data in vault
     * @param {string} path - Vault secret data path 
     * @param {string} key - Type of saved data
     * @param {string} value - Value to be saved into vault
     */
    private async setKvs(path: string, key: string, value: string): Promise<void> {
        await this.agent.put(`/secret/${path}/${key}`, {
            value
        });
    }

    /**
     * Gets kvs from vault
     * @param {string} path - Vault secret data path 
     * @returns {Promise<{ [key: string]: any }>}
     */
     private async getKvs(path: string): Promise<{ [key: string]: any }> {
        const response: AxiosResponse = await this.agent.get(`/secret/${path}`);
        return response.data;
    }

    /**
     * Stores user's private key in vault
     * @param {number} userId - user's id
     * @param privateKey - user's private key
     * @returns {Promise<void>}
     */
    public async setPrivateKey(userId: number, privateKey: string): Promise<void> {
        await this.setKvs("privateKeys", `${userId}`, privateKey);
    }

    /**
     * @param {number} userId - user's id
     * @returns {Promise<string>}
     */

    public async getPrivateKey(userId: number): Promise<string> {
        return (await this.getKvs(`privateKeys/${userId}`)).data.value;
    }

    /**
     * Return user's KYC secret from vault
     * @returns {Promise<string>}
     */
     public async getKYCSecret(): Promise<any> {
        // const response = await this.getKvs("keys");
        // return response.data.KYC;
        return "secretKey";
    }
    
    /**
     * Encrypts the data
     * @param {string} secretKey - Encryption secret key
     * @param {string} vaule - Value to be encrypted
     */
    public encryptData(secretKey: string, value: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const algorithm: string = "aes-192-cbc";
            crypto.scrypt(Buffer.from(secretKey), "salt", 24, (err, key) => {
                if(err) {
                    return reject(err);
                }
                crypto.randomFill(new Uint8Array(16), (err, iv) => {
                    if(err) {
                        return reject(err);
                    }
                    const cipher: Cipher = crypto.createCipheriv(algorithm, key, iv);
                    return resolve(
                        Buffer.concat([cipher.update(value), cipher.final()]).toString("hex") 
                        + ":" 
                        + Buffer.from(iv).toString("hex")
                    );
                })
                
            });
        });
    }

    /**
     * Encrypts the data
     * @param {string} secretKey - Encryption secret key
     * @param {string} encryptedValue - Value to be decrypted
     */
     public decryptData(secretKey: string, encryptedValue: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const algorithm: string = "aes-192-cbc";
            crypto.scrypt(Buffer.from(secretKey), "salt", 24, (err, key) => {
                if(err) {
                    return reject(err);
                }

                const ivBuffer: Buffer = Buffer.from(encryptedValue.split(":")[1], "hex");
                const iv = new Uint8Array(ivBuffer.length);
                for(let i = 0; i < iv.length; i++) {
                    iv[i] = ivBuffer[i];
                }
                const decipher: Decipher = crypto.createDecipheriv(algorithm, key, iv);
                return resolve(Buffer.concat(
                        [decipher.update(Buffer.from(encryptedValue.split(":")[0], "hex")), decipher.final()]
                    ).toString()
                );
            });
        });
    }
}