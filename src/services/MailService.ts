//import { Transporter, createTransport } from 'nodemailer'; 

//class MailService {

    // private _transporter?: Transporter;
    // private username?: string;
    // private password?: string;
    // static instace: MailService;

    // /**
    //  * Creates an email service
    //  * @param {string} emailAddress - Service email address
    //  * @param {string} emailPassword - Service email password
    //  */
    // constructor(emailAddress: string, emailPassword: string) {
    //     if ( !MailService.instace ) {
    //         this.username = emailAddress;
    //         this.password = emailPassword;
    
    //         this._transporter = createTransport(
    //             {
    //                 service: 'Yahoo',
    //                 secure: false,
    //                 port: 3000,
    //                 debug: false,
    //                 logger: true,
    //                 auth: {
    //                   user: this.username,
    //                   pass: this.password,
    //                 }
    //             }
    //         );

    //         MailService.instace = this;
    //     }

    //     return MailService.instace;
    // }

    // /**
    //  * Sends email to a user
    //  * @param {string} to - target email address 
    //  * @param {string} subject - email's subject
    //  * @param {string} html - email's html body
    //  * @returns {Promise<string>}
    //  */
    // sendMail(to: string, subject: string, html: string) : Promise<string> { 
    //     let options = { 
    //         from: this.username, 
    //         to, 
    //         subject, 
    //         html 
    //     } 
    
    //     return new Promise<string> ( 
    //         (resolve: (msg: any) => void,  
    //         reject: (err: Error) => void) => { 
    //             this._transporter?.sendMail( options, (error, data) => { 
    //                 if (error) { 
    //                     reject(error); 
    //                 } else { 
    //                     resolve(`Email Successfully sent: ${data.response}`); 
    //                 } 
    //             }) 
    //         } 
    //     )
    // }
// }

// const mailService = new MailService(
//     //process.env.EMAIL_ADDRESS || 'abajollari@lynxdigital.org', 
//     //process.env.EMAIL_PASSWORD || 'Lryan@1122'
// );
// //Object.freeze(mailService);
// export default mailService;