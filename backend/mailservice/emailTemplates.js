export const EMAIL_FROM = (senderEmail) => `FutStockZ <${senderEmail}>`;

export const VERIFICATION_EMAIL_SUBJECT = () => "Verify Your Email - FutStockZ";
export const VERIFICATION_EMAIL_TEXT = (code) => `Your verification code is: ${code}`;
export const getVerificationEmailTemplate = (code) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #4CAF50;">Verify Your Email</h2>
        <p>Thank you for registering. Please use the following code to verify your email address:</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; border-radius: 5px; margin: 20px 0;">
            ${code}
        </div>
        <p>If you did not request this, please ignore this email.</p>
    </div>
`;

export const WELCOME_EMAIL_SUBJECT = (appname) => `Welcome to ${appname}!`;
export const WELCOME_EMAIL_TEXT = () => "Welcome! We are glad to have you.";
export const getWelcomeEmailTemplate = (username, appname) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #4CAF50;">Welcome to ${appname}, ${username}!</h2>
        <p>We're thrilled to have you on board. Start exploring and enjoying our services today.</p>
        <p>Best Regards,<br/>The ${appname} Team</p>
    </div>
`;
