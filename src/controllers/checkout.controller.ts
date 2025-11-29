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
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const { billingDetails, shippingAddress, marketingOptIn } = req.body;

    if (!billingDetails || !billingDetails.email) {
      throw new ApiError('Billing details with email are required', 400);
    }

    // Get user's cart
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart || !cart.items || cart.items.length === 0) {
      throw new ApiError('Cart is empty', 400);
    }

    const orders = [];
    const now = new Date();

    // Create an order for each competition in the cart
    for (const cartItem of cart.items) {
      const competition = await Competition.findById(cartItem.competitionId);
      if (!competition) {
        throw new ApiError('Competition not found', 404);
      }

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
      if (!cartItem.ticketNumbers || cartItem.ticketNumbers.length !== cartItem.quantity) {
        throw new ApiError(
          `Tickets for ${competition.title} are not properly reserved. Please remove and re-add to cart.`,
          400
        );
      }

      // Verify reserved tickets exist and are still valid
      const existingReservations = await Ticket.find({
        competitionId: competition._id,
        userId: req.user._id,
        ticketNumber: { $in: cartItem.ticketNumbers },
        status: TicketStatus.RESERVED,
        reservedUntil: { $gt: now },
      });

      if (existingReservations.length !== cartItem.quantity) {
        throw new ApiError(
          `Some reserved tickets for ${competition.title} have expired. Please remove and re-add to cart.`,
          400
        );
      }

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
        billingDetails,
        shippingAddress,
        marketingOptIn: marketingOptIn || false,
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
    }

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
  } catch (error) {
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
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const { orderId, billingDetails, shippingAddress, marketingOptIn } =
      req.body;

    if (!orderId) {
      throw new ApiError('Order ID is required', 400);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw new ApiError('Order not found', 404);
    }

    // Check authorization - user must own the order
    if (order.userId && order.userId.toString() !== String(req.user._id)) {
      throw new ApiError('Not authorized', 403);
    }

    // Verify reserved tickets exist and are still valid
    const now = new Date();
    if (
      !order.ticketsReserved ||
      order.ticketsReserved.length !== order.quantity
    ) {
      throw new ApiError('Tickets must be reserved before checkout', 400);
    }

    // Verify that the reserved tickets still exist and are valid
    const reservedTickets = await Ticket.find({
      competitionId: order.competitionId,
      ticketNumber: { $in: order.ticketsReserved },
      status: TicketStatus.RESERVED,
      reservedUntil: { $gt: now },
    });

    if (reservedTickets.length !== order.quantity) {
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
  } catch (error) {
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
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const { orderId, paymentId } = req.body;

    if (!orderId && !paymentId) {
      throw new ApiError('Order ID or Payment ID is required', 400);
    }

    let order;
    if (orderId) {
      order = await Order.findById(orderId);
    } else if (paymentId) {
      order = await Order.findOne({ squarePaymentId: paymentId });
    }

    if (!order) {
      throw new ApiError('Order not found', 404);
    }

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
    const tickets = await Ticket.find({
      orderId: order._id,
      status: { $in: [TicketStatus.ACTIVE, TicketStatus.WINNER] },
    }).sort({ ticketNumber: 1 });

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
  } catch (error) {
    next(error);
  }
};
