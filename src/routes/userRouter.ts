import express from "express";
import asyncHandler from "../controllers/helpers/asyncHandler";
import UserController from "../controllers/UserController";

export default function(userController: UserController): express.Router {
    const router: express.Router = express.Router();

    router.post('/signup', userController.createUser());
    router.post('/signIn', userController.login());
    router.post('/refreshToken', userController.refreshToken());

    router.get('/verification/:email/:token', userController.confirmEmail());
    router.get('/resendEmail/:email', userController.resendEmail());

    router.post('/forgotPassword', userController.forgotPassword());
    router.post('/resetPassword/:token', userController.resetPassword());

    router.post('/changePassword', userController.authMiddleware(), userController.changePassword());

    router.post('/completeProfile', userController.authMiddleware(), userController.completeProfile());
    router.get('/getProfileInfo/:email', userController.authMiddleware(), userController.getProfileInfo());

    router.post('/sendConfirmation', userController.authMiddleware(), userController.sendConfirmationSms())
    router.get('/phoneVerification/:token/:phoneNumber', userController.confirmPhone());
    router.get('/wallet/publicKey', userController.authMiddleware(), userController.getPublicKey());

    router.post('/transfer', userController.authMiddleware(), userController.transferMoney());
    router.get('/confirmTransaction/:token/:id', userController.approveTransaction())

    router.get('/balance', userController.authMiddleware(), userController.getBalance());
    router.get('/transactions', userController.authMiddleware(), userController.getTransactions()); //send transactions
    router.post('/transfer', userController.authMiddleware(), userController.transferMoney());

    router.get('/usertransaction/:addr', userController.authMiddleware(), userController.getUserTransactions()); //deposit/withdraw transactions
    router.get('/userbalance', userController.authMiddleware(), userController.getUserBalance());
    router.post('/userdeposit', userController.authMiddleware(), userController.userDeposit());
    router.post('/userwithdraw', userController.authMiddleware(), userController.userWithdraw());
    router.get('/userEthBalance/:addr', userController.authMiddleware(), userController.getUserEthBalance());
    router.get('/userTokenBalance/:addr', userController.authMiddleware(), userController.getUserTokenBalance());

    return router;
}