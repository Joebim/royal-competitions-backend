import { Request, Response, NextFunction } from 'express';
import {
  Cart,
  Competition,
  Order,
  Payment,
  Ticket,
  TicketStatus,
} from '../models';
import { OrderPaymentStatus, OrderStatus } from '../models/Order.model';
import { CompetitionStatus } from '../models/Competition.model';
import { PaymentStatus } from '../models/Payment.model';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import stripeService from '../services/stripe.service';
import logger from '../utils/logger';
import { generateOrderNumber } from '../utils/randomGenerator';

/**
 * Create checkout from cart
 * This creates orders for each competition in the cart
 * Note: Tickets should already be reserved before checkout
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

    // Create an order for each competition in the cart
    for (const cartItem of cart.items) {
      const competition = await Competition.findById(cartItem.competitionId);
      if (!competition) {
        throw new ApiError('Competition not found', 404);
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

      // Calculate available tickets
      const availableTickets =
        competition.ticketLimit !== null
          ? competition.ticketLimit - competition.ticketsSold
          : Infinity;

      if (
        availableTickets !== Infinity &&
        cartItem.quantity > availableTickets
      ) {
        throw new ApiError(
          `Only ${availableTickets} tickets remaining for ${competition.title}`,
          400
        );
      }

      // Calculate amount in pence
      const amountPence = competition.ticketPricePence * cartItem.quantity;

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
      const order = await Order.create({
        userId: req.user._id,
        competitionId: competition._id,
        orderNumber,
        amountPence,
        currency: 'GBP',
        quantity: cartItem.quantity,
        status: OrderStatus.PENDING,
        paymentStatus: OrderPaymentStatus.PENDING,
        ticketsReserved: [], // Will be populated after reservation
        billingDetails,
        shippingAddress,
        marketingOptIn: marketingOptIn || false,
      });

      // Create payment intent
      const paymentIntent = await stripeService.createPaymentIntent({
        amount: amountPence,
        currency: 'gbp',
        metadata: {
          orderId: String(order._id),
          competitionId: String(competition._id),
          userId: String(req.user._id),
        },
      });

      // Update order with payment intent
      order.stripePaymentIntent = paymentIntent.id;
      await order.save();

      // Create payment record
      await Payment.create({
        orderId: order._id,
        userId: req.user._id,
        amount: amountPence,
        paymentIntentId: paymentIntent.id,
        status: PaymentStatus.PENDING,
      });

      orders.push({
        id: order._id,
        competitionId: competition._id,
        competitionTitle: competition.title,
        quantity: cartItem.quantity,
        amountPence,
        amountGBP: (amountPence / 100).toFixed(2),
        clientSecret: paymentIntent.client_secret,
      });
    }

    res.status(201).json(
      ApiResponse.success(
        {
          orders,
          message:
            'Orders created. Please reserve tickets and complete payment for each order.',
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
    const { orderId, billingDetails, shippingAddress, marketingOptIn } =
      req.body;

    if (!orderId) {
      throw new ApiError('Order ID is required', 400);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw new ApiError('Order not found', 404);
    }

    // Check authorization - userId is optional for guest checkout
    const requesterId = req.user ? String(req.user._id) : null;
    if (
      order.userId &&
      requesterId &&
      order.userId.toString() !== requesterId
    ) {
      throw new ApiError('Not authorized', 403);
    }

    // Verify reserved tickets exist
    if (
      !order.ticketsReserved ||
      order.ticketsReserved.length !== order.quantity
    ) {
      throw new ApiError('Tickets must be reserved before checkout', 400);
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

    // Create or update payment intent
    let paymentIntent;
    if (order.stripePaymentIntent) {
      // Use existing payment intent
      paymentIntent = await stripeService.getPaymentIntent(
        order.stripePaymentIntent
      );
    } else {
      // Create new payment intent
      paymentIntent = await stripeService.createPaymentIntent({
        amount: order.amountPence,
        currency: 'gbp',
        metadata: {
          orderId: String(order._id),
          competitionId: String(order.competitionId),
          userId: order.userId ? String(order.userId) : 'guest',
        },
      });

      order.stripePaymentIntent = paymentIntent.id;
      await order.save();

      // Create or update payment record
      await Payment.findOneAndUpdate(
        { paymentIntentId: paymentIntent.id },
        {
          orderId: order._id,
          userId: order.userId,
          amount: order.amountPence,
          paymentIntentId: paymentIntent.id,
          status: PaymentStatus.PENDING,
        },
        { upsert: true, new: true }
      );
    }

    res.json(
      ApiResponse.success(
        {
          order: {
            id: order._id,
            competitionId: order.competitionId,
            amountPence: order.amountPence,
            amountGBP: (order.amountPence / 100).toFixed(2),
            quantity: order.quantity,
            ticketsReserved: order.ticketsReserved,
          },
          payment: {
            clientSecret: paymentIntent.client_secret,
            amount: order.amountPence,
            currency: 'GBP',
          },
        },
        'Payment intent created'
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
    const { orderId, paymentIntentId } = req.body;

    if (!orderId && !paymentIntentId) {
      throw new ApiError('Order ID or Payment Intent ID is required', 400);
    }

    let order;
    if (orderId) {
      order = await Order.findById(orderId);
    } else if (paymentIntentId) {
      order = await Order.findOne({ stripePaymentIntent: paymentIntentId });
    }

    if (!order) {
      throw new ApiError('Order not found', 404);
    }

    // Check authorization
    const requesterId = req.user ? String(req.user._id) : null;
    if (
      order.userId &&
      requesterId &&
      order.userId.toString() !== requesterId
    ) {
      throw new ApiError('Not authorized', 403);
    }

    // Get payment intent status
    let paymentIntent = null;
    if (order.stripePaymentIntent) {
      try {
        paymentIntent = await stripeService.getPaymentIntent(
          order.stripePaymentIntent
        );
      } catch (error: any) {
        logger.error('Error getting payment intent:', error);
      }
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
            amountPence: order.amountPence,
            amountGBP: (order.amountPence / 100).toFixed(2),
            quantity: order.quantity,
            status: order.status,
            paymentStatus: order.paymentStatus,
            ticketsReserved: order.ticketsReserved,
            tickets: tickets.map((ticket) => ({
              id: ticket._id,
              ticketNumber: ticket.ticketNumber,
              status: ticket.status,
            })),
            paymentIntent: paymentIntent
              ? {
                  id: paymentIntent.id,
                  status: paymentIntent.status,
                  amount: paymentIntent.amount,
                  currency: paymentIntent.currency,
                }
              : null,
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
