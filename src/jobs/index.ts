import cron from 'node-cron';
import logger from '../utils/logger';
import { Competition, Ticket, TicketStatus, Order } from '../models';
import { CompetitionStatus, DrawMode } from '../models/Competition.model';
import { OrderPaymentStatus, OrderStatus } from '../models/Order.model';
import { runAutomaticDraw } from '../controllers/draw.controller';
import klaviyoService from '../services/klaviyo.service';

/**
 * Clean up expired reservations
 * Runs every 2 minutes for more aggressive cleanup
 * Also handles reservations that are past their expiration time
 */
const cleanupExpiredReservations = async () => {
  try {
    const now = new Date();
    
    // Delete expired reservations
    const result = await Ticket.deleteMany({
      status: TicketStatus.RESERVED,
      $or: [
        { reservedUntil: { $lt: now } },
        { reservedUntil: { $exists: false } }, // Handle tickets without reservedUntil
      ],
    });

    if (result.deletedCount > 0) {
      logger.info(`Cleaned up ${result.deletedCount} expired reservations`);
    }

    // Also clean up any reservations older than 20 minutes (safety net)
    const twentyMinutesAgo = new Date(now.getTime() - 20 * 60 * 1000);
    const oldReservations = await Ticket.deleteMany({
      status: TicketStatus.RESERVED,
      createdAt: { $lt: twentyMinutesAgo },
    });

    if (oldReservations.deletedCount > 0) {
      logger.info(`Cleaned up ${oldReservations.deletedCount} old reservations (safety net)`);
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
      status: { $in: [CompetitionStatus.LIVE, CompetitionStatus.CLOSED, CompetitionStatus.ENDED] },
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

/**
 * End competitions that have passed their endDate
 * Runs every 5 minutes
 */
const endCompetitionsPastEndDate = async () => {
  try {
    const now = new Date();
    const competitions = await Competition.find({
      status: { $in: [CompetitionStatus.LIVE, CompetitionStatus.CLOSED] },
      endDate: { $exists: true, $lte: now },
    });

    for (const competition of competitions) {
      if (competition.endDate && competition.endDate <= now) {
        competition.status = CompetitionStatus.ENDED;
        competition.isActive = false;
        await competition.save();
        logger.info(`Ended competition ${competition._id} - endDate passed`);
      }
    }
  } catch (error: any) {
    logger.error('Error ending competitions past endDate:', error);
  }
};

export const startScheduledJobs = () => {
  // Clean up expired reservations every 2 minutes for more aggressive cleanup
  cron.schedule('*/2 * * * *', () => {
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

  // End competitions past endDate every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    logger.info('Running competition end date check job');
    endCompetitionsPastEndDate();
  });

  // Detect and track abandoned checkouts every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    logger.info('Running abandoned checkout detection job');
    detectAbandonedCheckouts();
  });

  logger.info('Scheduled jobs started');
};

/**
 * Detect abandoned checkouts and track in Klaviyo
 * Finds orders that are PENDING and created more than 15 minutes ago
 * Tracks "Abandoned Checkout" event and marks order for tracking
 * Runs every 5 minutes
 */
const detectAbandonedCheckouts = async () => {
  try {
    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

    // Find orders that are:
    // 1. PENDING payment status
    // 2. Created more than 15 minutes ago
    // 3. Have billing email (required for Klaviyo tracking)
    // 4. Haven't been marked as abandoned yet (we'll use a flag or check if event was tracked)
    const abandonedOrders = await Order.find({
      paymentStatus: OrderPaymentStatus.PENDING,
      status: OrderStatus.PENDING,
      createdAt: { $lte: fifteenMinutesAgo },
      'billingDetails.email': { $exists: true, $ne: null },
      // Add a field to track if abandoned checkout event was sent
      // For now, we'll check if order doesn't have paymentReference (not paid)
      paymentReference: { $exists: false },
    })
      .populate('competitionId', 'title')
      .limit(100); // Process max 100 at a time to avoid overload

    let trackedCount = 0;

    for (const order of abandonedOrders) {
      try {
        const email = order.billingDetails?.email;
        if (!email) continue;

        const competition = order.competitionId as any;
        const competitionId = String(order.competitionId);
        const orderAmount = order.amount || 0;

        // Track "Abandoned Checkout" event in Klaviyo
        await klaviyoService.trackEvent(
          email,
          'Abandoned Checkout',
          {
            competition_id: competitionId,
            competition_name: competition?.title || 'Unknown Competition',
            order_id: String(order._id),
            order_number: order.orderNumber,
            items: [
              {
                competition_id: competitionId,
                competition_name: competition?.title || 'Unknown Competition',
                quantity: order.quantity,
                ticket_numbers: order.ticketsReserved || [],
              },
            ],
          },
          orderAmount
        );

        trackedCount++;
        logger.info(`Tracked abandoned checkout for order ${order.orderNumber} (${email})`);
      } catch (error: any) {
        logger.error(`Error tracking abandoned checkout for order ${order._id}:`, error);
        // Continue with next order
      }
    }

    if (trackedCount > 0) {
      logger.info(`Detected and tracked ${trackedCount} abandoned checkouts`);
    }
  } catch (error: any) {
    logger.error('Error detecting abandoned checkouts:', error);
  }
};




