import { Twilio } from 'twilio';

export default class SMSService extends Twilio {

    /**
     * Checks if a number is in valid E.164 format
     * @param {string} number - Phone number to be validated
     * @returns {boolean}
     */
    private validE164(number: string): boolean {
        return /^\+?[1-9]\d{1,14}$/.test(number)
    };

    /**
     * Sends SMS to a user
     * @param {string} to - target phone number
     * @param {string} body - SMS' body
     * @param {string} messagingServiceSid - Messaging Service created on your Twilio account
     * @returns {Promise<object>}
     */ 
    sendSMS(to: string, body: string, messagingServiceSid: string): Promise<object> {
        return new Promise<object> ( 
            (resolve: (msg: any) => void,  
            reject: (err: Error) => void) => { 
                if ( !this.validE164(to) ) {
                    throw new Error('Phone number must be of E.164 format!');
                };
        
                this.messages 
                    .create({ 
                        body,  
                        messagingServiceSid,      
                        to 
                    }) 
                    .then((message) => {
                        resolve({
                            status: "SMS Successfully Sent",
                            message
                        });
                    }) 
                    .catch((err: Error) => {
                        reject(err);
                    });
            }
        );
    };
};