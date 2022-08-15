import { sendMailJetEmail } from "../services/EmailService";
// import app_logger from "../logger/index"

export default class PubService {

    public sendEmail(to: string, subject: string, html: string) {
        sendMailJetEmail(to, subject, html)
    }

};