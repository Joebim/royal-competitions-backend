import { Request, Response, NextFunction } from 'express';
import {
  Cart,
  Competition,
  Order,
  Ticket,
  TicketStatus,
  User,
} from '../models';
import { OrderPaymentStatus, OrderStatus } from '../models/Order.model';
import { CompetitionStatus } from '../models/Competition.model';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import emailService from '../services/email.service';
import logger from '../utils/logger';
import { generateOrderNumber } from '../utils/randomGenerator';

/**
 * Create checkout from cart
 * This creates orders for each competition in the cart
 * Validates that tickets are reserved, or re-reserves them if expired
 */
export const createCheckoutFromCart = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  try {
    logger.info('🛒 [CHECKOUT] ===== CREATE CHECKOUT FROM CART =====', {
      userId: req.user?._id,
      timestamp: new Date().toISOString(),
    });

    if (!req.user) {
      logger.warn('🛒 [CHECKOUT] Unauthorized - no user');
      throw new ApiError('Not authorized', 401);
    }

    const { billingDetails, shippingAddress, marketingOptIn } = req.body;

    logger.info('🛒 [CHECKOUT] Request body received', {
      userId: req.user._id,
      hasBillingDetails: !!billingDetails,
      billingEmail: billingDetails?.email,
      hasShippingAddress: !!shippingAddress,
      marketingOptIn,
    });

    if (!billingDetails || !billingDetails.email) {
      logger.warn('🛒 [CHECKOUT] Missing billing details or email', {
        userId: req.user._id,
        hasBillingDetails: !!billingDetails,
      });
      throw new ApiError('Billing details with email are required', 400);
    }

    // Get user's cart
    logger.info('🛒 [CHECKOUT] Fetching user cart', {
      userId: req.user._id,
    });
    const cart = await Cart.findOne({ userId: req.user._id });
    
    if (!cart || !cart.items || cart.items.length === 0) {
      logger.warn('🛒 [CHECKOUT] Cart is empty', {
        userId: req.user._id,
        cartId: cart?._id,
        itemsCount: cart?.items?.length || 0,
      });
      throw new ApiError('Cart is empty', 400);
    }

    logger.info('🛒 [CHECKOUT] Cart found', {
      userId: req.user._id,
      cartId: cart._id,
      itemsCount: cart.items.length,
      items: cart.items.map((item: any) => ({
        competitionId: item.competitionId,
        quantity: item.quantity,
        ticketNumbers: item.ticketNumbers,
        ticketsValid: item.ticketsValid,
      })),
    });

    const orders = [];
    const now = new Date();

    logger.info('🛒 [CHECKOUT] Starting order creation for cart items', {
      userId: req.user._id,
      cartId: cart._id,
      itemsCount: cart.items.length,
      timestamp: now.toISOString(),
    });

    // Create an order for each competition in the cart
    for (let i = 0; i < cart.items.length; i++) {
      const cartItem = cart.items[i];
      
      logger.info(`🛒 [CHECKOUT] Processing cart item ${i + 1}/${cart.items.length}`, {
        userId: req.user._id,
        cartItemId: cartItem._id,
        competitionId: cartItem.competitionId,
        quantity: cartItem.quantity,
        ticketNumbers: cartItem.ticketNumbers,
        ticketsValid: cartItem.ticketsValid,
      });

      const competition = await Competition.findById(cartItem.competitionId);
      if (!competition) {
        logger.error(`🛒 [CHECKOUT] Competition not found`, {
          userId: req.user._id,
          competitionId: cartItem.competitionId,
        });
        throw new ApiError('Competition not found', 404);
      }

      logger.info(`🛒 [CHECKOUT] Competition found`, {
        userId: req.user._id,
        competitionId: competition._id,
        competitionTitle: competition.title,
        status: competition.status,
        isActive: competition.isActive,
      });

      // Check if competition has ended or is not available
      if (
        competition.status === CompetitionStatus.ENDED ||
        competition.status === CompetitionStatus.DRAWN ||
        competition.status === CompetitionStatus.CANCELLED
      ) {
        throw new ApiError(
          `Competition ${competition.title} is no longer accepting entries`,
          400
        );
      }

      if (competition.endDate && competition.endDate <= now) {
        throw new ApiError(
          `Competition ${competition.title} has ended`,
          400
        );
      }

      // Check if competition is available
      if (
        !competition.isActive ||
        competition.status !== CompetitionStatus.LIVE
      ) {
        throw new ApiError(
          `Competition ${competition.title} is not available`,
          400
        );
      }

      // Tickets should already be reserved in cart - use cart item's ticket numbers
      logger.info(`🛒 [CHECKOUT] Validating ticket reservations`, {
        userId: req.user._id,
        competitionId: competition._id,
        expectedQuantity: cartItem.quantity,
        ticketNumbersCount: cartItem.ticketNumbers?.length || 0,
        ticketNumbers: cartItem.ticketNumbers,
      });

      if (!cartItem.ticketNumbers || cartItem.ticketNumbers.length !== cartItem.quantity) {
        logger.error(`🛒 [CHECKOUT] Ticket numbers mismatch`, {
          userId: req.user._id,
          competitionId: competition._id,
          expectedQuantity: cartItem.quantity,
          ticketNumbersCount: cartItem.ticketNumbers?.length || 0,
          ticketNumbers: cartItem.ticketNumbers,
        });
        throw new ApiError(
          `Tickets for ${competition.title} are not properly reserved. Please remove and re-add to cart.`,
          400
        );
      }

      // Verify reserved tickets exist and are still valid
      // When order is created, extend reservation to 24 hours
      logger.info(`🛒 [CHECKOUT] Checking existing ticket reservations`, {
        userId: req.user._id,
        competitionId: competition._id,
        ticketNumbers: cartItem.ticketNumbers,
      });

      const existingReservations = await Ticket.find({
        competitionId: competition._id,
        userId: req.user._id,
        ticketNumber: { $in: cartItem.ticketNumbers },
        status: TicketStatus.RESERVED,
      });

      logger.info(`🛒 [CHECKOUT] Existing reservations found`, {
        userId: req.user._id,
        competitionId: competition._id,
        expectedCount: cartItem.quantity,
        foundCount: existingReservations.length,
        foundTicketNumbers: existingReservations.map((t) => t.ticketNumber),
        reservations: existingReservations.map((t: any) => ({
          ticketNumber: t.ticketNumber,
          status: t.status,
          reservedUntil: t.reservedUntil,
          orderId: t.orderId,
        })),
      });

      if (existingReservations.length !== cartItem.quantity) {
        logger.error(`🛒 [CHECKOUT] Missing reserved tickets`, {
          userId: req.user._id,
          competitionId: competition._id,
          expectedCount: cartItem.quantity,
          foundCount: existingReservations.length,
          missingTickets: cartItem.ticketNumbers.filter(
            (num: number) => !existingReservations.some((t) => t.ticketNumber === num)
          ),
        });
        throw new ApiError(
          `Some reserved tickets for ${competition.title} are missing. Please remove and re-add to cart.`,
          400
        );
      }

      // Create order first to get orderId
      // (We'll extend reservations after order is created)

      const ticketsReserved = cartItem.ticketNumbers;

      // Calculate amount in decimal
      const ticketPrice = competition.ticketPrice || ((competition as any).ticketPricePence ? (competition as any).ticketPricePence / 100 : 0);
      const amount = Number((ticketPrice * cartItem.quantity).toFixed(2));

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

      // Create order with reserved tickets
      // Pass ticketsValid from cart item to order (defaults to true if not set)
      logger.info(`🛒 [CHECKOUT] Creating order`, {
        userId: req.user._id,
        competitionId: competition._id,
        orderNumber,
        amount,
        quantity: cartItem.quantity,
        ticketsReserved,
        ticketsValid: cartItem.ticketsValid !== undefined ? cartItem.ticketsValid : true,
      });

      const order = await Order.create({
        userId: req.user._id,
        competitionId: competition._id,
        orderNumber,
        amount,
        currency: 'GBP',
        quantity: cartItem.quantity,
        status: OrderStatus.PENDING,
        paymentStatus: OrderPaymentStatus.PENDING,
        ticketsReserved, // Now populated with actual reserved ticket numbers
        ticketsValid: cartItem.ticketsValid !== undefined ? cartItem.ticketsValid : true, // Pass ticketsValid from cart
        billingDetails,
        shippingAddress,
        marketingOptIn: marketingOptIn || false,
      });

      logger.info(`🛒 [CHECKOUT] Order created successfully`, {
        userId: req.user._id,
        orderId: order._id,
        orderNumber: order.orderNumber,
        competitionId: competition._id,
        amount,
        quantity: cartItem.quantity,
        ticketsReserved,
      });

      // Extend reservation to 24 hours when order is created and associate with order
      const reservedUntil24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
      
      logger.info(`🛒 [CHECKOUT] Extending ticket reservations to 24 hours`, {
        userId: req.user._id,
        orderId: order._id,
        competitionId: competition._id,
        ticketNumbers: cartItem.ticketNumbers,
        reservedUntil: reservedUntil24Hours.toISOString(),
      });

      const ticketUpdateResult = await Ticket.updateMany(
        {
          competitionId: competition._id,
          userId: req.user._id,
          ticketNumber: { $in: cartItem.ticketNumbers },
          status: TicketStatus.RESERVED,
        },
        {
          $set: {
            reservedUntil: reservedUntil24Hours,
            orderId: order._id, // Associate tickets with order
          },
        }
      );

      logger.info(`🛒 [CHECKOUT] Ticket reservations extended and associated`, {
        userId: req.user._id,
        orderId: order._id,
        competitionId: competition._id,
        ticketsMatched: ticketUpdateResult.matchedCount,
        ticketsModified: ticketUpdateResult.modifiedCount,
        ticketNumbers: cartItem.ticketNumbers,
      });

      // Verify tickets are associated
      const associatedTickets = await Ticket.find({
        competitionId: competition._id,
        orderId: order._id,
        ticketNumber: { $in: cartItem.ticketNumbers },
        status: TicketStatus.RESERVED,
      });

      logger.info(`🛒 [CHECKOUT] Verified ticket association`, {
        userId: req.user._id,
        orderId: order._id,
        expectedCount: cartItem.quantity,
        associatedCount: associatedTickets.length,
        associatedTicketNumbers: associatedTickets.map((t) => t.ticketNumber),
      });

      // Order created - Square payment will be created when frontend calls /api/v1/payments/create-payment

      // Send order confirmation email
      if (billingDetails?.email) {
        try {
          const user = await User.findById(req.user._id);
          await emailService.sendOrderConfirmationEmail({
            email: billingDetails.email,
            firstName: user?.firstName || billingDetails.firstName || 'Valued Customer',
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
          // Don't fail checkout if email fails
        }
      }

      orders.push({
        id: order._id,
        competitionId: competition._id,
        competitionTitle: competition.title,
        quantity: cartItem.quantity,
        amount,
        amountGBP: amount.toFixed(2),
        orderId: String(order._id),
      });

      logger.info(`🛒 [CHECKOUT] Cart item ${i + 1} processed successfully`, {
        userId: req.user._id,
        orderId: order._id,
        competitionId: competition._id,
      });
    }

    const duration = Date.now() - startTime;
    logger.info('🛒 [CHECKOUT] ===== CHECKOUT FROM CART COMPLETED =====', {
      userId: req.user._id,
      ordersCreated: orders.length,
      totalDuration: `${duration}ms`,
      orders: orders.map((o) => ({
        orderId: o.id,
        competitionId: o.competitionId,
        amount: o.amount,
      })),
    });

    res.status(201).json(
      ApiResponse.success(
        {
          orders,
          message:
            'Orders created with tickets reserved. Please complete payment for each order.',
        },
        'Checkout initiated successfully'
      )
    );
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('🛒 [CHECKOUT] ===== CHECKOUT FROM CART ERROR =====', {
      userId: req.user?._id,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
    });
    next(error);
  }
};

/**
 * Create payment intent for an existing order
 * This is used when tickets are already reserved
 */
export const createCheckoutPaymentIntent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  try {
    logger.info('💳 [CHECKOUT] ===== CREATE PAYMENT INTENT =====', {
      userId: req.user?._id,
      timestamp: new Date().toISOString(),
    });

    if (!req.user) {
      logger.warn('💳 [CHECKOUT] Unauthorized - no user');
      throw new ApiError('Not authorized', 401);
    }

    const { orderId, billingDetails, shippingAddress, marketingOptIn } =
      req.body;

    logger.info('💳 [CHECKOUT] Payment intent request received', {
      userId: req.user._id,
      orderId,
      hasBillingDetails: !!billingDetails,
      hasShippingAddress: !!shippingAddress,
      marketingOptIn,
    });

    if (!orderId) {
      logger.warn('💳 [CHECKOUT] Order ID missing', {
        userId: req.user._id,
      });
      throw new ApiError('Order ID is required', 400);
    }

    logger.info('💳 [CHECKOUT] Fetching order', {
      userId: req.user._id,
      orderId,
    });

    const order = await Order.findById(orderId);
    if (!order) {
      logger.error('💳 [CHECKOUT] Order not found', {
        userId: req.user._id,
        orderId,
      });
      throw new ApiError('Order not found', 404);
    }

    logger.info('💳 [CHECKOUT] Order found', {
      userId: req.user._id,
      orderId: order._id,
      orderUserId: order.userId,
      orderStatus: order.status,
      paymentStatus: order.paymentStatus,
      ticketsReserved: order.ticketsReserved,
      ticketsReservedCount: order.ticketsReserved?.length || 0,
    });

    // Check authorization - user must own the order
    if (order.userId && order.userId.toString() !== String(req.user._id)) {
      logger.warn('💳 [CHECKOUT] Authorization failed', {
        userId: req.user._id,
        orderId: order._id,
        orderUserId: order.userId,
      });
      throw new ApiError('Not authorized', 403);
    }

    // Verify reserved tickets exist and are still valid
    const now = new Date();
    
    logger.info('💳 [CHECKOUT] Validating ticket reservations', {
      userId: req.user._id,
      orderId: order._id,
      expectedQuantity: order.quantity,
      ticketsReservedCount: order.ticketsReserved?.length || 0,
      ticketsReserved: order.ticketsReserved,
      timestamp: now.toISOString(),
    });

    if (
      !order.ticketsReserved ||
      order.ticketsReserved.length !== order.quantity
    ) {
      logger.error('💳 [CHECKOUT] Tickets not properly reserved', {
        userId: req.user._id,
        orderId: order._id,
        expectedQuantity: order.quantity,
        ticketsReservedCount: order.ticketsReserved?.length || 0,
      });
      throw new ApiError('Tickets must be reserved before checkout', 400);
    }

    // Verify that the reserved tickets still exist and are valid
    logger.info('💳 [CHECKOUT] Checking reserved tickets in database', {
      userId: req.user._id,
      orderId: order._id,
      competitionId: order.competitionId,
      ticketNumbers: order.ticketsReserved,
    });

    const reservedTickets = await Ticket.find({
      competitionId: order.competitionId,
      ticketNumber: { $in: order.ticketsReserved },
      status: TicketStatus.RESERVED,
      reservedUntil: { $gt: now },
    });

    logger.info('💳 [CHECKOUT] Reserved tickets check result', {
      userId: req.user._id,
      orderId: order._id,
      expectedCount: order.quantity,
      foundCount: reservedTickets.length,
      foundTicketNumbers: reservedTickets.map((t) => t.ticketNumber),
      tickets: reservedTickets.map((t: any) => ({
        ticketNumber: t.ticketNumber,
        status: t.status,
        reservedUntil: t.reservedUntil,
        orderId: t.orderId,
      })),
    });

    if (reservedTickets.length !== order.quantity) {
      logger.error('💳 [CHECKOUT] Some reserved tickets expired or missing', {
        userId: req.user._id,
        orderId: order._id,
        expectedCount: order.quantity,
        foundCount: reservedTickets.length,
        missingTickets: order.ticketsReserved.filter(
          (num: number) => !reservedTickets.some((t) => t.ticketNumber === num)
        ),
      });
      throw new ApiError(
        'Some reserved tickets have expired. Please refresh and try again.',
        400
      );
    }

    // Check if billing details exist (either from request or order)
    const finalBillingDetails = billingDetails || order.billingDetails;
    if (!finalBillingDetails || !finalBillingDetails.email) {
      throw new ApiError('Billing details with email are required', 400);
    }

    // Get competition
    const competition = await Competition.findById(order.competitionId);
    if (!competition) {
      throw new ApiError('Competition not found', 404);
    }

    // Check if competition is still available
    if (
      !competition.isActive ||
      competition.status !== CompetitionStatus.LIVE
    ) {
      throw new ApiError('Competition is no longer available', 400);
    }

    // Update order with billing details if provided
    if (billingDetails) {
      order.billingDetails = billingDetails;
    }
    if (shippingAddress) {
      order.shippingAddress = shippingAddress;
    }
    if (marketingOptIn !== undefined) {
      order.marketingOptIn = marketingOptIn;
    }

    // Order exists - Square payment will be created when frontend calls /api/v1/payments/create-payment
    const orderAmount = order.amount || ((order as any).amountPence ? (order as any).amountPence / 100 : 0);

    const duration = Date.now() - startTime;
    logger.info('💳 [CHECKOUT] ===== PAYMENT INTENT CREATED =====', {
      userId: req.user._id,
      orderId: order._id,
      amount: orderAmount,
      quantity: order.quantity,
      ticketsReserved: order.ticketsReserved,
      duration: `${duration}ms`,
    });

    res.json(
      ApiResponse.success(
        {
          order: {
            id: order._id,
            competitionId: order.competitionId,
            amount: orderAmount,
            amountGBP: orderAmount.toFixed(2),
            quantity: order.quantity,
            ticketsReserved: order.ticketsReserved,
          },
        },
        'Order ready for payment'
      )
    );
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('💳 [CHECKOUT] ===== PAYMENT INTENT ERROR =====', {
      userId: req.user?._id,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
    });
    next(error);
  }
};

/**
 * Confirm checkout order
 * This endpoint is mostly handled by the webhook, but can be used to verify status
 */
export const confirmCheckoutOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  try {
    logger.info('✅ [CHECKOUT] ===== CONFIRM CHECKOUT ORDER =====', {
      userId: req.user?._id,
      timestamp: new Date().toISOString(),
    });

    if (!req.user) {
      logger.warn('✅ [CHECKOUT] Unauthorized - no user');
      throw new ApiError('Not authorized', 401);
    }

    const { orderId, paymentId } = req.body;

    logger.info('✅ [CHECKOUT] Confirm order request received', {
      userId: req.user._id,
      orderId,
      paymentId,
    });

    if (!orderId && !paymentId) {
      logger.warn('✅ [CHECKOUT] Missing orderId and paymentId', {
        userId: req.user._id,
      });
      throw new ApiError('Order ID or Payment ID is required', 400);
    }

    logger.info('✅ [CHECKOUT] Finding order', {
      userId: req.user._id,
      orderId,
      paymentId,
    });

    let order;
    if (orderId) {
      order = await Order.findById(orderId);
    } else if (paymentId) {
      order = await Order.findOne({ squarePaymentId: paymentId });
    }

    if (!order) {
      logger.error('✅ [CHECKOUT] Order not found', {
        userId: req.user._id,
        orderId,
        paymentId,
      });
      throw new ApiError('Order not found', 404);
    }

    logger.info('✅ [CHECKOUT] Order found', {
      userId: req.user._id,
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      paymentStatus: order.paymentStatus,
      squarePaymentId: order.squarePaymentId,
    });

    // Check authorization - user must own the order
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    if (order.userId && order.userId.toString() !== String(req.user._id)) {
      throw new ApiError('Not authorized', 403);
    }

    // Check Square payment status if paymentId is provided
    // Note: For Square, we rely on webhooks for payment confirmation
    // This endpoint mainly returns the current order status

    if (!order) {
      throw new ApiError('Order not found after payment processing', 500);
    }

    // Get competition
    const competition = await Competition.findById(order.competitionId);

    // Get tickets if they exist
    logger.info('✅ [CHECKOUT] Fetching tickets for order', {
      userId: req.user._id,
      orderId: order._id,
    });

    const tickets = await Ticket.find({
      orderId: order._id,
      status: { $in: [TicketStatus.ACTIVE, TicketStatus.WINNER] },
    }).sort({ ticketNumber: 1 });

    logger.info('✅ [CHECKOUT] Tickets found', {
      userId: req.user._id,
      orderId: order._id,
      ticketsCount: tickets.length,
      ticketNumbers: tickets.map((t) => t.ticketNumber),
      ticketStatuses: tickets.map((t) => t.status),
    });

    const duration = Date.now() - startTime;
    logger.info('✅ [CHECKOUT] ===== CONFIRM CHECKOUT ORDER COMPLETED =====', {
      userId: req.user._id,
      orderId: order._id,
      orderStatus: order.status,
      paymentStatus: order.paymentStatus,
      ticketsCount: tickets.length,
      duration: `${duration}ms`,
    });

    res.json(
      ApiResponse.success(
        {
          order: {
            id: order._id,
            competitionId: order.competitionId,
            competitionTitle: competition?.title,
            amount: order.amount || ((order as any).amountPence ? (order as any).amountPence / 100 : 0),
            amountGBP: (order.amount || ((order as any).amountPence ? (order as any).amountPence / 100 : 0)).toFixed(2),
            quantity: order.quantity,
            status: order.status,
            paymentStatus: order.paymentStatus,
            ticketsReserved: order.ticketsReserved,
            tickets: tickets.map((ticket) => ({
              id: ticket._id,
              ticketNumber: ticket.ticketNumber,
              status: ticket.status,
            })),
            squarePaymentId: order.squarePaymentId || null,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
          },
        },
        'Order status retrieved successfully'
      )
    );
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('✅ [CHECKOUT] ===== CONFIRM CHECKOUT ORDER ERROR =====', {
      userId: req.user?._id,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
    });
    next(error);
  }
};
