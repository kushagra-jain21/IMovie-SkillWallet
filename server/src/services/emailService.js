import nodemailer from 'nodemailer';
import { env } from '../config/environment.js';
import { logger } from '../utils/logger.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.isMock = false;
    this.initTransporter();
  }

  initTransporter() {
    // If SMTP credentials are provided, use real SMTP transport
    if (env.SMTP_USER && env.SMTP_PASS && env.NODE_ENV !== 'test') {
      try {
        this.transporter = nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_SECURE,
          auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS
          }
        });
        this.isMock = false;
        logger.info(`EmailService: Real SMTP configured with host ${env.SMTP_HOST}:${env.SMTP_PORT} (${env.SMTP_USER})`);
      } catch (err) {
        logger.error('EmailService: Failed to configure SMTP transporter:', err.message);
        this.fallbackToMock();
      }
    } else {
      this.fallbackToMock();
    }
  }

  fallbackToMock() {
    this.isMock = true;
    this.transporter = nodemailer.createTransport({
      jsonTransport: true
    });
    logger.info('EmailService: Running in development mock mode (Verification codes and links will be logged to server console).');
  }

  /**
   * Sends a branded HTML verification email with both a direct verification link and a 6-digit OTP
   */
  async sendVerificationEmail({ to, name, token, otp }) {
    const clientUrl = env.CLIENT_URL || 'http://localhost:5173';
    const verificationUrl = `${clientUrl}/verify-email?token=${token}&email=${encodeURIComponent(to)}`;
    const ttlMinutes = env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES || 60;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verify Your IMovies Account</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0b0f17; color: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 580px; margin: 0 auto; background-color: #121824; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden; }
    .header { background: #e50914; padding: 28px 20px; text-align: center; }
    .logo { font-size: 26px; font-weight: bold; color: #ffffff; letter-spacing: 1px; }
    .body { padding: 32px 28px; line-height: 1.6; }
    .greeting { font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #ffffff; }
    .text { color: #94a3b8; font-size: 15px; margin-bottom: 24px; }
    .button-container { text-align: center; margin: 32px 0; }
    .btn { background-color: #e50914; color: #ffffff !important; text-decoration: none; font-size: 16px; font-weight: bold; padding: 14px 32px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 14px rgba(229,9,20,0.4); }
    .otp-box { background: #080b11; border: 1px solid rgba(229,9,20,0.4); border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0; }
    .otp-label { font-size: 12px; text-transform: uppercase; color: #94a3b8; letter-spacing: 1.5px; margin-bottom: 6px; }
    .otp-code { font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; color: #e50914; letter-spacing: 6px; }
    .footer { padding: 20px 28px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 12px; color: #64748b; text-align: center; }
    .fallback { word-break: break-all; color: #94a3b8; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">IMOVIES CINEMA</div>
    </div>
    <div class="body">
      <div class="greeting">Welcome to IMovies, ${name}!</div>
      <p class="text">
        Thank you for creating an account. To unlock real-time cinema seat reservations, movie booking history, and exclusive tickets, please verify your email address.
      </p>

      <div class="button-container">
        <a href="${verificationUrl}" target="_blank" class="btn">Verify Email Address</a>
      </div>

      <div class="otp-box">
        <div class="otp-label">Or Enter This 6-Digit Verification Code:</div>
        <div class="otp-code">${otp}</div>
      </div>

      <p class="text" style="font-size: 13px;">
        ⏳ This verification link and OTP code will expire in <strong>${ttlMinutes} minutes</strong>.
      </p>

      <p class="text" style="font-size: 12px; margin-top: 24px;">
        If the button above does not work, copy and paste this link into your browser:<br>
        <span class="fallback">${verificationUrl}</span>
      </p>
    </div>
    <div class="footer">
      If you did not sign up for an IMovies account, please disregard this email. Your email will remain inactive.<br>
      &copy; ${new Date().getFullYear()} IMovies Cinema Systems. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

    const plainText = `
Welcome to IMovies, ${name}!

Thank you for registering. Please verify your email address using the link below:
${verificationUrl}

Or enter your 6-digit verification code: ${otp}

This verification link and OTP will expire in ${ttlMinutes} minutes.

If you did not sign up for an IMovies account, please disregard this message.
`;

    const mailOptions = {
      from: env.EMAIL_FROM,
      to,
      subject: 'Verify Your IMovies Account',
      html: htmlContent,
      text: plainText
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);

      if (this.isMock) {
        logger.info(`=======================================================`);
        logger.info(`📧 [DEV EMAIL MOCK] Verification Email for ${to}`);
        logger.info(`🔑 6-Digit OTP: ${otp}`);
        logger.info(`🔗 Direct Verification Link: ${verificationUrl}`);
        logger.info(`=======================================================`);
      } else {
        logger.info(`Verification email sent to ${to} (MessageId: ${info.messageId})`);
      }

      return {
        success: true,
        messageId: info.messageId || 'mock-id',
        isMock: this.isMock,
        previewUrl: nodemailer.getTestMessageUrl(info) || null
      };
    } catch (err) {
      logger.error(`Failed to send verification email to ${to}:`, err.message);
      const deliveryError = new Error('Failed to deliver verification email. Please verify your email address or try again later.');
      deliveryError.statusCode = 502;
      throw deliveryError;
    }
  }
}

export const emailService = new EmailService();
