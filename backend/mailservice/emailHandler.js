import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

import * as et from "./emailTemplates.js";

const SENDER_EMAIL = process.env.EMAIL_FROM || process.env.SMTP_USER;

const DEFAULT_ATTACHMENTS = [{
    filename: 'ours-logo.png',
    path: '',
    /*path: path.join(__dirname, '../../website/src/assets/ours-logo.png'),*/
    cid: 'ourslogo'
}];

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 465,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    }
});

transporter.verify(function (error, success) {
    if (error) {
        console.error('SMTP Connection Error:', error);
    } else {
        console.log('SMTP Server is ready to take our messages');
    }
});

// Helper function to check if we should send real emails or log them
const shouldLogEmail = () => {
    return !process.env.SMTP_USER || process.env.MODE_ENV === 'development';
};

const logEmail = (to, subject, content) => {
    console.log('---------------------------------------------------');
    console.log('⚠️  EMAIL CONFIG MISSING OR DEV MODE - LOGGING MAIL ⚠️');
    console.log('⚠️  CHECK THE ENV VARIABLES AND UNSET MODE_ENV      ⚠️');
    console.log('⚠️  CHECK THE MAIL SERVICE VARIABLES                ⚠️');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    if (content) console.log(`Content Snippet: ${content.substring(0, 50)}...`);
    console.log('---------------------------------------------------');
};

export const sendVerificationEmail = async (email, code) => {
    try {
        if (shouldLogEmail()) {
            logEmail(email, et.VERIFICATION_EMAIL_SUBJECT(), `Code: ${code}`);
            return true;
        }

        const mailOptions = {
            from: et.EMAIL_FROM(SENDER_EMAIL),
            to: email,
            subject: et.VERIFICATION_EMAIL_SUBJECT(),
            text: et.VERIFICATION_EMAIL_TEXT(code),
            html: et.getVerificationEmailTemplate(code),
            attachments: DEFAULT_ATTACHMENTS
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Verification email sent to ${email}: \n ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('Error Sending Email: ', error.message);
        return false;
    }
};

export const sendWelcomeEmail = async (email, username) => {
    const appname = "FutStockZ"; // Or get from config
    try {
        if (shouldLogEmail()) {
            logEmail(email, et.WELCOME_EMAIL_SUBJECT(appname), "Welcome!");
            return true;
        }

        const mailOptions = {
            from: et.EMAIL_FROM(SENDER_EMAIL),
            to: email,
            subject: et.WELCOME_EMAIL_SUBJECT(appname),
            text: et.WELCOME_EMAIL_TEXT(),
            html: et.getWelcomeEmailTemplate(username, appname),
            attachments: DEFAULT_ATTACHMENTS
        };
        const info = await transporter.sendMail(mailOptions);
        console.log(`Welcome email sent to ${email} : \n ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('Error Sending Email: ', error);
        return false;
    }
};
