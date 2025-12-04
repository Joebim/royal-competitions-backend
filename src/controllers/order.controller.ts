import { Request, Response, NextFunction } from 'express';
import {
  Order,
  Competition,
  Ticket,
  TicketStatus,
  Event,
  EventType,
  User,
} from '../models';
import { OrderPaymentStatus, OrderStatus } from '../models/Order.model';
import { CompetitionStatus } from '../models/Competition.model';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import { getPagination } from '../utils/pagination';
import { UserRole } from '../models';
import { generateOrderNumber } from '../utils/randomGenerator';
import emailService from '../services/email.service';
import klaviyoService from '../services/klaviyo.service';
import logger from '../utils/logger';

const formatOrderResponse = (order: any) => {
  const doc = order.toObject ? order.toObject() : order;
  return {
    id: doc._id,
    competitionId: doc.competitionId,
    userId: doc.userId,
    orderNumber: doc.orderNumber,
    amount: doc.amount || doc.amountPence, // Support legacy amountPence
    amountGBP: (
      doc.amount || (doc.amountPence ? doc.amountPence / 100 : 0)
    ).toFixed(2),
    currency: doc.currency,
    quantity: doc.quantity,
    status: doc.status,
    paymentStatus: doc.paymentStatus,
    squarePaymentId: doc.squarePaymentId,
    ticketsReserved: doc.ticketsReserved,
    paymentReference: doc.paymentReference,
    billingDetails: doc.billingDetails,
    shippingAddress: doc.shippingAddress,
    marketingOptIn: doc.marketingOptIn,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

const buildPaginationMeta = (page: number, limit: number, total: number) => ({
  pagination: {
    page,
    limit,
    totalItems: total,
    totalPages: Math.ceil(total / limit) || 1,
  },
});

export const getMyOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const status = req.query.status as OrderStatus | undefined;
    const paymentStatus = req.query.paymentStatus as
      | OrderPaymentStatus
      | undefined;

    const query: Record<string, any> = { userId: req.user._id };
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const { skip, limit: pageLimit } = getPagination(page, limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('competitionId', 'title prize images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit),
      Order.countDocuments(query),
    ]);

    res.json(
      ApiResponse.success(
        {
          orders: orders.map((order) => formatOrderResponse(order)),
        },
        'Orders retrieved successfully',
        buildPaginationMeta(page, pageLimit, total)
      )
    );
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      throw new ApiError('Order not found', 404);
    }

    // Check authorization - user must own the order or be admin
    const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(req.user.role);
    const orderUserId = order.userId?.toString();
    const isOrderOwner = orderUserId && orderUserId === String(req.user._id);

    if (!isAdmin && !isOrderOwner) {
      throw new ApiError('Not authorized to access this order', 403);
    }

    // Populate competition for response
    await order.populate('competitionId', 'title prize images');

    // Get tickets for this order
    const tickets = await Ticket.find({
      orderId: order._id,
      status: { $in: [TicketStatus.ACTIVE, TicketStatus.WINNER] },
    })
      .select('ticketNumber status createdAt')
      .sort({ ticketNumber: 1 })
      .lean();

    const orderResponse = formatOrderResponse(order);
    (orderResponse as any).tickets = tickets;

    res.json(
      ApiResponse.success(
        { order: orderResponse },
        'Order status retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

export const getUserOrdersForAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const { skip, limit: pageLimit } = getPagination(page, limit);

    const userId = req.params.userId;

    const [orders, total] = await Promise.all([
      Order.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit),
      Order.countDocuments({ userId }),
    ]);

    res.json(
      ApiResponse.success(
        {
          orders: orders.map((order) => formatOrderResponse(order)),
        },
        'Orders retrieved successfully',
        buildPaginationMeta(page, pageLimit, total)
      )
    );
  } catch (error) {
    next(error);
  }
};

export const getAllOrdersForAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const { skip, limit: pageLimit } = getPagination(page, limit);

    const filters: Record<string, any> = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.paymentStatus)
      filters.paymentStatus = req.query.paymentStatus;
    if (req.query.competitionId)
      filters.competitionId = req.query.competitionId;

    if (req.query.search) {
      filters.$or = [
        { paymentReference: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(filters)
        .populate('competitionId', 'title prize')
        .populate('userId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit),
      Order.countDocuments(filters),
    ]);

    res.json(
      ApiResponse.success(
        {
          orders: orders.map((order) => formatOrderResponse(order)),
        },
        'Orders retrieved successfully',
        buildPaginationMeta(page, pageLimit, total)
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Create order
 * POST /api/v1/orders
 */
export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  try {
    logger.info('📦 [ORDER] ===== CREATE ORDER =====', {
      userId: req.user?._id,
      timestamp: new Date().toISOString(),
    });

    if (!req.user) {
      logger.warn('📦 [ORDER] Unauthorized - no user');
      throw new ApiError('Not authorized', 401);
    }

    const {
      competitionId,
      qty,
      ticketsReserved, // Optional - will be auto-reserved if not provided
      ticketsValid, // Optional - boolean or array of booleans indicating if tickets are valid (default: true)
      billingDetails,
      shippingAddress,
      marketingOptIn,
    } = req.body;

    logger.info('📦 [ORDER] Request received from frontend', {
      userId: req.user._id,
      competitionId,
      qty,
      ticketsReserved,
      ticketsReservedCount: ticketsReserved?.length || 0,
      ticketsValid,
      hasBillingDetails: !!billingDetails,
      billingEmail: billingDetails?.email,
      hasShippingAddress: !!shippingAddress,
      marketingOptIn,
    });

    if (!competitionId || !qty) {
      throw new ApiError('Missing required fields: competitionId and qty', 400);
    }

    if (ticketsReserved && !Array.isArray(ticketsReserved)) {
      throw new ApiError('ticketsReserved must be an array if provided', 400);
    }

    if (!billingDetails || !billingDetails.email) {
      throw new ApiError('Billing details with email are required', 400);
    }

    // Get competition
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      throw new ApiError('Competition not found', 404);
    }

    // Check if competition has ended (endDate passed) - CHECK THIS FIRST
    const now = new Date();
    if (competition.endDate && competition.endDate <= now) {
      throw new ApiError(
        'This competition has ended and is no longer accepting entries',
        400
      );
    }

    // Check if competition status indicates it's ended
    if (
      competition.status === CompetitionStatus.ENDED ||
      competition.status === CompetitionStatus.DRAWN ||
      competition.status === CompetitionStatus.CANCELLED
    ) {
      throw new ApiError(
        'This competition is no longer accepting entries',
        400
      );
    }

    // Check if competition is active
    if (!competition.isActive) {
      throw new ApiError('Competition is not active', 400);
    }

    // Check if competition is live and accepting entries
    if (competition.status !== CompetitionStatus.LIVE) {
      throw new ApiError(
        'This competition is not currently accepting entries',
        400
      );
    }

    // Check available tickets
    const availableTickets =
      competition.ticketLimit !== null
        ? competition.ticketLimit - competition.ticketsSold
        : Infinity;

    if (availableTickets !== Infinity && qty > availableTickets) {
      throw new ApiError(
        `Only ${availableTickets} tickets remaining for this competition`,
        400
      );
    }

    // Tickets must be provided
    if (!ticketsReserved || !Array.isArray(ticketsReserved) || ticketsReserved.length === 0) {
      throw new ApiError(
        'ticketsReserved array is required and must contain ticket numbers',
        400
      );
    }

    if (ticketsReserved.length !== qty) {
      throw new ApiError(
        `ticketsReserved array length (${ticketsReserved.length}) must match quantity (${qty})`,
        400
      );
    }

    // Check if tickets are already reserved or need to be reserved
    const existingTickets = await Ticket.find({
      competitionId,
      ticketNumber: { $in: ticketsReserved },
    });

    const existingNumbers = new Set(
      existingTickets.map((t) => t.ticketNumber)
    );

    // Check if any tickets are already taken (ACTIVE or WINNER)
    const takenTickets = existingTickets.filter(
      (t) => t.status === TicketStatus.ACTIVE || t.status === TicketStatus.WINNER
    );

    if (takenTickets.length > 0) {
      const takenNumbers = takenTickets.map((t) => t.ticketNumber);
      throw new ApiError(
        `Ticket number(s) ${takenNumbers.join(', ')} are already purchased. Please select different tickets.`,
        400
      );
    }

    // Verify provided reserved tickets exist and are still reserved, or reserve them if they don't exist
    // Note: We check for tickets regardless of expiry, as we'll extend them to 24 hours
    const reservedTickets = await Ticket.find({
      competitionId,
      ticketNumber: { $in: ticketsReserved },
      status: TicketStatus.RESERVED,
    });

    // If tickets don't exist or are expired, reserve them now (for guest checkout or expired cart reservations)
    const missingNumbers = ticketsReserved.filter(
      (num) => !existingNumbers.has(num)
    );

    const expiredTicketsInValidation = existingTickets.filter(
      (t) =>
        t.status === TicketStatus.RESERVED &&
        (t.reservedUntil === undefined || new Date(t.reservedUntil) <= now)
    );

    const expiredNumbers = expiredTicketsInValidation.map((t) => t.ticketNumber);
    const numbersToReserve = [...missingNumbers, ...expiredNumbers];

    if (numbersToReserve.length > 0) {
      // Reserve missing/expired tickets with 24-hour expiry
      const reservedUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours for orders
      const ticketsToCreate = numbersToReserve.map((ticketNumber) => ({
        competitionId,
        ticketNumber,
        userId: req.user?._id || undefined, // Use order userId
        status: TicketStatus.RESERVED,
        reservedUntil,
      }));

      try {
        await Ticket.insertMany(ticketsToCreate, { ordered: false });
        logger.info(
          `Auto-reserved ${numbersToReserve.length} tickets for order creation`,
          {
            competitionId,
            ticketNumbers: numbersToReserve,
            userId: req.user?._id,
          }
        );
      } catch (insertError: any) {
        if (insertError.code === 11000) {
          throw new ApiError(
            'Some tickets are no longer available. Please try again.',
            409
          );
        }
        throw insertError;
      }
    }

    // Verify all tickets are now reserved
    const finalReservedTickets = await Ticket.find({
      competitionId,
      ticketNumber: { $in: ticketsReserved },
      status: TicketStatus.RESERVED,
    });

    if (finalReservedTickets.length !== qty) {
      // Get detailed information about what happened to the tickets
      const allTickets = await Ticket.find({
        competitionId,
        ticketNumber: { $in: ticketsReserved },
      }).lean();

      const foundNumbers = new Set(
        allTickets.map((t: any) => t.ticketNumber)
      );
      const missingNumbers = (ticketsReserved as number[]).filter(
        (num: number) => !foundNumbers.has(num)
      );

      const expiredTicketsInError = allTickets.filter(
        (t: any) =>
          t.status === TicketStatus.RESERVED &&
          t.reservedUntil &&
          new Date(t.reservedUntil) <= now
      );

      const purchasedTickets = allTickets.filter(
        (t: any) =>
          t.status === TicketStatus.ACTIVE || t.status === TicketStatus.WINNER
      );

      // Build detailed error message
      let errorMessage = 'Unable to reserve all tickets. ';
      const details: string[] = [];

      const allTicketsAfterReserve = await Ticket.find({
        competitionId,
        ticketNumber: { $in: ticketsReserved },
      }).lean();

      const foundAfterReserve = new Set(
        allTicketsAfterReserve.map((t: any) => t.ticketNumber)
      );
      const stillMissingAfterReserve = ticketsReserved.filter(
        (num) => !foundAfterReserve.has(num)
      );

      if (stillMissingAfterReserve.length > 0) {
        details.push(
          `${stillMissingAfterReserve.length} ticket(s) could not be reserved`
        );
      }

      if (details.length > 0) {
        errorMessage += `Details: ${details.join(', ')}.`;
      }

      errorMessage += ' Please try again or select different tickets.';

      // Log detailed information for debugging
      logger.warn('Reserved tickets validation failed', {
        competitionId,
        requestedTickets: ticketsReserved,
        requestedQuantity: qty,
        foundReserved: reservedTickets.length,
        missingNumbers,
        expiredCount: expiredTicketsInError.length,
        purchasedCount: purchasedTickets.length,
        allTicketsStatus: allTickets.map((t: any) => ({
          ticketNumber: t.ticketNumber,
          status: t.status,
          reservedUntil: t.reservedUntil,
        })),
      });

      throw new ApiError(errorMessage, 400);
    }

    const finalTicketsReserved = ticketsReserved;

    // Calculate amount
    const ticketPrice =
      competition.ticketPrice ||
      ((competition as any).ticketPricePence
        ? (competition as any).ticketPricePence / 100
        : 0);
    const amount = Number((ticketPrice * qty).toFixed(2));

    // Generate unique order number
    let orderNumber = generateOrderNumber();
    // Ensure uniqueness (retry if duplicate)
    let orderExists = await Order.findOne({ orderNumber });
    let retries = 0;
    while (orderExists && retries < 5) {
      orderNumber = generateOrderNumber();
      orderExists = await Order.findOne({ orderNumber });
      retries++;
    }
    if (orderExists) {
      throw new ApiError('Failed to generate unique order number', 500);
    }

    // Create order
    // Set userId if user is authenticated (from optionalAuth middleware)
    const order = await Order.create({
      userId: req.user?._id || undefined, // Set userId if user is logged in
      competitionId,
      orderNumber,
      amount,
      currency: 'GBP',
      quantity: qty,
      status: OrderStatus.PENDING,
      paymentStatus: OrderPaymentStatus.PENDING,
      ticketsReserved: finalTicketsReserved,
      ticketsValid: ticketsValid !== false, // Default to true if not provided or explicitly false
      billingDetails,
      shippingAddress,
      marketingOptIn: marketingOptIn || false,
    });

    // IMMEDIATELY extend all reserved tickets to 24 hours and associate with order
    // This must happen synchronously before response is sent
    const reservedUntil24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    
    logger.info('📦 [ORDER] Starting ticket reservation and association', {
      userId: req.user._id,
      orderId: order._id,
      competitionId,
      ticketNumbers: ticketsReserved,
      reservedUntil: reservedUntil24Hours.toISOString(),
    });

    // First, check ALL tickets (including expired ones) - we'll update or recreate them
    const ticketsBeforeUpdate = await Ticket.find({
      competitionId,
      ticketNumber: { $in: ticketsReserved },
    }).lean();

    logger.info('📦 [ORDER] Tickets found in database before association', {
      userId: req.user._id,
      orderId: order._id,
      competitionId,
      expectedCount: qty,
      foundCount: ticketsBeforeUpdate.length,
      ticketNumbers: ticketsReserved,
      foundTickets: ticketsBeforeUpdate.map((t: any) => ({
        ticketNumber: t.ticketNumber,
        status: t.status,
        orderId: t.orderId,
        userId: t.userId,
        reservedUntil: t.reservedUntil,
        isExpired: t.reservedUntil ? new Date(t.reservedUntil) <= now : true,
      })),
    });

    // Separate tickets into: existing (any status), missing, expired
    const foundTicketNumbers = new Set(ticketsBeforeUpdate.map((t: any) => t.ticketNumber));
    const missingTicketNumbers = ticketsReserved.filter((num: number) => !foundTicketNumbers.has(num));
    
    // Check for expired tickets (even if they exist)
    const expiredTicketsInOrder = ticketsBeforeUpdate.filter((t: any) => 
      t.status === TicketStatus.RESERVED && 
      (!t.reservedUntil || new Date(t.reservedUntil) <= now)
    );
    const expiredTicketNumbers = expiredTicketsInOrder.map((t: any) => t.ticketNumber);
    
    logger.info('📦 [ORDER] Ticket analysis', {
      userId: req.user._id,
      orderId: order._id,
      missingCount: missingTicketNumbers.length,
      missingTickets: missingTicketNumbers,
      expiredCount: expiredTicketsInOrder.length,
      expiredTickets: expiredTicketNumbers,
    });

    // Recreate missing tickets
    if (missingTicketNumbers.length > 0) {
      logger.warn('📦 [ORDER] Recreating missing tickets', {
        userId: req.user._id,
        orderId: order._id,
        competitionId,
        missingTicketNumbers,
      });

      const ticketsToCreate = missingTicketNumbers.map((ticketNumber) => ({
        competitionId,
        ticketNumber,
        userId: req.user?._id || undefined,
        status: TicketStatus.RESERVED,
        reservedUntil: reservedUntil24Hours,
        orderId: order._id, // Associate immediately
      }));

      try {
        await Ticket.insertMany(ticketsToCreate, { ordered: false });
        logger.info('📦 [ORDER] Missing tickets recreated', {
          userId: req.user._id,
          orderId: order._id,
          ticketsCreated: missingTicketNumbers.length,
          ticketNumbers: missingTicketNumbers,
        });
      } catch (insertError: any) {
        if (insertError.code === 11000) {
          logger.warn('📦 [ORDER] Some tickets were created concurrently', {
            userId: req.user._id,
            orderId: order._id,
          });
        } else {
          throw insertError;
        }
      }
    }

    // Update ALL tickets (including expired ones) to associate with order and extend expiry
    // CRITICAL: Don't filter by reservedUntil - update even expired tickets
    // The cleanup job only deletes tickets without orderId, so once we set orderId, they're safe
    logger.info('📦 [ORDER] Updating tickets to associate with order', {
      userId: req.user._id,
      orderId: order._id,
      competitionId,
      ticketNumbers: ticketsReserved,
      reservedUntil: reservedUntil24Hours.toISOString(),
    });

    const ticketUpdateResult = await Ticket.updateMany(
      {
        competitionId,
        ticketNumber: { $in: ticketsReserved },
        status: TicketStatus.RESERVED, // Only update RESERVED tickets
        // Don't filter by reservedUntil - update even expired ones
      },
      {
        $set: {
          reservedUntil: reservedUntil24Hours,
          orderId: order._id, // Associate tickets with order - THIS PROTECTS THEM FROM CLEANUP
        },
      }
    );

    logger.info('📦 [ORDER] Ticket update result', {
      userId: req.user._id,
      orderId: order._id,
      competitionId,
      ticketsMatched: ticketUpdateResult.matchedCount,
      ticketsModified: ticketUpdateResult.modifiedCount,
      ticketNumbers: ticketsReserved,
    });

    // Log ticket association for debugging
    logger.info(
      `Associated ${ticketUpdateResult.modifiedCount} tickets with order ${order._id}`,
      {
        orderId: order._id,
        competitionId,
        ticketNumbers: ticketsReserved,
        ticketsMatched: ticketUpdateResult.matchedCount,
        ticketsUpdated: ticketUpdateResult.modifiedCount,
      }
    );

    // Verify tickets are associated (critical check)
    logger.info('📦 [ORDER] Verifying ticket association', {
      userId: req.user._id,
      orderId: order._id,
      competitionId,
      ticketNumbers: ticketsReserved,
    });

    const associatedTickets = await Ticket.find({
      competitionId,
      ticketNumber: { $in: ticketsReserved },
      orderId: order._id,
      status: TicketStatus.RESERVED,
    });

    logger.info('📦 [ORDER] Ticket association verification result', {
      userId: req.user._id,
      orderId: order._id,
      expectedCount: qty,
      foundCount: associatedTickets.length,
      associatedTicketNumbers: associatedTickets.map((t) => t.ticketNumber),
      associatedTickets: associatedTickets.map((t: any) => ({
        ticketNumber: t.ticketNumber,
        status: t.status,
        orderId: t.orderId,
        reservedUntil: t.reservedUntil,
        userId: t.userId,
      })),
    });

    if (associatedTickets.length !== qty) {
      // This is a critical error - tickets must be associated before payment
      logger.error('📦 [ORDER] CRITICAL: Not all tickets associated', {
        userId: req.user._id,
        orderId: order._id,
        expected: qty,
        found: associatedTickets.length,
        ticketNumbers: ticketsReserved,
        associatedTicketNumbers: associatedTickets.map((t) => t.ticketNumber),
      });
      
      // Try to find what happened to the missing tickets
      const allTickets = await Ticket.find({
        competitionId,
        ticketNumber: { $in: ticketsReserved },
      }).lean();
      
      logger.error('📦 [ORDER] All tickets status check', {
        userId: req.user._id,
        orderId: order._id,
        allTickets: allTickets.map((t: any) => ({
          ticketNumber: t.ticketNumber,
          status: t.status,
          orderId: t.orderId,
          userId: t.userId,
          reservedUntil: t.reservedUntil,
          isExpired: t.reservedUntil ? new Date(t.reservedUntil) <= now : true,
        })),
      });

      // CRITICAL: Recreate missing tickets immediately
      const associatedTicketNumbers = new Set(associatedTickets.map((t) => t.ticketNumber));
      const stillMissing = ticketsReserved.filter((num: number) => !associatedTicketNumbers.has(num));
      
      if (stillMissing.length > 0) {
        logger.error('📦 [ORDER] CRITICAL: Recreating missing tickets', {
          userId: req.user._id,
          orderId: order._id,
          competitionId,
          missingTicketNumbers: stillMissing,
        });

        const ticketsToCreate = stillMissing.map((ticketNumber) => ({
          competitionId,
          ticketNumber,
          userId: req.user?._id || undefined,
          status: TicketStatus.RESERVED,
          reservedUntil: reservedUntil24Hours,
          orderId: order._id,
        }));

        try {
          await Ticket.insertMany(ticketsToCreate, { ordered: false });
          logger.info('📦 [ORDER] CRITICAL: Missing tickets recreated', {
            userId: req.user._id,
            orderId: order._id,
            ticketsCreated: stillMissing.length,
            ticketNumbers: stillMissing,
          });
        } catch (insertError: any) {
          logger.error('📦 [ORDER] CRITICAL: Failed to recreate tickets', {
            userId: req.user._id,
            orderId: order._id,
            error: insertError.message,
            missingTicketNumbers: stillMissing,
          });
          // Don't throw - let payment handler try to fix it
        }
      }
    } else {
      logger.info('📦 [ORDER] All tickets successfully associated', {
        userId: req.user._id,
        orderId: order._id,
        ticketCount: associatedTickets.length,
        ticketNumbers: associatedTickets.map((t) => t.ticketNumber),
      });
    }

    // Order created - Square payment will be created when frontend calls /api/v1/payments/create-payment
    const orderId = String(order._id);

    // Final verification - check tickets one more time before sending response
    const finalTicketsCheck = await Ticket.find({
      competitionId,
      ticketNumber: { $in: ticketsReserved },
      orderId: order._id,
      status: TicketStatus.RESERVED,
    });

    const duration = Date.now() - startTime;
    logger.info('📦 [ORDER] ===== ORDER CREATION COMPLETED =====', {
      userId: req.user._id,
      orderId: order._id,
      orderNumber: order.orderNumber,
      competitionId,
      quantity: qty,
      ticketsReserved,
      ticketsReservedCount: ticketsReserved.length,
      finalTicketsCount: finalTicketsCheck.length,
      finalTicketNumbers: finalTicketsCheck.map((t) => t.ticketNumber),
      ticketsValid,
      amount: order.amount,
      duration: `${duration}ms`,
    });

    // Send response immediately to prevent timeout
    res.status(201).json(
      ApiResponse.success(
        {
          order: formatOrderResponse(order),
          orderId: orderId,
        },
        'Order created successfully'
      )
    );

    // Process async operations after response is sent (non-blocking)
    // This prevents timeout issues while still sending emails and tracking events
    setImmediate(async () => {
      try {
        // Track "Started Checkout" event in Klaviyo
        try {
          const email = billingDetails?.email;
          if (email) {
            await klaviyoService.trackEvent(
              email,
              'Started Checkout',
              {
                competition_id: competitionId,
                competition_name: competition.title,
                order_id: orderId,
                items: [
                  {
                    competition_id: competitionId,
                    competition_name: competition.title,
                    quantity: qty,
                    ticket_numbers: finalTicketsReserved,
                  },
                ],
              },
              amount
            );
          }
        } catch (error: any) {
          logger.error('Error tracking Started Checkout event:', error);
        }

        // Create event log
        await Event.create({
          type: EventType.ORDER_CREATED,
          entity: 'order',
          entityId: order._id,
          userId: req.user?._id,
          competitionId,
          payload: {
            amount,
            quantity: qty,
            ticketsReserved: finalTicketsReserved,
          },
        });

        // Send order confirmation email
        if (billingDetails?.email) {
          try {
            const user = req.user?._id ? await User.findById(req.user._id) : null;
            await emailService.sendOrderConfirmationEmail({
              email: billingDetails.email,
              firstName:
                user?.firstName || billingDetails.firstName || 'Valued Customer',
              lastName: user?.lastName || billingDetails.lastName,
              orderNumber: order.orderNumber,
              competitionTitle: competition.title,
              ticketNumbers: ticketsReserved,
              amountGBP: amount.toFixed(2),
              orderId: String(order._id),
            });
            logger.info(`Order confirmation email sent to ${billingDetails.email}`);
          } catch (error: any) {
            logger.error('Error sending order confirmation email:', error);
            // Don't fail order creation if email fails
          }
        }
      } catch (error: any) {
        logger.error('Error in async order processing:', error);
      }
    });
  } catch (error) {
    next(error);
  }
};
