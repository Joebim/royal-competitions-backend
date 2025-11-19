import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

interface Config {
  nodeEnv: string;
  port: number;
  apiVersion: string;
  mongoUri: string;
  frontendUrl: string;
  allowedOrigins: string[];
  jwt: {
    secret: string;
    expire: string;
    refreshSecret: string;
    refreshExpire: string;
  };
  paypal: {
    clientId: string;
    clientSecret: string;
    baseUrl: string;
    webhookId: string;
    mode: string;
  };
  cloudinary: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    folder: string;
  };
  mailchimp: {
    apiKey: string;
    serverPrefix: string;
    audienceId: string;
  };
  klaviyo: {
    publicKey: string;
    privateKey: string;
  };
  email: {
    service: string;
    host: string;
    port: number;
    // No-reply email configuration
    noreply: {
      user: string;
      password: string;
      email: string;
      name: string;
    };
    // Info email configuration
    info: {
      user: string;
      password: string;
      email: string;
      name: string;
    };
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  upload: {
    maxFileSize: number;
    allowedTypes: string[];
  };
  cookies: {
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
  };
}

export const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  apiVersion: process.env.API_VERSION || 'v1',
  mongoUri:
    process.env.MONGODB_URI || 'mongodb://localhost:27017/royal-competitions',
  frontendUrl:
    process.env.FRONTEND_URL || 'https://www.royalcompetitions.co.uk',
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://www.royalcompetitions.co.uk',
        'https://royalcompetitions.co.uk',
      ],
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret',
    expire: process.env.JWT_EXPIRE || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your_refresh_secret',
    refreshExpire: process.env.JWT_REFRESH_EXPIRE || '30d',
  },
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    baseUrl: process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com',
    webhookId: process.env.PAYPAL_WEBHOOK_ID || '',
    mode: process.env.PAYPAL_MODE || 'sandbox', // 'sandbox' or 'live'
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'royal-competitions',
  },
  mailchimp: {
    apiKey: process.env.MAILCHIMP_API_KEY || '',
    serverPrefix: process.env.MAILCHIMP_SERVER_PREFIX || 'us1',
    audienceId: process.env.MAILCHIMP_AUDIENCE_ID || '',
  },
  klaviyo: {
    publicKey: process.env.KLAVIYO_PUBLIC_KEY || '',
    privateKey: process.env.KLAVIYO_PRIVATE_KEY || '',
  },
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    // No-reply email configuration (for verification, password reset)
    noreply: {
      user: process.env.EMAIL_NOREPLY_USER || '',
      password: process.env.EMAIL_NOREPLY_PASSWORD || '',
      email: process.env.EMAIL_NOREPLY || 'noreply@royalcompetitions.co.uk',
      name: process.env.EMAIL_NOREPLY_NAME || 'Royal Competitions',
    },
    // Info email configuration (for order updates, payments, winners)
    info: {
      user: process.env.EMAIL_INFO_USER || '',
      password: process.env.EMAIL_INFO_PASSWORD || '',
      email: process.env.EMAIL_INFO || 'info@royalcompetitions.co.uk',
      name: process.env.EMAIL_INFO_NAME || 'Royal Competitions',
    },
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
    allowedTypes: (
      process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp'
    ).split(','),
  },
  cookies: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite:
      (process.env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none') || 'lax',
    maxAge: parseInt(process.env.COOKIE_MAX_AGE || '604800000', 10), // 7 days in milliseconds
  },
};
