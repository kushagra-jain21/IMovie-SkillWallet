import dotenv from 'dotenv';
dotenv.config();

const requiredEnvs = ['JWT_ACCESS_SECRET'];

for (const envKey of requiredEnvs) {
  if (!process.env[envKey] && process.env.NODE_ENV === 'production') {
    throw new Error(`CRITICAL CONFIG ERROR: Missing required environment variable ${envKey}`);
  }
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/imovies',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'imovies_super_secret_jwt_access_token_key_change_in_production_2026',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '7d',
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'imovies_super_secret_refresh_token_key_change_in_production_2026',
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || 'simulated',
  PAYMENT_TEST_MODE: process.env.PAYMENT_TEST_MODE !== 'false',
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  ADMIN_SEED_NAME: process.env.ADMIN_SEED_NAME || 'Cinema SuperAdmin',
  ADMIN_SEED_EMAIL: process.env.ADMIN_SEED_EMAIL || 'admin@imovies.com',
  ADMIN_SEED_PASSWORD: process.env.ADMIN_SEED_PASSWORD || 'Admin@123456',
  ADMIN_SEED_PHONE: process.env.ADMIN_SEED_PHONE || '+919876543210',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT, 10) || 587,
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'IMovies Cinema <noreply@imovies.com>',
  EMAIL_VERIFICATION_TOKEN_TTL_MINUTES: parseInt(process.env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES, 10) || 60
};
