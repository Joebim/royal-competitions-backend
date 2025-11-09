import { v2 as cloudinary } from 'cloudinary';
import { config } from './environment';
import logger from '../utils/logger';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: true,
});

// Test connection
export const testCloudinaryConnection = async (): Promise<boolean> => {
  try {
    await cloudinary.api.ping();
    logger.info('Cloudinary connected successfully');
    return true;
  } catch (error) {
    logger.error('Cloudinary connection failed:', error);
    return false;
  }
};

export default cloudinary;

