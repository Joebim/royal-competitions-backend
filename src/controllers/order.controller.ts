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
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import { getPagination } from '../utils/pagination';
import { UserRole } from '../models';
import paypalService from '../services/paypal.service';
import { config } from '../config/environment';
import { generateOrderNumber } from '../utils/randomGenerator';
import emailService from '../services/email.service';
import logger from '../utils/logger';

const formatOrderResponse = (order: any) => {
  const doc = order.toObject ? order.toObject() : order;
  return {
    id: doc._id,
    competitionId: doc.competitionId,
    userId: doc.userId,
    orderNumber: doc.orderNumber,
    amountPence: doc.amountPence,
    amountGBP: (doc.amountPence / 100).toFixed(2),
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
      ticketsReserved,
      billingDetails,
      shippingAddress,
      marketingOptIn,
    } = req.body;

    if (
      !competitionId ||
      !qty ||
      !ticketsReserved ||
      !Array.isArray(ticketsReserved)
    ) {
      throw new ApiError('Missing required fields', 400);
    }

    if (!billingDetails || !billingDetails.email) {
      throw new ApiError('Billing details with email are required', 400);
    }

    // Get competition
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      throw new ApiError('Competition not found', 404);
    }

    // Check if competition is available for purchase
    if (
      competition.status === 'ended' ||
      competition.status === 'drawn' ||
      competition.status === 'cancelled'
    ) {
      throw new ApiError(
        'This competition is no longer accepting entries',
        400
      );
    }

    // Check if competition has ended (endDate passed)
    if (competition.endDate && competition.endDate <= new Date()) {
      throw new ApiError(
        'This competition has ended and is no longer accepting entries',
        400
      );
    }

    // Check if competition is active and live
    if (!competition.isActive || competition.status !== 'live') {
      throw new ApiError(
        'This competition is not currently accepting entries',
        400
      );
    }

    // Verify reserved tickets exist and are still reserved
    const reservedTickets = await Ticket.find({
      competitionId,
      ticketNumber: { $in: ticketsReserved },
      status: TicketStatus.RESERVED,
      reservedUntil: { $gt: new Date() },
    });

    if (reservedTickets.length !== qty) {
      throw new ApiError('Some reserved tickets are no longer available', 400);
    }

    // Calculate amount
    const amountPence = competition.ticketPricePence * qty;

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
      amountPence,
      currency: 'GBP',
      quantity: qty,
      status: OrderStatus.PENDING,
      paymentStatus: OrderPaymentStatus.PENDING,
      ticketsReserved,
      billingDetails,
      shippingAddress,
      marketingOptIn: marketingOptIn || false,
    });

    // Create PayPal order
    const orderId = String(order._id);
    const paypalOrder = await paypalService.createOrder({
      amount: amountPence, // Amount in pence
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

    // Create event log
    await Event.create({
      type: EventType.ORDER_CREATED,
      entity: 'order',
      entityId: order._id,
      userId: req.user?._id,
      competitionId,
      payload: {
        amountPence,
        quantity: qty,
        ticketsReserved,
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
          amountGBP: (amountPence / 100).toFixed(2),
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
