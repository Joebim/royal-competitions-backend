import app from './app';
import { connectDatabase } from './config/database';
import { config } from './config/environment';
import logger from './utils/logger';
import { startScheduledJobs } from './jobs';

const PORT = config.port || 5000;

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...', error);
  process.exit(1);
});


// Connect to database
connectDatabase();

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
  
  // Start scheduled jobs
  if (config.nodeEnv === 'production') {
    startScheduledJobs();
    logger.info('Scheduled jobs started');
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error: Error) => {
  logger.error('UNHANDLED REJECTION! Shutting down...', error);
  server.close(() => {
    process.exit(1);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated');
  });
});

export default server;

