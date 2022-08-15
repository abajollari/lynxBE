import Web3 from 'web3';
import ethers, { BigNumber } from 'ethers';
import LynxUserFactory from '../contracts/LynxUserFactory.json';
import Erc20Token from '../contracts/ERC20.json';
import aaveAddress from '../contracts/address/aave.json';
import compAddress from '../contracts/address/comp.json';
import uniAddress from '../contracts/address/uniswap.json';

require('dotenv').config();
//const LynxUserFactory = require('../contracts/LynxUserFactory.json');
const lynxContractAddress: string = '0x4161Aa3b78fa5AC3d614587f35804cFB03BC364C';

export default class BlockchainService {

    private async getW3() {
        var network = process.env.ETH_NET

        if (network == 'mainnet')
            return new Web3(new Web3.providers.HttpProvider("https://mainnet.infura.io/v3/6e6af88eebca48fa8bb3ed125e554281"));
        else if (network == 'kovan')
            return new Web3(new Web3.providers.HttpProvider("https://kovan.infura.io/v3/6e6af88eebca48fa8bb3ed125e554281"));
        else
            return new Web3(new Web3.providers.HttpProvider("https://ropsten.infura.io/v3/6e6af88eebca48fa8bb3ed125e554281"));
    }

    private getChainId() {
        if (process.env.ETH_NET == 'mainnet')
            return 1;
        else if (process.env.ETH_NET == 'kovan')
            return 42;
        else
            return 3; //ropsten
    }

    public async getUserBalance(userAddr: string) {
        const web3 = await this.getW3();
        const netId: string = this.getChainId().toString();
        // LynxUserFactory.networks[netId].address as string;
        //console.log(contractAddress);
        const contractAbi: [] = LynxUserFactory.abi as [];

        const LynxUserFactoryinstance = new web3.eth.Contract(
            contractAbi,
            lynxContractAddress
        );
        let ub = await LynxUserFactoryinstance.methods.getUserBalance()
            .call({ from: userAddr });
        return ub / (10 ** 18);
    }

    public async getUserContractAddress(userAddr: string) {
        const web3 = await this.getW3();
        const netId: string = this.getChainId().toString();
        const contractAbi: [] = LynxUserFactory.abi as [];

        const LynxUserFactoryinstance = new web3.eth.Contract(
            contractAbi,
            lynxContractAddress
        );
        let ua = await LynxUserFactoryinstance.methods.getUserContractByKey(userAddr)
            .call({ from: userAddr });
        return ua;
    }

    public async userDeposit(userAddr: string, pk: string, amount: string) {
        try {
            const web3 = await this.getW3();
            const netId: string = this.getChainId().toString();
            const lynxContractAbi: [] = LynxUserFactory.abi as [];
            const erc20Abi: [] = Erc20Token.abi as [];
            const depositAmountInWei = web3.utils.toWei(amount.toString(), "ether");
            const gasPrice = await web3.eth.getGasPrice();

            //approve --------
            const daiAddress = '0xFf795577d9AC8bD7D90Ee22b6C1703490b6512FD';
            const DaiTokeninstance = new web3.eth.Contract(
                erc20Abi,
                daiAddress
            );
            const approveTx = await DaiTokeninstance.methods.approve(lynxContractAddress, depositAmountInWei);
            const approvenonce = await web3.eth.getTransactionCount(userAddr);
            const approventxData = {
                from: userAddr,
                to: daiAddress, // target address, this could be a smart contract address
                nonce: approvenonce,
                gas: 121000, // optional if you want to specify the gas limit  
                //value: value, // optional if you are invoking say a payable function 
                // chain: netId, //if provided, hardfork also must be provided
                data: approveTx.encodeABI(),
            };
            const approvesignedTx = await web3.eth.accounts.signTransaction(approventxData, pk);
            const approvereceipt = await web3.eth.sendSignedTransaction(approvesignedTx.rawTransaction!);
            //console.log(approvereceipt);

            //-----------
            const LynxUserFactoryinstance = new web3.eth.Contract(
                lynxContractAbi,
                lynxContractAddress
            );
            const tx = await LynxUserFactoryinstance.methods.doDeposit(depositAmountInWei);
            const nonce = await web3.eth.getTransactionCount(userAddr);
            //const gas = await tx.estimateGas({from: userAddr});

            const txData = {
                from: userAddr,
                to: lynxContractAddress, // target address, this could be a smart contract address
                nonce: nonce,
                gas: 9121000, // optional if you want to specify the gas limit  
                //value: value, // optional if you are invoking say a payable function 
                // chain: netId, //if provided, hardfork also must be provided
                data: tx.encodeABI(),
            };
            const signedTx = await web3.eth.accounts.signTransaction(txData, pk);
            const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction!);

            return receipt.toString();
        } catch (error: any) {
            console.log(error.message);
            return 'ERR';
        }
    }

    public async userWithdraw(userAddr: string, pk: string, amount: string) {
        const web3 = await this.getW3();
        const netId: string = this.getChainId().toString();
        const lynxContractAbi: [] = LynxUserFactory.abi as [];
        const withDrawAmountInWei = web3.utils.toWei(amount.toString(), "ether");
        const gasPrice = await web3.eth.getGasPrice();

        //-----------
        const LynxUserFactoryinstance = new web3.eth.Contract(
            lynxContractAbi,
            lynxContractAddress
        );
        const tx = await LynxUserFactoryinstance.methods.doWithdraw(withDrawAmountInWei);
        const nonce = await web3.eth.getTransactionCount(userAddr);
        //const gas = await tx.estimateGas({from: userAddr});

        const txData = {
            from: userAddr,
            to: lynxContractAddress, // target address, this could be a smart contract address
            nonce: nonce,
            gas: 9121000, // optional if you want to specify the gas limit  
            //value: value, // optional if you are invoking say a payable function 
            // chain: netId, //if provided, hardfork also must be provided
            data: tx.encodeABI(),
        };
        const signedTx = await web3.eth.accounts.signTransaction(txData, pk);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction!);
        return receipt.toString();
    }

    public async getProvider() {
        const provider = ethers.getDefaultProvider("ropsten", {
            infura: "766c8254f4104de392184a6db207f89d",
        });

        return provider;
    }

    // public async generateWallet() {
    //     const wallet = ethers.Wallet.createRandom();        

    //     return wallet;
    // }

    public async getWallet(privateKey: string) {
        const wallet = new ethers.Wallet(privateKey);

        console.log(wallet);

        return wallet;
    }

    public async transferUSDc(wallet: any, provider: any, to: string, amount: number) {
        const account = wallet.connect(provider);

        // Define the contract
        const usdc = new ethers.Contract(
            "0x68ec573C119826db2eaEA1Efbfc2970cDaC869c4", // TODO update
            [
                "function balanceOf(address _owner) public view returns (uint256 balance)",
                "function transfer(address _to, uint256 _value) public returns (bool success)",
            ],
            account
        );

        let amountToWei = amount * Math.pow(10, 6);

        // Check if the account has sufficient balance
        const balance = await usdc.balanceOf(account.address);
        if (balance.lt(amountToWei)) {
            const balanceFormatted = ethers.utils.formatUnits(balance, 6);

            console.error(`Insufficient balance to send ${amount} (You have ${balanceFormatted})`)
        }

        const tx = await usdc.transfer(to, amount * Math.pow(10, 6), { gasPrice: 20e9 });
        console.log(`Transaction hash: ${tx.hash}`);

        return tx.hash;
    }

    // public async getContract(web3, abi, contract_address) {
    //     const w3 = await this.getWeb3();

    //     w3.eth.Contract()
    // }

    // /**
    //  * 
    //  */
    // public async transferERC20Token(fromAddr: string, toAddr: string, amount: string, privateKey: string): Promise<any> {
    //     try {
    //         const web3 = await this.getWeb3();
    //         const nonce = web3.eth.getTransactionCount(fromAddr);
    //         const tx = {
    //             "nonce": nonce,
    //             "to": toAddr,

    //         }
    //     } catch (error) {

    //     }
    // }

    //USER WALLET (personal wallet) functions
    public async getWalletEthBalance(userAddr: string) {
        const web3 = await this.getW3();
        const balance = await web3.eth.getBalance(userAddr);
        return  web3.utils.fromWei(balance,'ether');
    }

    public async getWalletTokenBalance(userAddr: string)  {
        const erc20Token: string = process.env.SYMB || 'DAI';
        const web3 = await this.getW3();
        const tokenAddress = this.getTokenAddress(erc20Token);
        const erc20Abi: [] = Erc20Token.abi as [];
        const erc20_token_contract = new web3.eth.Contract(erc20Abi, tokenAddress); 
    
        let balance = await erc20_token_contract.methods.balanceOf(userAddr).call();
        //balance = web3.utils.toBN(balance);
        //return balance.div(10**this.getTokenDecimals(erc20Token));
        return web3.utils.fromWei(balance);
    }

    private getTokenAddress(erc20Token: string): string {

        const protocolName = process.env.PROTOCOL;
        const chain = this.getChainId();

        let address = '';
        if (protocolName == "COMP")
            address = compAddress.tokens.filter(s => s.symbol == erc20Token && s.chainId == chain)[0].address;
        else if (protocolName == "AAVE") {
            //const adr = aaveAddress;
            address = aaveAddress.tokens.filter(s => s.symbol == erc20Token && s.chainId == chain)[0].address;
        }
        else
            address = uniAddress.tokens.filter(s => s.symbol == erc20Token && s.chainId == chain)[0].address;

        return address;
    }

    private getTokenDecimals(erc20Token: string): number {

        const protocolName = process.env.PROTOCOL;
        const chain = this.getChainId();

        let decimals = 18;
        if (protocolName == "COMP")
            decimals = compAddress.tokens.filter(s => s.symbol == erc20Token && s.chainId == chain)[0].decimals;
        else if (protocolName == "AAVE")
            decimals = aaveAddress.tokens.filter(s => s.symbol == erc20Token && s.chainId == chain)[0].decimals;
        else
            decimals = uniAddress.tokens.filter(s => s.symbol == erc20Token && s.chainId == chain)[0].decimals;

        return decimals;
    }

}