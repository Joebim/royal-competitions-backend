// @ts-ignore - No type definitions available
import mailchimp from '@mailchimp/mailchimp_marketing';
import { config } from './environment';
import logger from '../utils/logger';

// Configure Mailchimp
mailchimp.setConfig({
  apiKey: config.mailchimp.apiKey,
  server: config.mailchimp.serverPrefix,
});

// Test connection
export const testMailchimpConnection = async (): Promise<boolean> => {
  try {
    const response = await mailchimp.ping.get();
    logger.info('Mailchimp connected successfully:', response);
    return true;
  } catch (error) {
    logger.error('Mailchimp connection failed:', error);
    return false;
  }
};

export default mailchimp;

