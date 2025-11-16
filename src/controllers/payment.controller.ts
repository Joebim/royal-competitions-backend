import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Order, Payment, Ticket, TicketStatus, Competition, Event, EventType, User } from '../models';
import {
  OrderPaymentStatus,
  OrderStatus,
} from '../models/Order.model';
import { CompetitionStatus } from '../models/Competition.model';
import { PaymentStatus } from '../models/Payment.model';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import stripeService from '../services/stripe.service';
import klaviyoService from '../services/klaviyo.service';
import logger from '../utils/logger';

/**
 * @desc    Create payment intent
 * @route   POST /api/v1/payments/create-intent
 * @access  Private
 */
export const createPaymentIntent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }
    const { orderId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      throw new ApiError('Order not found', 404);
    }

    // Check authorization - userId is optional for guest checkout
    if (order.userId && order.userId.toString() !== String(req.user._id)) {
      throw new ApiError('Not authorized', 403);
    }

    const paymentIntent = await stripeService.createPaymentIntent({
      amount: order.amountPence,
      metadata: {
        orderId: String(order._id),
        userId: order.userId ? String(order.userId) : 'guest',
      },
    });

    order.stripePaymentIntent = paymentIntent.id;
    await order.save();

    // Create payment record
    await Payment.create({
      orderId: order._id,
      userId: order.userId || req.user._id,
      amount: order.amountPence,
      paymentIntentId: paymentIntent.id,
      status: PaymentStatus.PENDING,
    });

    res.json(
      ApiResponse.success(
        { clientSecret: paymentIntent.client_secret },
        'Payment intent created'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Stripe webhook handler
 * @route   POST /api/v1/payments/webhook
 * @access  Public
 */
export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  try {
    const event = stripeService.constructWebhookEvent(req.body, sig);

    logger.info(`Webhook received: ${event.type}`);
    console.log('[Stripe Webhook] Event received:', event.type);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object);
        break;

      case 'charge.refunded':
        await handleRefund(event.data.object);
        break;

      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    const responseBody = { received: true };
    console.log('[Stripe Webhook] Responding with status 200:', responseBody);
    res.status(200).json(responseBody);
  } catch (error: any) {
    logger.error('Webhook error:', error);
    console.log('[Stripe Webhook] Error:', error?.message || error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

/**
 * Handle successful payment
 * Issues tickets and updates order status
 */
async function handlePaymentSuccess(paymentIntent: any) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const orderId = paymentIntent.metadata.orderId;

    // Check idempotency - if order is already paid, skip
    const existingOrder = await Order.findById(orderId).session(session);
    if (!existingOrder) {
      logger.error(`Order ${orderId} not found`);
      await session.abortTransaction();
      return;
    }

    if (existingOrder.paymentStatus === OrderPaymentStatus.PAID) {
      logger.info(`Order ${orderId} already processed, skipping`);
      await session.abortTransaction();
      return;
    }

    // Update order status
    existingOrder.status = OrderStatus.COMPLETED;
    existingOrder.paymentStatus = OrderPaymentStatus.PAID;
    existingOrder.paymentReference = paymentIntent.id;
    await existingOrder.save({ session });

    // Update reserved tickets to active
    await Ticket.updateMany(
      {
        competitionId: existingOrder.competitionId,
        ticketNumber: { $in: existingOrder.ticketsReserved },
        status: TicketStatus.RESERVED,
      },
      {
        $set: {
          status: TicketStatus.ACTIVE,
          orderId: existingOrder._id,
          userId: existingOrder.userId,
        },
        $unset: {
          reservedUntil: 1,
        },
      },
      { session }
    );

    // Increment competition ticketsSold
    const updatedCompetition = await Competition.findByIdAndUpdate(
      existingOrder.competitionId,
      { $inc: { ticketsSold: existingOrder.quantity } },
      { session, new: true }
    );

    // Check if competition should be closed (ticket limit reached)
    if (updatedCompetition && updatedCompetition.ticketLimit !== null && updatedCompetition.ticketsSold >= updatedCompetition.ticketLimit) {
      updatedCompetition.status = CompetitionStatus.CLOSED;
      await updatedCompetition.save({ session });
    }

    // Create event logs
    await Event.create(
      [
        {
          type: EventType.ORDER_PAID,
          entity: 'order',
          entityId: existingOrder._id,
          userId: existingOrder.userId,
          competitionId: existingOrder.competitionId,
          payload: {
            amountPence: existingOrder.amountPence,
            ticketNumbers: existingOrder.ticketsReserved,
          },
        },
        {
          type: EventType.TICKET_ISSUED,
          entity: 'ticket',
          entityId: existingOrder.competitionId,
          userId: existingOrder.userId,
          competitionId: existingOrder.competitionId,
          payload: {
            ticketNumbers: existingOrder.ticketsReserved,
            orderId: String(existingOrder._id),
          },
        },
      ],
      { session }
    );

    // Update payment record
    await Payment.findOneAndUpdate(
      { paymentIntentId: paymentIntent.id },
      {
        status: PaymentStatus.SUCCEEDED,
        paymentMethod: paymentIntent.payment_method,
      },
      { session }
    );

    await session.commitTransaction();

    // Get user and competition for Klaviyo
    const user = existingOrder.userId ? await User.findById(existingOrder.userId) : null;
    const competitionForKlaviyo = await Competition.findById(existingOrder.competitionId);

    // Send Klaviyo notification (for both authenticated users and guests)
    if (competitionForKlaviyo && existingOrder.billingDetails?.email) {
      try {
        await klaviyoService.trackTicketPurchased(
          existingOrder.billingDetails.email,
          existingOrder.billingDetails.phone || user?.phone,
          String(competitionForKlaviyo._id),
          competitionForKlaviyo.title,
          existingOrder.ticketsReserved,
          existingOrder.amountPence,
          user?.firstName || existingOrder.billingDetails.firstName,
          user?.lastName || existingOrder.billingDetails.lastName
        );
      } catch (error: any) {
        // Don't fail the webhook if Klaviyo fails
        logger.error('Error sending Klaviyo notification:', error);
      }
    }

    logger.info(`Payment succeeded and tickets issued for order ${orderId}`);
  } catch (error: any) {
    await session.abortTransaction();
    logger.error('Handle payment success error:', error);
    // Don't throw - webhook should return 200 even if processing fails
    // Stripe will retry
  } finally {
    session.endSession();
  }
}

/**
 * Handle failed payment
 * Releases reserved tickets
 */
async function handlePaymentFailure(paymentIntent: any) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const orderId = paymentIntent.metadata.orderId;

    const order = await Order.findById(orderId).session(session);
    if (!order) {
      logger.error(`Order ${orderId} not found`);
      await session.abortTransaction();
      return;
    }

    // Update order status
    order.status = OrderStatus.FAILED;
    order.paymentStatus = OrderPaymentStatus.FAILED;
    await order.save({ session });

    // Release reserved tickets (delete or mark as cancelled)
    await Ticket.deleteMany(
      {
        competitionId: order.competitionId,
        ticketNumber: { $in: order.ticketsReserved },
        status: TicketStatus.RESERVED,
      },
      { session }
    );

    // Create event log
    await Event.create(
      [
        {
          type: EventType.ORDER_FAILED,
          entity: 'order',
          entityId: order._id,
          userId: order.userId,
          competitionId: order.competitionId,
          payload: {
            amountPence: order.amountPence,
            ticketNumbers: order.ticketsReserved,
          },
        },
      ],
      { session }
    );

    // Update payment
    await Payment.findOneAndUpdate(
      { paymentIntentId: paymentIntent.id },
      { status: PaymentStatus.FAILED },
      { session }
    );

    await session.commitTransaction();

    logger.info(`Payment failed and tickets released for order ${orderId}`);
  } catch (error: any) {
    await session.abortTransaction();
    logger.error('Handle payment failure error:', error);
  } finally {
    session.endSession();
  }
}

/**
 * Handle refund
 * Marks tickets as refunded and decrements competition ticketsSold
 */
async function handleRefund(charge: any) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const paymentIntentId = charge.payment_intent;

    // Find order by payment intent
    const order = await Order.findOne({ stripePaymentIntent: paymentIntentId }).session(session);
    if (!order) {
      logger.error(`Order not found for payment intent ${paymentIntentId}`);
      await session.abortTransaction();
      return;
    }

    // Update payment
    await Payment.findOneAndUpdate(
      { paymentIntentId },
      {
        status: PaymentStatus.REFUNDED,
        refundId: charge.refunds.data[0].id,
        refundAmount: charge.amount_refunded,
      },
      { session }
    );

    // Update order
    order.status = OrderStatus.REFUNDED;
    order.paymentStatus = OrderPaymentStatus.REFUNDED;
    await order.save({ session });

    // Mark tickets as refunded
    await Ticket.updateMany(
      {
        competitionId: order.competitionId,
        ticketNumber: { $in: order.ticketsReserved },
        status: TicketStatus.ACTIVE,
      },
      {
        $set: {
          status: TicketStatus.REFUNDED,
        },
      },
      { session }
    );

    // Decrement competition ticketsSold
    await Competition.findByIdAndUpdate(
      order.competitionId,
      { $inc: { ticketsSold: -order.quantity } },
      { session }
    );

    // Create event log
    await Event.create(
      [
        {
          type: EventType.ORDER_REFUNDED,
          entity: 'order',
          entityId: order._id,
          userId: order.userId,
          competitionId: order.competitionId,
          payload: {
            amountPence: order.amountPence,
            refundAmount: charge.amount_refunded,
            ticketNumbers: order.ticketsReserved,
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();

    logger.info(`Refund processed for payment intent ${paymentIntentId}`);
  } catch (error: any) {
    await session.abortTransaction();
    logger.error('Handle refund error:', error);
  } finally {
    session.endSession();
  }
}




