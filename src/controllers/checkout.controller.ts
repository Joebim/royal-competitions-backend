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
import paypalService from '../services/paypal.service';
import { config } from '../config/environment';
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

      // Check for existing reserved tickets for this user and competition
      const existingReservations = await Ticket.find({
        competitionId: competition._id,
        userId: req.user._id,
        status: TicketStatus.RESERVED,
        reservedUntil: { $gt: now },
      }).sort({ ticketNumber: 1 });

      let ticketsReserved: number[] = [];

      // If we have valid reservations, use them
      if (existingReservations.length >= cartItem.quantity) {
        // Use existing reservations (take the first N)
        ticketsReserved = existingReservations
          .slice(0, cartItem.quantity)
          .map((t) => t.ticketNumber);
        
        // If we have more reservations than needed, delete the extras
        if (existingReservations.length > cartItem.quantity) {
          const extras = existingReservations.slice(cartItem.quantity);
          await Ticket.deleteMany({
            _id: { $in: extras.map((t) => t._id) },
          });
        }
      } else {
        // Need to reserve tickets (either none exist or some expired)
        // First, clean up any expired reservations for this user
        await Ticket.deleteMany({
          competitionId: competition._id,
          userId: req.user._id,
          status: TicketStatus.RESERVED,
          $or: [
            { reservedUntil: { $lt: now } },
            { reservedUntil: { $exists: false } },
          ],
        });

        // Check remaining tickets (excluding expired reservations)
        const reservedCount = await Ticket.countDocuments({
          competitionId: competition._id,
          status: TicketStatus.RESERVED,
          reservedUntil: { $gt: now },
        });

        const activeTicketsCount = await Ticket.countDocuments({
          competitionId: competition._id,
          status: { $in: [TicketStatus.ACTIVE, TicketStatus.WINNER] },
        });

        const availableTickets =
          competition.ticketLimit !== null
            ? competition.ticketLimit - activeTicketsCount
            : Infinity;

        const totalAvailable =
          availableTickets === Infinity
            ? Infinity
            : availableTickets - reservedCount;

        if (totalAvailable !== Infinity && cartItem.quantity > totalAvailable) {
          throw new ApiError(
            `Only ${totalAvailable} tickets remaining for ${competition.title}. Please remove some items from your cart.`,
            400
          );
        }

        // Try to reserve tickets using the improved reservation system
        try {
          // Find and reserve available ticket numbers
          const reservedUntil = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
          
          // Get all existing ticket numbers
          const existingTickets = await Ticket.find({
            competitionId: competition._id,
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

          while (availableNumbers.length < cartItem.quantity) {
            if (!existingNumbers.has(candidate)) {
              availableNumbers.push(candidate);
            }
            candidate++;

            if (candidate > 1000000) {
              throw new ApiError(
                'Unable to find available ticket numbers',
                500
              );
            }
          }

          // Reserve tickets atomically
          const ticketsToCreate = availableNumbers.map((ticketNumber) => ({
            competitionId: competition._id,
            ticketNumber,
            userId: req.user!._id, // Already checked at top of function
            status: TicketStatus.RESERVED,
            reservedUntil,
          }));

          try {
            await Ticket.insertMany(ticketsToCreate, { ordered: false });
            ticketsReserved = availableNumbers;
          } catch (insertError: any) {
            if (insertError.code === 11000) {
              // Duplicate key - tickets were taken, try again or fail
              throw new ApiError(
                `Tickets for ${competition.title} are no longer available. Please try again.`,
                409
              );
            }
            throw insertError;
          }
        } catch (reserveError: any) {
          if (reserveError instanceof ApiError) {
            throw reserveError;
          }
          logger.error('Error reserving tickets during checkout:', reserveError);
          throw new ApiError(
            `Unable to reserve tickets for ${competition.title}. Please try again.`,
            500
          );
        }
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

      // Create order with reserved tickets
      const order = await Order.create({
        userId: req.user._id,
        competitionId: competition._id,
        orderNumber,
        amountPence,
        currency: 'GBP',
        quantity: cartItem.quantity,
        status: OrderStatus.PENDING,
        paymentStatus: OrderPaymentStatus.PENDING,
        ticketsReserved, // Now populated with actual reserved ticket numbers
        billingDetails,
        shippingAddress,
        marketingOptIn: marketingOptIn || false,
      });

      // Create PayPal order
      const paypalOrder = await paypalService.createOrder({
        amount: amountPence,
        currency: 'GBP',
        orderId: String(order._id),
        userId: String(req.user._id),
        competitionId: String(competition._id),
        returnUrl: `${config.frontendUrl}/payment/success?orderId=${order._id}`,
        cancelUrl: `${config.frontendUrl}/payment/cancel?orderId=${order._id}`,
      });

      // Update order with PayPal order ID
      order.paypalOrderId = paypalOrder.id;
      await order.save();

      // Create payment record
      await Payment.create({
        orderId: order._id,
        userId: req.user._id,
        amount: amountPence,
        paymentIntentId: paypalOrder.id,
        status: PaymentStatus.PENDING,
      });

      orders.push({
        id: order._id,
        competitionId: competition._id,
        competitionTitle: competition.title,
        quantity: cartItem.quantity,
        amountPence,
        amountGBP: (amountPence / 100).toFixed(2),
        paypalOrderId: paypalOrder.id,
        orderID: paypalOrder.id, // For PayPal Buttons
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

    // Create or update PayPal order
    let paypalOrder;
    if (order.paypalOrderId) {
      // Order already has PayPal order ID, return it
      paypalOrder = { id: order.paypalOrderId };
    } else {
      // Create new PayPal order
      paypalOrder = await paypalService.createOrder({
        amount: order.amountPence,
        currency: 'GBP',
        orderId: String(order._id),
        userId: order.userId ? String(order.userId) : 'guest',
        competitionId: String(order.competitionId),
        returnUrl: `${config.frontendUrl}/payment/success?orderId=${order._id}`,
        cancelUrl: `${config.frontendUrl}/payment/cancel?orderId=${order._id}`,
      });

      order.paypalOrderId = paypalOrder.id;
      await order.save();

      // Create or update payment record
      await Payment.findOneAndUpdate(
        { paymentIntentId: paypalOrder.id },
        {
          orderId: order._id,
          userId: order.userId,
          amount: order.amountPence,
          paymentIntentId: paypalOrder.id,
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
            paypalOrderId: paypalOrder.id,
            orderID: paypalOrder.id, // For PayPal Buttons
            amount: order.amountPence,
            currency: 'GBP',
          },
        },
        'PayPal order created'
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
    const { orderId, paypalOrderId } = req.body;

    if (!orderId && !paypalOrderId) {
      throw new ApiError('Order ID or PayPal Order ID is required', 400);
    }

    let order;
    if (orderId) {
      order = await Order.findById(orderId);
    } else if (paypalOrderId) {
      order = await Order.findOne({ paypalOrderId });
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

    // Check PayPal order status if paypalOrderId is provided
    // Note: For PayPal, we rely on webhooks for payment confirmation
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
            paypalOrderId: order.paypalOrderId || null,
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
