import express from "express";
import { Connection } from "typeorm";
import User from "../entity/User";
import HttpError, { StatusCode } from "../excptions/HttpError";
import UserService from "../services/UserService";
import asyncHandler, { AsyncMiddleware } from "./helpers/asyncHandler";
import emailConfirmationTemplate from "./emailConfirmationTemplate";
import jwt from "jsonwebtoken";
import app_logger from "../logger";
import { VerificationAttemptInstance } from "twilio/lib/rest/verify/v2/verificationAttempt";

export default class UserController {
  private userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
  }

  /**
   * Gets user id from request body and if user exist returns it
   * @returns {AsyncMiddleware}
   */
  public getUserById(): AsyncMiddleware {
    return asyncHandler(
      async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        const user: User | undefined = await this.userService.findById(
          req.body.id
        );
        if (!user) {
          const error: HttpError = new HttpError("User doesn't exists!");
          error.statusCode = StatusCode.NOT_FOUND;
          throw error;
        }

        return res.status(200).json(user);
      }
    );
  }

  /**
   * Checks user's token if it is valid or not
   * @returns {AsyncMiddleware}
   */
  public authMiddleware(): AsyncMiddleware {
    return asyncHandler(
      async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        const token: string | undefined =
          req.headers["authorization"]?.split(" ")[1];
        if (!token) {
          const error: HttpError = new HttpError("Invalid Token!");
          error.statusCode = StatusCode.UNAUTHORIZED;
          throw error;
        }
        let user: User | undefined;
        try {
          user = await this.userService.getUserByToken(token);
        } catch (error: any) {
          if (error.message === "jwt expired") {
            const _error: HttpError = new HttpError(error.message);
            _error.statusCode = StatusCode.UNAUTHORIZED;
            throw _error;
          }
          throw error;
        }

        if (!user) {
          const error: HttpError = new HttpError("User doesn't exist!");
          error.statusCode = StatusCode.NOT_FOUND;
          throw error;
        }

        req.user = user;
        next();
      }
    );
  }

  public refreshToken(): AsyncMiddleware {
    return asyncHandler(
      async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        const token: string | undefined =
          req.headers["authorization"]?.split(" ")[1];
        if (!token) {
          const error: HttpError = new HttpError(
            "Refresh token doesn't exists!"
          );
          error.statusCode = StatusCode.UNAUTHORIZED;
          throw error;
        }
        res
          .status(StatusCode.SUCCESSFUL_REQ)
          .json(await this.userService.refreshToken(token));
      }
    );
  }

  /**
   * Creates a new user and sends the verification email with a token in the link
   * Logs user's IP/OS/Browser info
   * @returns {AsyncMiddleware}
   */
  public createUser(): AsyncMiddleware {
    return asyncHandler(
      async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        let { email, password } = req.body;
        const _user: User | undefined = await this.userService.findByEmail(
          email
        );
        if (_user) {
          const error: HttpError = new HttpError(
            `This email address already exists!`
          );
          error.statusCode = StatusCode.NOT_FOUND;
          throw error;
        }

        const user = await this.userService.createUser(email, password);

        //
        let confirmationLink = `${req.headers.origin}/verification/${email}/${user.emailToken}`;

        this.userService.sendEmail(
          email,
          "Lynx - Email Verification",
          emailConfirmationTemplate(confirmationLink)
        );

        return res.status(StatusCode.RESOURCE_CREATED).json({ email });
      }
    );
  }

  /**
   * Decodes the token and changes the user's email status to verified
   * if the email is not already verified
   * @returns {AsyncMiddleware}
   */
  public confirmEmail(): AsyncMiddleware {
    return asyncHandler(
      async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        console.log(' start verfication....')
        const verifiedUser = await this.userService.verifyEmail(
          req.params.token
        );

        return res.status(StatusCode.SUCCESSFUL_REQ).json({ verifiedUser });
      }
    );
  }

  /**
   * Resends a verification email with a token
   * in the link if the email is not verified
   * and if the user exists.
   * @returns {AsyncMiddleware}
   */
  public resendEmail(): AsyncMiddleware {
    return asyncHandler(
      async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        const email: string = req.params.email;
        const _user = await this.userService.findByEmail(email);
        
        try {
          const emailTokenValue: string = await this.userService.resendEmail(
            email,
            _user
          );
          console.log('resending email ver...' + emailTokenValue)
          let confirmationLink = `${req.headers.origin}/verification/${email}/${emailTokenValue}`;

          this.userService.sendEmail(
            email,
            "Lynx - Email Verification",
            emailConfirmationTemplate(confirmationLink)
          );
        } catch (error: any) {
          if (
            error.message === "User with this Email address does not exist!"
          ) {
            const _error: HttpError = new HttpError(error.message);
            _error.statusCode = StatusCode.NOT_FOUND;
            throw _error;
          }
          if (error.message === "Email is already verified!") {
            const _error: HttpError = new HttpError(error.message);
            _error.statusCode = StatusCode.BAD_REQUEST;
            throw _error;
          }
          throw error;
        }

        return res.status(StatusCode.SUCCESSFUL_REQ).json({
          message: "Email resent",
          email,
        });
      }
    );
  }

  /**
   * Returns user's jsonwebtoken
   * Logs user's IP/OS/Browser info
   * @returns {AsyncMiddleware}
   */
  public login(): AsyncMiddleware {
    return asyncHandler(
      async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        const { email, password } = req.body;
        await this.userService.addActivityTracker(email, req);
        const token = await this.userService.loginUser(email, password);

        res.status(200).json(token);
      }
    );
  }

  /**
   * Sends an email to the user with
   * the token.
   * @returns {AsyncMiddleware}
   */
  public forgotPassword(): AsyncMiddleware {
    return asyncHandler(
      async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        const { email } = req.body;
        try {
          await this.userService.forgotPassword(email, req);
        } catch (error: any) {
          if (
            error.message === "User with this email address does not exist!"
          ) {
            const _error: HttpError = new HttpError(error.message);
            _error.statusCode = StatusCode.NOT_FOUND;
            throw _error;
          }
          if (
            error.message ===
            "Please confirm your email address before resetting the password!"
          ) {
            const _error: HttpError = new HttpError(error.message);
            _error.statusCode = StatusCode.BAD_REQUEST;
            throw _error;
          }
          throw error;
        }
        res.status(200).json({ email });
      }
    );
  }

  /**
   * Checks the token in the parameters of the link if it exists on the DB
   * @returns {AsyncMiddleware}
   */
  public resetPassword(): AsyncMiddleware {
    return asyncHandler(
      async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        const token: string = req.params.token;
        const { password } = req.body;
        let user: User;
        try {
          user = await this.userService.resetPassword(token, password);
        } catch (error: any) {
          if (
            error.message === "User with this ID does not exist!" ||
            error.message === "Token doesn't exits in our database!"
          ) {
            const _error: HttpError = new HttpError(error.message);
            _error.statusCode = StatusCode.NOT_FOUND;
            throw _error;
          }
          if (
            error.message ===
            "Please confirm your email address before resetting the password!"
          ) {
            const _error: HttpError = new HttpError(error.message);
            _error.statusCode = StatusCode.BAD_REQUEST;
            throw _error;
          }

          throw error;
        }
        res.status(200).json({ user });
      }
    );
  }

  /**
   * Updates the user's profile
   * Returns the updated user
   * @returns {Promise<AsyncMiddleware}
   */
  public completeProfile(): AsyncMiddleware {
    return asyncHandler(
      async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        const {
          firstName,
          middleName,
          lastName,
          idNumber,
          country,
          address,
          birthday,
          phone,
        } = req.body;
        let user: User = req.user;
        try {
          user = await this.userService.completeProfile(
            user,
            firstName,
            middleName,
            lastName,
            idNumber,
            country,
            address,
            birthday,
            phone
          );
        } catch (error: any) {
          if (error.message === "User with this ID does not exist!") {
            const _error: HttpError = new HttpError(error.message);
            _error.statusCode = StatusCode.NOT_FOUND;
            throw _error;
          }
          if (
            error.message ===
            "Please confirm your email address before completing your profile!"
          ) {
            const _error: HttpError = new HttpError(error.message);
            _error.statusCode = StatusCode.BAD_REQUEST;
            throw _error;
          }

          throw error;
        }

        res.status(200).json({
          firstName,
          lastName,
        });
      }
    );
  }

  /**
   * Returns the user's KYC info
   * @returns {Promise<AsyncMiddleware}
   */
  public getProfileInfo(): AsyncMiddleware {
    return asyncHandler(
      async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        const { email } = req.params;
        let kyc;

        try {
          kyc = await this.userService.getProfileInfo(email);
        } catch (error: any) {
          if (error.message === "User with this email does not exist!") {
            const _error: HttpError = new HttpError(error.message);
            _error.statusCode = StatusCode.NOT_FOUND;
            throw _error;
          }
          if (
            error.message ===
            "Please confirm your email address before completing your profile!"
          ) {
            const _error: HttpError = new HttpError(error.message);
            _error.statusCode = StatusCode.BAD_REQUEST;
            throw _error;
          }

          throw error;
        }

        res.status(StatusCode.SUCCESSFUL_REQ).json(kyc);
      }
    );
  }

  /**
   * Send a confiormation link on SMS
   * to the specified phone number
   * @returns {AsyncMiddleware}
   */
  public sendConfirmationSms(): AsyncMiddleware {
    return asyncHandler(
      async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        const { phoneNumber, id } = req.body;

        try {
          await this.userService.sendConfirmationSms(
            phoneNumber,
            id,
            req.headers.host!
          );
        } catch (error: any) {
          if (error.message === "User with this ID does not exist!") {
            const _error: HttpError = new HttpError(error.message);
            _error.statusCode = StatusCode.NOT_FOUND;
            throw _error;
          }

          if (
            error.message ===
            "Please confirm your email address before confirming your phone number!"
          ) {
            const _error: HttpError = new HttpError(error.message);
            _error.statusCode = StatusCode.BAD_REQUEST;
            throw _error;
          }
        }

        return res.status(StatusCode.SUCCESSFUL_REQ).json("SMS Sent");
      }
    );
  }

  /**
   * Decodes the token and changes the user's phone number status to verified
   * if the phone number is not already verified
   * @returns {Promise<AsyncMiddleware}
   */
  public confirmPhone(): AsyncMiddleware {
    return asyncHandler(
      async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        const verifiedUser = await this.userService.verifyPhone(
          req.params.token,
          req.params.phoneNumber
        );

        return res.status(StatusCode.SUCCESSFUL_REQ).json({ verifiedUser });
      }
    );
  }

  /**
   * Initiates the transfer and sends the email for approval
   * @returns {AsyncMiddleware}
   */
  public transferMoney(): AsyncMiddleware {
    return asyncHandler(
      async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        const { from, to, amount } = req.body;

        try {
          await this.userService.sendTransactionConfirmation(
            from,
            to,
            amount,
            req.headers.host!
          );
        } catch (error: any) {
          if (error.message === "User with this Email does not exist!") {
            const _error: HttpError = new HttpError(error.message);
            _error.statusCode = StatusCode.NOT_FOUND;
            throw _error;
          }

          if (
            error.message ===
            "Please complete your profile before sending funds!"
          ) {
            const _error: HttpError = new HttpError(error.message);
            _error.statusCode = StatusCode.BAD_REQUEST;
            throw _error;
          }

          if (error.message === "The receiver should complete his profile!") {
            const _error: HttpError = new HttpError(error.message);
            _error.statusCode = StatusCode.BAD_REQUEST;
            throw _error;
          }
        }

        return res
          .status(StatusCode.SUCCESSFUL_REQ)
          .json("Confirmation email sent!");
      }
    );
  }

  /**
   * Decodes the token, creates the transaction
   * @returns {AsyncMiddleware}
   */
  public approveTransaction(): AsyncMiddleware {
    return asyncHandler(
      async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        const { token, id } = req.params;

        let transaction;

        try {
          transaction = await this.userService.approveTransaction(
            token,
            parseInt(id)
          );
        } catch (error: any) {
          if (error.message === "Transaction with this Id does not exist!") {
            const _error: HttpError = new HttpError(error.message);
            _error.statusCode = StatusCode.NOT_FOUND;
            throw _error;
          }

          if (error.message === "Token doesn't exists!") {
            const _error: HttpError = new HttpError(error.message);
            _error.statusCode = StatusCode.NOT_FOUND;
            throw _error;
          }

          if (error.message === "User with this Id does not exist!") {
            const _error: HttpError = new HttpError(error.message);
            _error.statusCode = StatusCode.NOT_FOUND;
            throw _error;
          }

          if (error.message === `Insufficient balance!`) {
            const _error: HttpError = new HttpError(error.message);
            _error.statusCode = StatusCode.BAD_REQUEST;
            throw _error;
          }
        }

        return res.status(StatusCode.SUCCESSFUL_REQ).json({
          transaction,
          message: "Transaction sent!",
        });
      }
    );
  }

  public getPublicKey(): AsyncMiddleware {
    return asyncHandler(
      async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        const user: User = req.user;
        const publicKey: string = await this.userService.getPublicKey(user);
        return res.json(publicKey);
      }
    );
  }

  public getBalance(): AsyncMiddleware {
    return asyncHandler(
      async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        const user: User = req.user;
        const balance = await this.userService.getBalance(user);
        return res.json(balance);
      }
    );
  }

  public getTransactions(): AsyncMiddleware {
    return asyncHandler(
      async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        const user: User = req.user;
        const transactions = await this.userService.getTransactions(user);
        return res.json({ transactions });
      }
    );
  }

  /**
   * Changes the logged in user's pasword
   * @returns {AsyncMiddleware}
   */
  public changePassword(): AsyncMiddleware {
    return asyncHandler(
      async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        const { password } = req.body;

        let { user } = req;

        try {
          user = await this.userService.changePassword(user, password);
        } catch (error: any) {
          if (error.message === "User with this Email does not exist!") {
            const _error: HttpError = new HttpError(error.message);
            _error.statusCode = StatusCode.NOT_FOUND;
            throw _error;
          }
        }

        return res.status(StatusCode.SUCCESSFUL_REQ).json("Password Changed!");
      }
    );
  }

  //ARIAN

  public getUserTransactions(): AsyncMiddleware {
    return asyncHandler(
      async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        const { addr } = req.params;
        const trans: any = await this.userService.getUserTransactions(addr);
        return res.json(trans);
      }
    );
  }


  public getUserBalance(): AsyncMiddleware {
    return asyncHandler(
      async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        const user: User = req.user;
        const trans: number = await this.userService.getUserBalance(user);
        return res.json(trans);
      }
    );
  }

  public userDeposit(): AsyncMiddleware {
    return asyncHandler(
      async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        const amount = req.body.amount;
        const user: User = req.user;
        const trans: any = await this.userService.userDeposit(user, amount.toString());
        if (trans === 'ERR') {
          // const _error: HttpError = new HttpError(trans);
          // _error.statusCode = StatusCode.NOT_FOUND;
          // throw _error;
          return res.status(StatusCode.SUCCESSFUL_REQ).json("ERROR");
        }
        else
          return res.status(StatusCode.SUCCESSFUL_REQ).json("SUCCESS");
      }
    );
  }

  public userWithdraw(): AsyncMiddleware {
    return asyncHandler(
      async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        const amount = req.body.amount;
        const user: User = req.user;
        const trans: any = await this.userService.userWithdraw(user, amount.toString());
        return res.json(trans);
      }
    );
  }

  
  public getUserEthBalance(): AsyncMiddleware {
    return asyncHandler(
      async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        const { addr } = req.params;
        const trans: any = await this.userService.getUserEthBalance(addr);
        return res.json(trans);
      }
    );
  }
  
  public getUserTokenBalance(): AsyncMiddleware {
    return asyncHandler(
      async (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        const { addr } = req.params;
        const trans: any = await this.userService.getUserTokenBalance(addr);
        return res.json(trans);
      }
    );
  }

}
