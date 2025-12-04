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
 * NOTE: Does NOT delete reserved tickets that belong to orders (those have 24-hour expiry)
 */
const cleanupExpiredReservations = async () => {
  try {
    // Get current UTC time explicitly using Date.now() which always returns UTC milliseconds
    const nowTimestamp = Date.now(); // UTC milliseconds since epoch
    const now = new Date(nowTimestamp); // Create Date from UTC milliseconds

    // Find expired reserved tickets that are NOT associated with orders
    // These are cart-only reservations (15 minutes expiry)
    // CRITICAL: Only delete tickets WITHOUT orderId - tickets with orderId have 24-hour expiry
    const expiredCartReservations = await Ticket.find({
      status: TicketStatus.RESERVED,
      orderId: { $exists: false }, // No orderId = cart reservation only - THIS IS THE KEY FILTER
      $or: [
        { reservedUntil: { $lt: now } },
        { reservedUntil: { $exists: false } }, // Handle tickets without reservedUntil
      ],
    });

    // Also clean up any cart reservations older than 20 minutes (safety net)
    const twentyMinutesAgo = new Date(now.getTime() - 20 * 60 * 1000);
    const oldCartReservations = await Ticket.find({
      status: TicketStatus.RESERVED,
      orderId: { $exists: false }, // No orderId = cart reservation only
      createdAt: { $lt: twentyMinutesAgo },
    });

    // Combine and get unique ticket IDs
    const ticketsToDelete = new Set([
      ...expiredCartReservations.map((t: any) => t._id.toString()),
      ...oldCartReservations.map((t: any) => t._id.toString()),
    ]);

    if (ticketsToDelete.size > 0) {
      const result = await Ticket.deleteMany({
        _id: { $in: Array.from(ticketsToDelete).map((id) => id) },
      });

      if (result.deletedCount > 0) {
        logger.info(`Cleaned up ${result.deletedCount} expired cart reservations`);
      }
    }
  } catch (error: any) {
    logger.error('Error cleaning up expired reservations:', error);
  }
};

/**
 * Mark orders as failed when their reserved tickets expire (24 hours)
 * Runs every 5 minutes
 */
const markOrdersFailedOnTicketExpiry = async () => {
  try {
    const now = new Date();
    
    // Find orders that are PENDING and have reserved tickets that have expired
    const expiredOrders = await Order.find({
      status: OrderStatus.PENDING,
      paymentStatus: OrderPaymentStatus.PENDING,
      ticketsReserved: { $exists: true, $ne: [] },
    });

    let failedCount = 0;

    for (const order of expiredOrders) {
      // Check if any of the order's reserved tickets have expired
      const expiredTickets = await Ticket.find({
        competitionId: order.competitionId,
        ticketNumber: { $in: order.ticketsReserved },
        status: TicketStatus.RESERVED,
        reservedUntil: { $lt: now },
      });

      // If all reserved tickets have expired, mark order as failed
      if (expiredTickets.length === order.ticketsReserved.length) {
        order.status = OrderStatus.FAILED;
        order.paymentStatus = OrderPaymentStatus.FAILED;
        await order.save();
        
        // Delete the expired reserved tickets
        await Ticket.deleteMany({
          competitionId: order.competitionId,
          ticketNumber: { $in: order.ticketsReserved },
          status: TicketStatus.RESERVED,
        });

        failedCount++;
        logger.info(
          `Marked order ${order.orderNumber} as FAILED - reserved tickets expired after 24 hours`
        );
      }
    }

    if (failedCount > 0) {
      logger.info(`Marked ${failedCount} order(s) as FAILED due to expired ticket reservations`);
    }
  } catch (error: any) {
    logger.error('Error marking orders as failed on ticket expiry:', error);
  }
};

/**
 * Run automatic draws for competitions
 * Runs every minute to check for competitions that need to be drawn
 * Triggers at the EXACT UTC time specified in drawAt field
 * Note: Dates from database are already UTC, no conversion needed
 *
 * Example: If drawAt is "2025-11-24T17:30:00.000Z", the draw will trigger
 * when the job runs at exactly 17:30:00 UTC (5:30 PM UTC)
 */
const runAutomaticDraws = async () => {
  try {
    // Get current UTC time explicitly using Date.now() which always returns UTC milliseconds
    // WORKAROUND: Add 1 hour to compensate for server timezone being 1 hour behind UTC
    // This ensures the draw triggers at the correct time
    const nowTimestamp = Date.now(); // UTC milliseconds since epoch
    const adjustedTimestamp = nowTimestamp + 60 * 60 * 1000; // Add 1 hour (3600000 ms)
    const now = new Date(adjustedTimestamp); // Create Date from adjusted UTC milliseconds
    const nowUTC = now.toISOString();

    // Get the current minute in UTC using explicit UTC methods
    // This ensures we're working with true UTC time, not local time
    const currentMinute = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        0,
        0
      )
    );
    const currentMinuteUTC = currentMinute.toISOString();

    // Use 1-hour window to catch competitions that should be drawn (for missed draws)
    // This ensures we catch draws even if the job was slightly delayed
    // Also add 1 hour to oneHourAgo to match the adjusted time
    const oneHourAgo = new Date(adjustedTimestamp - 60 * 60 * 1000);

    // Find competitions where drawAt has passed (drawAt <= now)
    // drawAt is already UTC from database, now is UTC - direct comparison
    // Only include competitions where drawAt has actually passed, within last hour window
    // This will trigger at the EXACT time when drawAt <= now
    const competitions = await Competition.find({
      status: {
        $in: [
          CompetitionStatus.LIVE,
          CompetitionStatus.CLOSED,
          CompetitionStatus.ENDED,
        ],
      },
      drawMode: DrawMode.AUTOMATIC,
      // Only trigger if drawAt has passed (drawAt <= now)
      // This ensures exact timing: when now reaches or exceeds drawAt, it triggers
      // And within last hour window (to catch missed draws)
      drawAt: {
        $lte: now, // drawAt must be less than or equal to now (has passed or is exactly now)
        $gte: oneHourAgo, // But not too old (within last hour)
      },
      drawnAt: { $exists: false }, // Not yet drawn
    });

    // Log all automatic competitions for debugging (only if there are any)
    const allAutomaticCompetitions = await Competition.find({
      status: {
        $in: [
          CompetitionStatus.LIVE,
          CompetitionStatus.CLOSED,
          CompetitionStatus.ENDED,
        ],
      },
      drawMode: DrawMode.AUTOMATIC,
      drawnAt: { $exists: false },
    }).select('_id drawAt status');

    if (allAutomaticCompetitions.length > 0) {
      logger.info(
        `Checking ${allAutomaticCompetitions.length} automatic draw competition(s) - Current UTC time: ${nowUTC} (Current minute: ${currentMinuteUTC})`
      );
      for (const comp of allAutomaticCompetitions) {
        const drawAtUTC = comp.drawAt.toISOString();
        const drawAtTimestamp = comp.drawAt.getTime(); // UTC milliseconds

        // Round drawAt to the minute for comparison using explicit UTC methods
        const drawAtMinute = new Date(
          Date.UTC(
            comp.drawAt.getUTCFullYear(),
            comp.drawAt.getUTCMonth(),
            comp.drawAt.getUTCDate(),
            comp.drawAt.getUTCHours(),
            comp.drawAt.getUTCMinutes(),
            0,
            0
          )
        );
        const drawAtMinuteUTC = drawAtMinute.toISOString();

        const timeDiffMs = drawAtTimestamp - adjustedTimestamp;
        const timeDiffSeconds = Math.floor(timeDiffMs / 1000);
        const timeDiffMinutes = Math.floor(timeDiffMs / (1000 * 60));
        const shouldDraw = drawAtTimestamp <= adjustedTimestamp;
        const isInWindow = drawAtTimestamp >= oneHourAgo.getTime();
        const isExactMinute =
          drawAtMinute.getTime() === currentMinute.getTime();

        logger.info(
          `Competition ${comp._id}: drawAt=${drawAtUTC} (minute: ${drawAtMinuteUTC}), now=${nowUTC} (minute: ${currentMinuteUTC}), diff=${timeDiffSeconds}s (${timeDiffMinutes} min), shouldDraw=${shouldDraw}, isExactMinute=${isExactMinute}, inWindow=${isInWindow}, status=${comp.status}`
        );
      }
    }

    if (competitions.length > 0) {
      logger.info(
        `Found ${competitions.length} competition(s) ready for automatic draw`
      );
    }

    for (const competition of competitions) {
      try {
        const competitionId = String(competition._id);
        // drawAt is already UTC from database, use it directly
        const drawAt = competition.drawAt;
        const drawAtUTC = drawAt.toISOString();
        const timeDiffMs = adjustedTimestamp - drawAt.getTime();
        const timeDiffSeconds = Math.floor(timeDiffMs / 1000);
        const timeDiffMinutes = Math.floor(timeDiffMs / (1000 * 60));

        // Log with precise timing information
        logger.info(
          `🎯 TRIGGERING automatic draw for competition ${competitionId} - drawAt: ${drawAtUTC}, now: ${nowUTC}, triggered ${timeDiffSeconds}s (${timeDiffMinutes} min) after drawAt`
        );

        await runAutomaticDraw(competitionId);
        logger.info(
          `✅ Automatic draw completed for competition ${competitionId}`
        );
      } catch (error: any) {
        logger.error(
          `❌ Error running automatic draw for competition ${String(competition._id)}:`,
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
      if (
        competition.ticketLimit !== null &&
        competition.ticketsSold >= competition.ticketLimit
      ) {
        competition.status = CompetitionStatus.CLOSED;
        await competition.save();
        logger.info(
          `Closed competition ${competition._id} - ticket limit reached`
        );
      }
    }
  } catch (error: any) {
    logger.error('Error closing competitions at limit:', error);
  }
};

/**
 * End competitions that have passed their endDate
 * Runs every 5 minutes
 * Note: endDate from database is already UTC, use it directly without conversion
 */
const endCompetitionsPastEndDate = async () => {
  try {
    // Get current UTC time explicitly using Date.now() which always returns UTC milliseconds
    // This ensures we get true UTC time regardless of server timezone settings
    const nowTimestamp = Date.now(); // UTC milliseconds since epoch
    const now = new Date(nowTimestamp); // Create Date from UTC milliseconds
    const competitions = await Competition.find({
      status: { $in: [CompetitionStatus.LIVE, CompetitionStatus.CLOSED] },
      endDate: { $exists: true, $lte: now },
    });

    for (const competition of competitions) {
      // endDate is already UTC from database, direct comparison
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

/**
 * Debug job to log timing information for next automatic draw
 * Runs every minute to help debug timing issues
 * Logs: current time, next draw competition name, hours until draw
 */
const debugNextDrawTiming = async () => {
  try {
    // Get current UTC time explicitly using Date.now() which always returns UTC milliseconds
    // WORKAROUND: Add 1 hour to compensate for server timezone being 1 hour behind UTC
    const nowTimestamp = Date.now(); // UTC milliseconds since epoch
    const adjustedTimestamp = nowTimestamp + 60 * 60 * 1000; // Add 1 hour (3600000 ms)
    const now = new Date(adjustedTimestamp); // Create Date from adjusted UTC milliseconds
    const nowUTC = now.toISOString();

    // Find the next upcoming automatic draw (not yet drawn)
    const nextDraw = await Competition.findOne({
      status: {
        $in: [
          CompetitionStatus.LIVE,
          CompetitionStatus.CLOSED,
          CompetitionStatus.ENDED,
        ],
      },
      drawMode: DrawMode.AUTOMATIC,
      drawAt: { $exists: true, $gt: new Date(adjustedTimestamp) }, // drawAt is in the future (using adjusted time)
      drawnAt: { $exists: false }, // Not yet drawn
    })
      .select('_id title drawAt status')
      .sort({ drawAt: 1 }); // Sort by drawAt ascending (earliest first)

    if (nextDraw) {
      const drawAtTimestamp = nextDraw.drawAt.getTime();
      const timeDiffMs = drawAtTimestamp - adjustedTimestamp;
      const timeDiffHours = (timeDiffMs / (1000 * 60 * 60)).toFixed(2);
      const timeDiffMinutes = Math.floor(timeDiffMs / (1000 * 60));
      const timeDiffSeconds = Math.floor((timeDiffMs % (1000 * 60)) / 1000);

      // Format current time for display
      const currentTimeFormatted =
        now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
      const drawTimeFormatted =
        nextDraw.drawAt.toISOString().replace('T', ' ').substring(0, 19) +
        ' UTC';

      logger.info(
        `🕐 DEBUG TIMING: Current Time: ${currentTimeFormatted} | Next Draw: "${nextDraw.title}" (ID: ${nextDraw._id}) | Draw Time: ${drawTimeFormatted} | Time Until Draw: ${timeDiffHours} hours (${timeDiffMinutes} min ${timeDiffSeconds}s) | Status: ${nextDraw.status}`
      );
    } else {
      logger.info(
        `🕐 DEBUG TIMING: Current Time: ${nowUTC} | No upcoming automatic draws found`
      );
    }
  } catch (error: any) {
    logger.error('Error in debug timing job:', error);
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

  // Debug timing job - runs every minute to show next draw timing
  cron.schedule('* * * * *', () => {
    debugNextDrawTiming();
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

  // Mark orders as failed when reserved tickets expire (24 hours)
  cron.schedule('*/5 * * * *', () => {
    logger.info('Running order expiry check job');
    markOrdersFailedOnTicketExpiry();
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
    // Get current UTC time explicitly using Date.now() which always returns UTC milliseconds
    const nowTimestamp = Date.now(); // UTC milliseconds since epoch
    const fifteenMinutesAgo = new Date(nowTimestamp - 15 * 60 * 1000);

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
        logger.info(
          `Tracked abandoned checkout for order ${order.orderNumber} (${email})`
        );
      } catch (error: any) {
        logger.error(
          `Error tracking abandoned checkout for order ${order._id}:`,
          error
        );
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
