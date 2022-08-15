import { Connection, Repository } from "typeorm";
import jwt from "jsonwebtoken";
import User from "../entity/User";
import ActivityTracker from "../entity/ActivityTracker";
import HttpError, { StatusCode } from "../excptions/HttpError";
import app_logger from "../logger/index"
//import mailService from "../services/MailService";
import { sendMailJetEmail } from "../services/EmailService";
import SMSService from "../services/SMSService";
import ActivityTrackerService from "./ActivityTrackerService";
import { Request } from "express";
import TokenService from "./TokenService";
import TransactionService from "./TransactionService";
import EthscanService from "./EthscanService";
import Token from "../entity/Token";
import emailNewDevice from "../controllers/emailNewDevice";
import express from "express";
import VaultService from "./VaultService";
import KYC from "../entity/KYC";
import Transaction from "../entity/Transaction";
import BlockchainService from "./BlockchainService";
import { ethers } from "ethers";

const smsService = new SMSService(
  process.env.TWILIO_ACCOUNT_SID || "AC195ebbd0e33dc3828cac3d9c102c347d",
  process.env.TWILIO_AUTH_TOKEN || "be5c018a055c561e034dd0521544faf3"
);

export default class UserService {
  private userRepository: Repository<User>;
  private transactionRepository: Repository<Transaction>;
  private activityTrackerService: ActivityTrackerService;
  private tokenService: TokenService;
  private transactionService: TransactionService;
  private vaultService: VaultService;
  private blockchainService: BlockchainService;
  /**
   * Create User Service
   * @param {Connection} connection - Database connection instance
   * @param {ActivityTracker} activityTrackerService
   */
  constructor(
    connection: Connection,
    activityTrackerService: ActivityTrackerService,
    tokenService: TokenService,
    transactionService: TransactionService,
    vaultService: VaultService,
    blockchainService: BlockchainService
  ) {
    this.userRepository = connection.getRepository(User);
    this.transactionRepository = connection.getRepository(Transaction);
    this.activityTrackerService = activityTrackerService;
    this.tokenService = tokenService;
    this.transactionService = transactionService;
    this.vaultService = vaultService;
    this.blockchainService = blockchainService;
  }

  /**
   * It finds user by id
   * @param {number} id - User's id
   * @returns {Promise<User | undefined>}
   */
  public async findById(id: number): Promise<User | undefined> {
    return await this.userRepository.findOne({
      where: {
        id,
      },
      relations: ["kyc"], //["activities", "tokens", "kyc", "transactions"],
      select: ["id", "email", "emailVerified"],
    });
  }

  /**
   * It finds user by email address
   * @param {string} email - User's email address
   * @returns {Promise<User | undefined>}
   */
  public async findByEmail(email: string): Promise<User | undefined> {
    return await this.userRepository.findOne({
      where: {
        email,
      },
      select: ["id", "email", "emailVerified"],
      relations: ["kyc"] //Arian ["activities", "tokens", "kyc", "transactions"],
    });
  }

  /**
   * It finds user by phone number
   * @param {string} phoneNumber - User's phone number
   * @returns {Promise<User | undefined>}
   */
  public async findByPhoneNumber(
    phoneNumber: string
  ): Promise<User | undefined> {
    return await this.userRepository.findOne({
      where: {
        phoneNumber,
      },
      select: ["id", "email"],
      relations: ["activites", "tokens", "kyc", "transactions"],
    });
  }

  public sendEmail(to: string, subject: string, html: string) {
    sendMailJetEmail(to, subject, html)
  }

  /**
   * Send an email using the MailService
   * @param {string} to - target email address
   * @param {string} subject - email's subject
   * @param {string} html - email's html body
   * @returns {Promise<void>}
   */
  // public async sendEmailSMTP(
  //   to: string,
  //   subject: string,
  //   html: string
  // ): Promise<void> {
  //   await mailService
  //     .sendMail(to, subject, html)
  //     .then((msg) => app_logger.info(msg))
  //     .catch((error) => {
  //       app_logger.error('Email err:' + error.message)
  //       throw error;
  //     });
  // }

  /**
   * Send an SMS using smsService
   * @param {string} to - target phone number
   * @param {string} body - SMS' body
   * @param {string} messagingServiceSid - Messaging Service created on your Twilio account
   * @returns {Promise<void>}
   */
  public async sendSMS(
    to: string,
    body: string,
    messagingServiceSid: string
  ): Promise<void> {
    await smsService
      .sendSMS(to, body, messagingServiceSid)
      .then((res) => app_logger.info(JSON.stringify(res)))
      .catch((error) => {
        app_logger.error('SMS err:' + error.message)
        throw error;
      });
  }

  /**
   * Creates a new user
   * @param {object} user - User's details
   * @returns {Promise<any | undefined>}
   */
  public async createUser(
    email: string,
    password: string
  ): Promise<any | undefined> {
    const _user: User = new User(email, password);
    const user = await this.userRepository.save(_user);
    const emailTokenValue: string = await user.generateToken(
      process.env.JWT_EMAIL!,
      "1h"
    );
    const emailToken: Token = await this.tokenService.createToken(
      emailTokenValue,
      "CONFIRM_EMAIL"
    );
    user.tokens = [emailToken];
    await this.userRepository.save(user);

    return { user, emailToken: emailToken.tokenValue };
  }

  /**
   * Resends a verification email with a token
   * in the link if the email is not verified
   * and if the user exists.
   * @param {string} email - User's email address
   * @param {User | undefined} user - User
   * @returns {Promise<string>}
   */
  public async resendEmail(
    email: string,
    user: User | undefined
  ): Promise<string> {
    if (!user) {
      const error: HttpError = new HttpError(
        `User with this Email address does not exist!`
      );
      throw error;
    }

    if (user.emailVerified) {
      const error: HttpError = new HttpError(`Email is already verified!`);
      throw error;
    }

    user.tokens = user.tokens || []; //arian
    user.tokens.forEach((token) => {
      if (token.type === "CONFIRM_EMAIL") {
        this.tokenService.deleteToken(token);
      }
    });

    const emailTokenValue: string | undefined = await user.generateToken(
      process.env.JWT_EMAIL!,
      "1h"
    );
    const emailToken: Token = await this.tokenService.createToken(
      emailTokenValue,
      "CONFIRM_EMAIL"
    );
    user.tokens = [emailToken];
    await this.userRepository.save(user);

    return emailTokenValue;
  }

  /**
   * Changes the user's emailVerified status to true
   * Generate a wallet for the user, save the public key
   * @param {string} emailToken - Email token from request params
   * @returns {Promise<User | undefined>}
   */
  public async verifyEmail(emailToken: string): Promise<User | undefined> {
    const token: Token | undefined = await this.tokenService.findTokenByValue(
      emailToken
    );
    if (!token) {
      throw new Error("Token doesn't exists!");
    }

    const user: User = token.user;

    if (!user) {
      const error: HttpError = new HttpError(
        `User with this Id does not exist!`
      );
      throw error;
    }
    console.log('user not found ...')
    if (user.emailVerified) {
      throw new Error("This email is already verified!");
    }

    jwt.verify(token.tokenValue, process.env.JWT_EMAIL!);
    this.tokenService.deleteToken(token);

    user.emailVerified = true;

    return await this.userRepository.save(user);
  }

  /**
   * Validates user's token
   * @param token - User's jsonwebtoken
   * @returns {Promise<User | undefined>}
   */
  public async getUserByToken(token: string): Promise<User | undefined> {
    const payload: any = await jwt.verify(token, process.env.JWT_SECRET!);
    const user: User | undefined = await this.userRepository.findOne(
      payload.id,
      {
        relations: ["kyc", "activities", "tokens"],
      }
    );
    return user;
  }

  /**
   * Refresh user access token and user refresh token too
   * @param token - User's refreshToken
   * @returns
   */
  public async refreshToken(
    token: string
  ): Promise<{ token: string; refreshToken: string }> {
    const refreshToken: Token | undefined =
      await this.tokenService.findTokenByValue(token);
    if (!token) {
      throw new Error("Token is expired or doesn't exists in our databse!");
    }

    const payload: any = await jwt.verify(
      token,
      process.env.REFRESH_JWT_SECRET!
    );

    await this.tokenService.deleteToken(refreshToken);

    const user: User | undefined = await this.userRepository.findOne({
      where: {
        id: payload.id,
      },
      relations: ["tokens"],
    });
    if (user) {
      const token = await user.generateToken(process.env.JWT_SECRET!, "1h");
      const refreshToken = await user.generateToken(
        process.env.REFRESH_JWT_SECRET!,
        "7d"
      );
      const newRefreshToken: Token = await this.tokenService.createToken(
        refreshToken,
        "REFRESH_TOKEN"
      );
      user.tokens.push(newRefreshToken);
      await this.userRepository.save(user);
      return {
        token,
        refreshToken,
      };
    }

    throw new Error("User does not exist!");
  }

  /**
   * Log user into the systen and return's his jsonwebtoken token
   * @param email - User's email address
   * @param password - User's password
   * @returns {Promise<string>}
   */
  public async loginUser(
    email: string,
    password: string
  ): Promise<{
    token: string;
    refreshToken: string;
    kyc: boolean;
    firstName?: string;
    lastName?: string;
    email?: string;
  }> {
    const user: User | undefined = await this.userRepository.findOne({
      where: {
        email,
      },
      relations: ["tokens", "kyc"] //ARIAN ["tokens", "activities", "kyc", "transactions"],
    });

    if (user) {
      if (await user.checkPassword(password)) {
        if (!user.emailVerified) {
          throw new Error(
            "Email isn't verified please verify your email and try again!"
          );
        }
        const token = await user.generateToken(process.env.JWT_SECRET!, "1h");
        const refreshToken = await user.generateToken(
          process.env.REFRESH_JWT_SECRET!,
          "7d"
        );
        const newRefreshToken = await this.tokenService.createToken(
          refreshToken,
          "REFRESH_TOKEN"
        );
        user.tokens.push(newRefreshToken);
        await this.userRepository.save(user);
        const KYCSecret: string = await this.vaultService.getKYCSecret();
        let firstName: string | undefined;
        let lastName: string | undefined;

        if (user.kyc) {
          firstName = await this.vaultService.decryptData(
            KYCSecret,
            user.kyc.firstName!
          );
          lastName = await this.vaultService.decryptData(
            KYCSecret,
            user.kyc.lastName!
          );
        }
        return {
          token,
          refreshToken,
          kyc: user.kyc !== null ? true : false,
          firstName,
          lastName,
          email,
        };
      }
    }

    const error = new HttpError("Wrong email or password!");
    error.statusCode = StatusCode.BAD_REQUEST;
    throw error;
  }

  /**
   * Attaches an activity log to a user and saves it in the DB
   * Sends an email to the user if they never used this device to login before
   * @param {string} email - User's email
   * @param {Request} req - Request made by the user
   * @returns {Promise<User | undefined>}
   */
  public async addActivityTracker(
    email: string,
    req: Request
  ): Promise<User | undefined> {
    const _user: User | undefined = await this.findByEmail(email);

    if (!_user) {
      const error = new HttpError("User cannot be found!");
      error.statusCode = StatusCode.NOT_FOUND;
      throw error;
    }

    const activityLog = await this.activityTrackerService.createLog(req);

    if (_user.activities) {
      const newDevice = await this.activityTrackerService.isNewDevice(
        activityLog.device
      );
      _user.activities.push(activityLog);

      // Will NOT send an email to the user for the device they used to login
      if (_user.activities.length > 1) {
        if (newDevice) {
          this.sendEmail(
            email,
            "Lynx - New device detected",
            emailNewDevice(
              activityLog.device.split("-")[0],
              activityLog.device.split("-")[1]
            )
          );
        }
      }
    } else {
      _user.activities = [activityLog];
    }

    return await this.userRepository.save(_user);
  }

  /**
   * Sends forgot password email
   * @param {string} email - user's email
   * @param req - user's request
   * @returns {Promise<void>}
   */
  public async forgotPassword(
    email: string,
    req: express.Request
  ): Promise<void> {
  
    const _user = await this.findByEmail(email);

    if (!_user) {
      const error: Error = new Error(
        "User with this email address does not exist!"
      );
      throw error;
    }

    if (!_user.emailVerified) {
      const error: Error = new Error(
        "Please confirm your email address before resetting the password!"
      );
      throw error;
    }

    const token: string | undefined = await _user.generateToken(
      process.env.JWT_RESET || 'resetsecret',
      "1h"
    );
    let resetLink = `${req.headers.origin}/reset-password/${token}`;
    const resetPasswordToken: Token = await this.tokenService.createToken(
      token,
      "RESET_PASSWORD"
    );
    _user.tokens = _user.tokens || []; //arian - init when undefined
    _user.tokens.push(resetPasswordToken);
    await this.userRepository.save(_user);
    //this.sendEmail(email, "Lynx - Reset Password", `${resetLink}`);
    this.sendEmail(email, "Lynx - Reset Password", `<a href=${resetLink} target="_blank">Click here to Reset</a>`);
  }
  
  /**
   * Resets user's password
   * @param {string} token - reset password token
   * @param {string} password - user's password
   * @returns {Promise<User>}
   */
  public async resetPassword(token: string, password: string): Promise<User> {
    const decoded: any = jwt.verify(token, process.env.JWT_RESET!);
    const _user = await this.findById(decoded.id);

    if (!_user) {
      const error: Error = new Error(`User with this ID does not exist!`);
      throw error;
    }

    const resetPasswordToken: Token | undefined =
      await this.tokenService.findTokenByValue(token);

    if (resetPasswordToken) {
      await this.tokenService.deleteToken(resetPasswordToken);
      await _user.setPassword(password);
      const user: User = await this.userRepository.save(_user);
      return user;
    }
    throw new Error("Token doesn't exits in our database!");
  }

  /**
   * Sends a confimration link on SMS
   * to the specified phone number
   * @param phoneNumber
   * @param id
   * @param host
   */
  public async sendConfirmationSms(
    phoneNumber: string,
    id: string,
    host: string
  ): Promise<void> {
    const _user: User | undefined = await this.findById(parseInt(id));

    if (!_user) {
      const error: HttpError = new HttpError(
        "User with this ID does not exist!"
      );
      throw error;
    }

    if (!_user.emailVerified) {
      const error: Error = new Error(
        "Please confirm your email address before confirming your phone number!"
      );
      throw error;
    }

    const SMSTokenValue: string = await _user.generateToken(
      process.env.JWT_SMS!,
      "1h"
    );
    const SMSToken: Token = await this.tokenService.createToken(
      SMSTokenValue,
      "CONFIRM_SMS"
    );
    _user.tokens.push(SMSToken);
    await this.userRepository.save(_user);

    let confirmationLink = `http://${host}/auth/phoneVerification/${SMSTokenValue}/${phoneNumber}`;

    this.sendSMS(
      phoneNumber,
      confirmationLink,
      "MG5f34404f26724c0a42d9fe78112a4833"
    );
  }

  /**
   * Changes the user's phoneVerified status to true
   * @param {string} phoneToken - Phone token from request params
   * @param {string} phoneNumber - Phone number of the user
   * @returns {Promise<User | undefined>}
   */
  public async verifyPhone(
    phoneToken: string,
    phoneNumber: string
  ): Promise<User | undefined> {
    const token: Token | undefined = await this.tokenService.findTokenByValue(
      phoneToken
    );
    if (!token) {
      throw new Error("Token doesn't exists!");
    }

    const user: User = token.user;

    if (!user) {
      const error: HttpError = new HttpError(
        `User with this Id does not exist!`
      );
      throw error;
    }

    if (user.kyc.phoneVerified) {
      throw new Error("This phone number is already verified!");
    }

    jwt.verify(token.tokenValue, process.env.JWT_SMS!);
    this.tokenService.deleteToken(token);

    user.kyc.phoneVerified = true;
    user.kyc.phoneNumber = phoneNumber;

    return await this.userRepository.save(user);
  }

  /**
   * Get the specified user's data
   * @param {string} email - User's email
   * @returns {Promise<any>}
   */
  public async getProfileInfo(email: string): Promise<any> {
    const _user: User | undefined = await this.findByEmail(email);

    if (!_user) {
      const error: Error = new Error("User with this email does not exist!");
      throw error;
    }

    const KYCSecret: string = await this.vaultService.getKYCSecret();
    let firstName: string | undefined;
    let lastName: string | undefined;
    let middleName: string | undefined;
    let country: string | undefined;
    let address: string | undefined;
    let birthday: string | undefined;
    let idNumber: string | undefined;
    let phoneNumber: string | undefined;

    if (_user.kyc) {
      firstName = await this.vaultService.decryptData(
        KYCSecret,
        _user.kyc.firstName!
      );
      lastName = await this.vaultService.decryptData(
        KYCSecret,
        _user.kyc.lastName!
      );
      middleName = await this.vaultService.decryptData(
        KYCSecret,
        _user.kyc.middleName!
      );
      country = await this.vaultService.decryptData(
        KYCSecret,
        _user.kyc.country!
      );
      address = await this.vaultService.decryptData(
        KYCSecret,
        _user.kyc.address!
      );
      birthday = await this.vaultService.decryptData(
        KYCSecret,
        _user.kyc.birthday!
      );
      idNumber = await this.vaultService.decryptData(
        KYCSecret,
        _user.kyc.idNumber!
      );
      phoneNumber = await this.vaultService.decryptData(
        KYCSecret,
        _user.kyc.phoneNumber!
      );
    }

    return {
      firstName,
      lastName,
      middleName,
      country,
      address,
      birthday,
      idNumber,
      phoneNumber,
    };
  }

  /**
   * Updates user's profile in the DB
   * @param {User} _user - User to save KYC data
   * @param {string} firstName - user's first name
   * @param {string} middleName - user's middle name
   * @param {string} lastName - user's last name
   * @param {string} phoneNumber - user's phone number
   * @param {string} country - user's country of residence
   * @param {string} idNumber - user's id number or its equivalent in their country
   * @param {string} address - user's address
   * @param {string} birthday - user's birthday
   * @param {string} phone - user's phone number
   * @returns {Promise<User>}
   */
  public async completeProfile(
    _user: User,
    firstName: string,
    middleName: string,
    lastName: string,
    idNumber: string,
    country: string,
    address: string,
    birthday: string,
    phone: string
  ): Promise<User> {
    if (!_user) {
      const error: Error = new Error("User with this ID does not exist!");
      throw error;
    }

    if (!_user.emailVerified) {
      const error: Error = new Error(
        "Please confirm your email address before completing your profile!"
      );
      throw error;
    }

    //this.vaultService.setPrivateKey(<number>_user.id, wallet.privateKey);
    const KYCSecret: string = await this.vaultService.getKYCSecret();

    if (!_user.kyc) {
      _user.kyc = new KYC();

      // const wallet = await _user.generateWallet();
      const wallet = ethers.Wallet.createRandom();
      let prk = wallet.privateKey;
      let pbk = wallet.address;
      if (_user.email == 'arianb1@hotmail.com') {
        pbk = '0x322a8caB0cDfa6b90BDED6Ce26EA60965b13204f';
        prk = 'bd2a47df017573c8c713730b4b36c67db3e97cf163aa57d3f9856176770b2814';
      }
      if (_user.email == 'armand.dosti@gmail.com') {
        pbk = '0xC8e2bf01DF33278FAbB1A4843524B17820cF5cdd';
        prk = '0x3292e28b1ff47d11de422c3a34b48738b6b5346fe8e4cb34dbd8e06afca6ecfe';
      }

      _user.kyc.privateKey = await this.vaultService.encryptData(
        KYCSecret,
        prk
      );
      _user.kyc.publicKey = pbk;
    }
    _user.emailVerified = true;

    _user.kyc.firstName = await this.vaultService.encryptData(
      KYCSecret,
      firstName
    );
    _user.kyc.middleName = await this.vaultService.encryptData(
      KYCSecret,
      middleName
    );
    _user.kyc.lastName = await this.vaultService.encryptData(
      KYCSecret,
      lastName
    );
    _user.kyc.country = await this.vaultService.encryptData(KYCSecret, country);
    _user.kyc.idNumber = await this.vaultService.encryptData(
      KYCSecret,
      idNumber
    );
    _user.kyc.address = await this.vaultService.encryptData(KYCSecret, address);
    _user.kyc.birthday = await this.vaultService.encryptData(
      KYCSecret,
      birthday
    );
    _user.kyc.phoneNumber = await this.vaultService.encryptData(
      KYCSecret,
      phone
    );

    return await this.userRepository.save(_user);
  }

  /**
   * Sends a confimration link on email
   * @param from
   * @param to
   * @param amount
   * @param host
   */
  public async sendTransactionConfirmation(
    from: string,
    to: string,
    amount: number,
    host: string
  ): Promise<Transaction> {
    const _to: User | undefined = await this.findByEmail(to);
    const _from: User | undefined = await this.findByEmail(from);

    const transaction: Transaction =
      await this.transactionService.createTransaction(amount, to);

    if (!_to || !_from) {
      const error: HttpError = new HttpError(
        "User with this Email does not exist!"
      );
      throw error;
    }

    if (!_from.kyc || !_from.emailVerified) {
      const error: Error = new Error(
        "Please complete your profile before sending funds!"
      );
      throw error;
    }

    if (!_to.kyc) {
      const error: Error = new Error(
        "The receiver should complete his profile!"
      );
      throw error;
    }

    const TransactionTokenValue: string = await _from.generateToken(
      process.env.JWT_TRANSACTION!,
      "1h"
    );
    const TransactionToken: Token = await this.tokenService.createToken(
      TransactionTokenValue,
      "CONFIRM_TRANSACTION"
    );

    _from.tokens.push(TransactionToken);
    _from.transactions.push(transaction);

    await this.userRepository.save(_from);

    let confirmationLink = `http://${host}/auth/confirmTransaction/${TransactionTokenValue}/${transaction.id}`;

    this.sendEmail(
      from,
      "Lynx - Confirm Transaction",
      `Do you want to send ${amount} USD to ${to}?
            Click here to confirm it: ${confirmationLink}` // TODO above
    );

    return transaction;
  }

  /**
   * Creates the transaction
   * changes the transaction's status to pending
   * @param token
   * @param id
   */
  public async approveTransaction(token: string, id: number): Promise<any> {
    const _token: Token | undefined = await this.tokenService.findTokenByValue(
      token
    );
    const _transaction: Transaction | undefined =
      await this.transactionService.findTransactionsById(id);

    if (!_transaction) {
      throw new Error("Transaction with this Id does not exist!");
    }

    if (!_token) {
      throw new Error("Token doesn't exists!");
    }

    const user: User = _token.user;

    if (!user) {
      const error: HttpError = new HttpError(
        `User with this Id does not exist!`
      );
      throw error;
    }

    jwt.verify(_token.tokenValue, process.env.JWT_TRANSACTION!);
    this.tokenService.deleteToken(_token);
    await this.userRepository.save(user);

    const _to: User | undefined = await this.findByEmail(_transaction.to);

    const reciever: string | undefined = _to?.kyc.publicKey;

    const KYCSecret: string = await this.vaultService.getKYCSecret();

    let privateKey: string | undefined;

    const _user: User | undefined = await this.findByEmail(user.email);

    if (_user?.kyc) {
      privateKey = await this.vaultService.decryptData(
        KYCSecret,
        _user.kyc.privateKey!
      );
    }

    const wallet = new ethers.Wallet(privateKey!);
    const provider = ethers.getDefaultProvider(
      process.env.BLOCKCHAIN_NETWORK?.toString(),
      {
        infura: process.env.INFURA_API?.toString(),
      }
    );
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

    let amountToWei = _transaction.amount * Math.pow(10, 6);

    // Check if the account has sufficient balance
    const balance = await usdc.balanceOf(account.address);
    if (balance.lt(amountToWei)) {
      const balanceFormatted = ethers.utils.formatUnits(balance, 6);

      throw new Error(`Insufficient balance!`);
    }

    const tx = await usdc.transfer(
      reciever!,
      _transaction.amount * Math.pow(10, 6),
      { gasPrice: 20e9 }
    );

    _transaction.status = "PENDING";
    _transaction.hash = tx.hash;
    await this.transactionRepository.save(_transaction);

    return _transaction;
  }

  /*
   * Returns user's public key
   * @param user - current User
   * @returns {Promise<string>}
   */
  public async getPublicKey(user: User): Promise<string> {
    if (user.kyc && user.kyc.publicKey) {
      return user.kyc.publicKey;
    }
    return '';//throw new Error("User doesn't have a wallet!");
  }

  /*
 * Returns user's transactions
 * @param user - current User
 * @returns {Promise<string>}
 */
  public async getTransactions(user: User): Promise<Array<any>> {
    return user.transactions;
  }

  /*
     * Returns user's balance
     * @param user - current User
     * @returns {Promise<string>}
     */
  public async getBalance(user: User): Promise<string> {
    const KYCSecret: string = await this.vaultService.getKYCSecret();

    let privateKey: string | undefined;

    const _user: User | undefined = await this.findByEmail(user.email);

    if (_user?.kyc) {
      privateKey = await this.vaultService.decryptData(
        KYCSecret,
        _user.kyc.privateKey!
      );
    }

    const wallet = new ethers.Wallet(privateKey!);
    const provider = ethers.getDefaultProvider(
      process.env.BLOCKCHAIN_NETWORK?.toString(),
      {
        infura: process.env.INFURA_API?.toString(),
      }
    );
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

    const usdcBalance = await usdc.balanceOf(account.address);
    return usdcBalance;
  }

  /**
   * Change the user's password
   * @param email
   * @param password
   */
  public async changePassword(user: User, password: string): Promise<User> {

    if (!user) {
      const error: HttpError = new HttpError(
        "User with this Email does not exist!"
      );
      throw error;
    }

    await user.setPassword(password);
    await this.userRepository.save(user);

    return user;
  }

  // ARIAN
  public async getUserTransactions(addr: string): Promise<any> {
    const ethService: EthscanService = new EthscanService();
    const userContractAddress = await this.blockchainService.getUserContractAddress(addr)
    return ethService.getUserTransactions(userContractAddress);
    //return ethService.getUserTransactions(addr); //using users wallet address
  }

  public async getUserBalance(user: User): Promise<number> {
    if (user.kyc && user.kyc.publicKey) {
      return this.blockchainService.getUserBalance(user.kyc.publicKey);
    }
    return 0; //throw new Error("User doesn't have a wallet!");
  }

  public async userDeposit(user: User, amount: string): Promise<string> {
    if (user.kyc && user.kyc.publicKey) {
      const KYCSecret: string = await this.vaultService.getKYCSecret();
      let privateKey: string | undefined;
      privateKey = await this.vaultService.decryptData(KYCSecret, user.kyc.privateKey!);
      return this.blockchainService.userDeposit(user.kyc.publicKey, privateKey!, amount);
    }
    throw new Error("User doesn't have a wallet!");
  }

  public async userWithdraw(user: User, amount: string): Promise<string> {
    if (user.kyc && user.kyc.publicKey) {
      const KYCSecret: string = await this.vaultService.getKYCSecret();
      let privateKey: string | undefined;
      privateKey = await this.vaultService.decryptData(KYCSecret, user.kyc.privateKey!);
      return this.blockchainService.userWithdraw(user.kyc.publicKey, privateKey!, amount);
    }
    throw new Error("User doesn't have a wallet!");
  }

  public async getUserEthBalance(userAdr: string): Promise<string> {
    return this.blockchainService.getWalletEthBalance(userAdr);
  }

  public async getUserTokenBalance(userAdr: string): Promise<string> {
    return this.blockchainService.getWalletTokenBalance(userAdr);
  }
}
