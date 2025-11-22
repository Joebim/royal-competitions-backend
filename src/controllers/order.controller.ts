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
import paypalService from '../services/paypal.service';
import { config } from '../config/environment';
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
    paypalOrderId: doc.paypalOrderId,
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
    const order = await Order.findById(req.params.id);

    if (!order) {
      throw new ApiError('Order not found', 404);
    }

    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(
      req.user.role
    );

    const requesterId = String(req.user._id);

    // Check authorization - allow if user matches or is admin, or if no userId (guest order)
    const orderUserId = order.userId?.toString();
    const isOrderOwner = orderUserId === requesterId;
    const isGuestOrder = !orderUserId;

    if (!isAdmin && !isOrderOwner && !isGuestOrder) {
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
  try {
    const {
      competitionId,
      qty,
      ticketsReserved, // Optional - will be auto-reserved if not provided
      billingDetails,
      shippingAddress,
      marketingOptIn,
    } = req.body;

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

    // Reserve tickets automatically if not provided
    let finalTicketsReserved: number[] = [];

    if (
      ticketsReserved &&
      Array.isArray(ticketsReserved) &&
      ticketsReserved.length > 0
    ) {
      // Verify provided reserved tickets exist and are still reserved
      const reservedTickets = await Ticket.find({
        competitionId,
        ticketNumber: { $in: ticketsReserved },
        status: TicketStatus.RESERVED,
        reservedUntil: { $gt: now },
      });

      if (reservedTickets.length !== qty) {
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

        const expiredTickets = allTickets.filter(
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
        let errorMessage = 'Some reserved tickets are no longer available. ';
        const details: string[] = [];

        if (missingNumbers.length > 0) {
          details.push(
            `${missingNumbers.length} ticket(s) not found in database`
          );
        }
        if (expiredTickets.length > 0) {
          details.push(
            `${expiredTickets.length} ticket(s) reservation expired`
          );
        }
        if (purchasedTickets.length > 0) {
          details.push(
            `${purchasedTickets.length} ticket(s) already purchased`
          );
        }

        if (details.length > 0) {
          errorMessage += `Details: ${details.join(', ')}.`;
        }

        errorMessage += ' Please refresh and try again.';

        // Log detailed information for debugging
        logger.warn('Reserved tickets validation failed', {
          competitionId,
          requestedTickets: ticketsReserved,
          requestedQuantity: qty,
          foundReserved: reservedTickets.length,
          missingNumbers,
          expiredCount: expiredTickets.length,
          purchasedCount: purchasedTickets.length,
          allTicketsStatus: allTickets.map((t: any) => ({
            ticketNumber: t.ticketNumber,
            status: t.status,
            reservedUntil: t.reservedUntil,
          })),
        });

        throw new ApiError(errorMessage, 400);
      }

      finalTicketsReserved = ticketsReserved;
    } else {
      // Automatically reserve tickets - find available ticket numbers
      const reservedUntil = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes

      // Get all existing ticket numbers (active, winner, or validly reserved)
      const existingTickets = await Ticket.find({
        competitionId,
        $or: [
          { status: { $in: [TicketStatus.ACTIVE, TicketStatus.WINNER] } },
          {
            status: TicketStatus.RESERVED,
            reservedUntil: { $gt: now },
          },
        ],
      })
        .select('ticketNumber')
        .sort({ ticketNumber: 1 })
        .lean();

      const existingNumbers = new Set(
        existingTickets.map((t: any) => t.ticketNumber)
      );

      // Find available ticket numbers
      const availableNumbers: number[] = [];
      let candidate = 1;

      while (availableNumbers.length < qty) {
        if (!existingNumbers.has(candidate)) {
          availableNumbers.push(candidate);
        }
        candidate++;

        if (candidate > 1000000) {
          throw new ApiError('Unable to find available ticket numbers', 500);
        }
      }

      // Reserve tickets atomically
      const ticketsToCreate = availableNumbers.map((ticketNumber) => ({
        competitionId,
        ticketNumber,
        userId: req.user?._id || undefined,
        status: TicketStatus.RESERVED,
        reservedUntil,
      }));

      try {
        await Ticket.insertMany(ticketsToCreate, { ordered: false });
        finalTicketsReserved = availableNumbers;
        logger.info(
          `Auto-reserved ${availableNumbers.length} tickets for order creation`,
          {
            competitionId,
            ticketNumbers: availableNumbers,
            userId: req.user?._id,
          }
        );
      } catch (insertError: any) {
        if (insertError.code === 11000) {
          // Duplicate key - tickets were taken by another request
          logger.warn('Tickets taken by concurrent request, retrying...', {
            competitionId,
            attemptedNumbers: availableNumbers,
          });
          throw new ApiError(
            'Tickets are no longer available. Please try again.',
            409
          );
        }
        logger.error('Error auto-reserving tickets:', insertError);
        throw new ApiError('Failed to reserve tickets. Please try again.', 500);
      }
    }

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
      billingDetails,
      shippingAddress,
      marketingOptIn: marketingOptIn || false,
    });

    // Create PayPal order
    const orderId = String(order._id);
    const paypalOrder = await paypalService.createOrder({
      amount: amount, // Amount in decimal
      currency: 'GBP',
      orderId: orderId,
      userId: req.user?._id?.toString() || 'guest',
      competitionId: competitionId,
      returnUrl: `${config.frontendUrl}/payment/success?orderId=${orderId}`,
      cancelUrl: `${config.frontendUrl}/payment/cancel?orderId=${orderId}`,
    });

    // Update order with PayPal order ID
    order.paypalOrderId = paypalOrder.id;
    await order.save();

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

    res.status(201).json(
      ApiResponse.success(
        {
          order: formatOrderResponse(order),
          paypalOrderId: paypalOrder.id,
          orderID: paypalOrder.id, // For PayPal Buttons
        },
        'Order created successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};
