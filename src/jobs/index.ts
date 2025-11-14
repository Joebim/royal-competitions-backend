import cron from 'node-cron';
import logger from '../utils/logger';
import { Competition, Ticket, TicketStatus } from '../models';
import { CompetitionStatus, DrawMode } from '../models/Competition.model';
import { runAutomaticDraw } from '../controllers/draw.controller';

/**
 * Clean up expired reservations
 * Runs every 5 minutes
 */
const cleanupExpiredReservations = async () => {
  try {
    const now = new Date();
    const result = await Ticket.deleteMany({
      status: TicketStatus.RESERVED,
      reservedUntil: { $lt: now },
    });

    if (result.deletedCount > 0) {
      logger.info(`Cleaned up ${result.deletedCount} expired reservations`);
    }
  } catch (error: any) {
    logger.error('Error cleaning up expired reservations:', error);
  }
};

/**
 * Run automatic draws for competitions
 * Runs every minute to check for competitions that need to be drawn
 */
const runAutomaticDraws = async () => {
  try {
    const now = new Date();
    // Find competitions that should be drawn now (within the last minute to account for job timing)
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    const competitions = await Competition.find({
      status: { $in: [CompetitionStatus.LIVE, CompetitionStatus.CLOSED] },
      drawMode: DrawMode.AUTOMATIC,
      drawAt: { $lte: now, $gte: oneMinuteAgo },
      drawnAt: { $exists: false }, // Not yet drawn
    });

    for (const competition of competitions) {
      try {
        const competitionId = String(competition._id);
        logger.info(`Running automatic draw for competition ${competitionId}`);
        await runAutomaticDraw(competitionId);
        logger.info(`Automatic draw completed for competition ${competitionId}`);
      } catch (error: any) {
        logger.error(
          `Error running automatic draw for competition ${String(competition._id)}:`,
          error
        );
      }
    }
  } catch (error: any) {
    logger.error('Error running automatic draws:', error);
  }
};

/**
 * Close competitions that have reached their ticket limit
 * Runs every 5 minutes
 */
const closeCompetitionsAtLimit = async () => {
  try {
    const competitions = await Competition.find({
      status: CompetitionStatus.LIVE,
      ticketLimit: { $ne: null },
    });

    for (const competition of competitions) {
      if (competition.ticketLimit !== null && competition.ticketsSold >= competition.ticketLimit) {
        competition.status = CompetitionStatus.CLOSED;
        await competition.save();
        logger.info(`Closed competition ${competition._id} - ticket limit reached`);
      }
    }
  } catch (error: any) {
    logger.error('Error closing competitions at limit:', error);
  }
};

export const startScheduledJobs = () => {
  // Clean up expired reservations every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    logger.info('Running reservation cleanup job');
    cleanupExpiredReservations();
  });

  // Run automatic draws every minute
  cron.schedule('* * * * *', () => {
    logger.info('Running automatic draw job');
    runAutomaticDraws();
  });

  // Close competitions at ticket limit every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    logger.info('Running competition limit check job');
    closeCompetitionsAtLimit();
  });

  logger.info('Scheduled jobs started');
};




