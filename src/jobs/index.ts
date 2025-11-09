import cron from 'node-cron';
import logger from '../utils/logger';

export const startScheduledJobs = () => {
  // Run every day at 2 AM
  cron.schedule('0 2 * * *', () => {
    logger.info('Running daily cleanup job');
    // Add cleanup logic here
  });

  // Run every hour
  cron.schedule('0 * * * *', () => {
    logger.info('Running hourly job');
    // Add hourly logic here
  });

  logger.info('Scheduled jobs started');
};




