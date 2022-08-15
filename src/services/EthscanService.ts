import UserTransaction from '../entity/UserTransaction';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
require('dotenv').config();

export default class EthscanService {

    private getEndpoint(userContractAddr: string) {
        var network = process.env.ETH_NET
        console.log('Net:' + network);
        if (network == 'mainnet')
            return 'https://api.etherscan.io/api?module=account&action=tokentx&address=' + 
                userContractAddr + '&startblock=0&endblock=999999999&sort=asc&apikey=' + process.env.ETHSCANM;
        else if (network == 'kovan')
            return 'https://api-kovan.etherscan.io/api?module=account&action=tokentx&address=' + 
                userContractAddr + '&startblock=0&endblock=999999999&sort=asc&apikey=' + process.env.ETHSCANR;
        else
            return 'https://api-ropsten.etherscan.io/api?module=account&action=tokentx&address=' + 
                userContractAddr + '&startblock=0&endblock=999999999&sort=asc&apikey=' + process.env.ETHSCANR;
    }

   /**
     * Get transactions for a given address
     * @param {string} userContractAddr - user address
     * @returns {Promise<object>}
     */ 
    public async getUserTransactions(userContractAddr: string) { //: Promise<UserTransaction[] | undefined> {
        const trans: UserTransaction[] = [];
        var ETH_API_URL  = this.getEndpoint(userContractAddr);
        const ETH_REQUEST_HEADERS = {
            //'User-Agent': 'chrome'
        };

        return new Promise(resolve => {   
            axios.get(`${ETH_API_URL}`, { headers: ETH_REQUEST_HEADERS })
            .then(response => {
                    var obj = [];
                    obj = response.data['result']; //JSON.parse(response.data);
                    // console.log(obj);
                    obj.map((items: { 
                        // blockHash: any,
                        // blockNumber: any,
                        // confirmations: any,
                        // contractAddress: any,
                        // cumulativeGasUsed: any,
                        // from: any,
                        // gas: any,
                        // gasPrice: any,
                        // gasUsed: any,
                        // hash: any,
                        // input: any,
                        // nonce: any,
                        // timeStamp: any,
                        // to: any,
                        // tokenDecimal: number,
                        // tokenName: any,
                        // tokenSymbol: any,
                        // transactionIndex: any,
                        // value: number;
                        blockNumber: any,
                        timeStamp: any,
                        hash: any,
                        nonce: "1315",
                        blockHash: any,
                        from: any,
                        contractAddress: any,
                        to: any,
                        value: any,
                        tokenName: any,
                        tokenSymbol: any,
                        tokenDecimal: any,
                        transactionIndex: any,
                        gas: any,
                        gasPrice: any,
                        gasUsed: any,
                        cumulativeGasUsed: any,
                        input: any,
                        confirmations: any
                     }) =>
                    {
                        if(items.to.toLowerCase() === userContractAddr.toLowerCase() && items.tokenSymbol.toLowerCase() === 'adai') {
                            trans.push(new UserTransaction('Deposit', items.value/(10**items.tokenDecimal), new Date(items.timeStamp*1000).toUTCString(), "", items.tokenSymbol));
                        }else if (items.from.toLowerCase() === userContractAddr.toLowerCase() && items.tokenSymbol.toLowerCase() === 'adai') {
                            trans.push(new UserTransaction('Withdraw', items.value/(10**items.tokenDecimal), new Date(items.timeStamp*1000).toLocaleDateString("en-US"), "", items.tokenSymbol));
                        }    
                    })
                    resolve(trans);
            })
            .catch(error => console.error('parsing etherscan data error', error))
        })
    };
};