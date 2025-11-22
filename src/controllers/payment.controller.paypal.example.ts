/**
 * PAYPAL PAYMENT CONTROLLER EXAMPLE
 *
 * This is an example of how to update payment.controller.ts to use PayPal instead of Stripe.
 * Replace the existing payment.controller.ts with this implementation.
 */

import { Request, Response, NextFunction } from 'express';
import {
  Order,
  Payment,
  Ticket,
  TicketStatus,
  Competition,
  Event,
  EventType,
} from '../models';
import { OrderPaymentStatus, OrderStatus } from '../models/Order.model';
import { CompetitionStatus } from '../models/Competition.model';
import { PaymentStatus } from '../models/Payment.model';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import paypalService from '../services/paypal.service';
import { config } from '../config/environment';
import klaviyoService from '../services/klaviyo.service';
import logger from '../utils/logger';

/**
 * @desc    Create PayPal order
 * @route   POST /api/v1/payments/create-order
 * @access  Public (can be called from frontend)
 *
 * This endpoint creates a PayPal order and returns the orderID
 * Frontend will use this orderID with PayPal Buttons
 */
export const createPayPalOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { amount, orderId } = req.body;

    if (!amount) {
      throw new ApiError('Amount is required', 400);
    }

    // If orderId is provided, verify it exists
    let order = null;
    if (orderId) {
      order = await Order.findById(orderId);
      if (!order) {
        throw new ApiError('Order not found', 404);
      }

      // Check authorization if user is authenticated
      if (
        req.user &&
        order.userId &&
        order.userId.toString() !== String(req.user._id)
      ) {
        throw new ApiError('Not authorized', 403);
      }
    }

    // Create PayPal order
    const paypalOrder = await paypalService.createOrder({
      amount: order ? (order.amount || ((order as any).amountPence ? (order as any).amountPence / 100 : 0)) : amount,
      currency: order?.currency || 'GBP',
      orderId: orderId || undefined,
      userId: order?.userId
        ? String(order.userId)
        : req.user?._id?.toString() || 'guest',
      competitionId: order ? String(order.competitionId) : undefined,
      returnUrl: orderId
        ? `${config.frontendUrl}/payment/success?orderId=${orderId}`
        : undefined,
      cancelUrl: orderId
        ? `${config.frontendUrl}/payment/cancel?orderId=${orderId}`
        : undefined,
    });

    // Update order with PayPal order ID if order exists
    if (order) {
      order.paypalOrderId = paypalOrder.id;
      await order.save();

      // Create payment record
      await Payment.create({
        orderId: order._id,
        userId: order.userId || req.user?._id,
        amount: order.amount || ((order as any).amountPence ? (order as any).amountPence / 100 : 0),
        paymentIntentId: paypalOrder.id,
        status: PaymentStatus.PENDING,
      });
    }

    // Return orderID for frontend PayPal Buttons
    res.json(
      ApiResponse.success(
        {
          orderID: paypalOrder.id,
          paypalOrderId: paypalOrder.id, // Alias for consistency
        },
        'PayPal order created'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Capture PayPal payment
 * @route   POST /api/v1/payments/capture-order
 * @access  Public (called from frontend after PayPal approval)
 *
 * This endpoint captures the PayPal payment after user approval
 * Frontend calls this after PayPal Buttons onApprove callback
 */
export const capturePayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { orderID, orderId } = req.body;

    // orderID is from PayPal (preferred)
    // orderId is our internal order ID (fallback)
    const paypalOrderId = orderID || req.body.paypalOrderId;

    if (!paypalOrderId) {
      throw new ApiError('PayPal orderID is required', 400);
    }

    // Find order by PayPal order ID or internal order ID
    let order = null;
    if (orderId) {
      order = await Order.findById(orderId);
      if (!order) {
        throw new ApiError('Order not found', 404);
      }
    } else {
      order = await Order.findOne({ paypalOrderId });
      if (!order) {
        // Order might not exist yet if created directly from frontend
        // This is okay - we'll create it during capture
        logger.warn(`Order not found for PayPal order ${paypalOrderId}`);
      }
    }

    // Check if order is already paid (if order exists)
    if (order && order.paymentStatus === OrderPaymentStatus.PAID) {
      logger.info(`Order ${order._id} already paid, returning success`);
      res.json(
        ApiResponse.success(
          {
            orderId: order._id,
            status: 'completed',
            alreadyPaid: true,
          },
          'Payment already completed'
        )
      );
      return;
    }

    // Capture the payment
    const captureResult = await paypalService.captureOrder(paypalOrderId);

    // Check if payment was successful
    if (captureResult.status === 'COMPLETED') {
      // Get the capture details
      const capture =
        captureResult.purchase_units?.[0]?.payments?.captures?.[0];

      if (capture && order) {
        await handlePaymentSuccess({
          ...capture,
          order_id: paypalOrderId,
          supplementary_data: {
            related_ids: {
              order_id: paypalOrderId,
            },
          },
        });
      }

      res.json(
        ApiResponse.success(
          {
            status: 'success',
            orderId: order?._id || null,
            captureId: capture?.id,
            paypalOrderId: paypalOrderId,
            data: captureResult,
          },
          'Payment captured successfully'
        )
      );
      return;
    } else {
      throw new ApiError(
        `Payment capture failed with status: ${captureResult.status}`,
        400
      );
    }
  } catch (error: any) {
    logger.error('Capture payment error:', error);
    next(error);
  }
};

/**
 * @desc    Confirm PayPal payment (alternative endpoint for clarity)
 * @route   POST /api/v1/payments/confirm
 * @access  Public
 *
 * Alias for capturePayment - provides clearer naming for frontend
 */
export const confirmPayment = capturePayment;

/**
 * @desc    PayPal webhook handler
 * @route   POST /api/v1/payments/webhook
 * @access  Public
 */
export const handleWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Verify webhook signature
    const verified = await paypalService.verifyWebhookSignature(
      req.headers as any,
      JSON.stringify(req.body),
      config.paypal.webhookId
    );

    if (!verified) {
      logger.error('Invalid PayPal webhook signature');
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }

    const event = req.body;
    logger.info(`PayPal webhook received: ${event.event_type}`);

    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handlePaymentSuccess(event.resource);
        break;

      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.REFUNDED':
        await handlePaymentFailure(event.resource);
        break;

      case 'PAYMENT.CAPTURE.REFUNDED':
        await handleRefund(event.resource);
        break;

      default:
        logger.info(`Unhandled PayPal event type: ${event.event_type}`);
    }

    res.status(200).json({ received: true });
    return;
  } catch (error: any) {
    logger.error('PayPal webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
    return;
  }
};

/**
 * Handle successful payment
 * Issues tickets and updates order status
 */
export async function handlePaymentSuccess(capture: any) {
  try {
    // Find order by PayPal order ID
    const paypalOrderId =
      capture.supplementary_data?.related_ids?.order_id || capture.order_id;

    const order = await Order.findOne({ paypalOrderId });

    if (!order) {
      logger.error(`Order not found for PayPal order ${paypalOrderId}`);
      return;
    }

    // Check idempotency - if order is already paid, skip
    if (order.paymentStatus === OrderPaymentStatus.PAID) {
      logger.info(`Order ${order._id} already processed, skipping`);
      return;
    }

    // Update order status
    order.status = OrderStatus.COMPLETED;
    order.paymentStatus = OrderPaymentStatus.PAID;
    order.paymentReference = capture.id;
    await order.save();

    // Update reserved tickets to active
    await Ticket.updateMany(
      {
        competitionId: order.competitionId,
        ticketNumber: { $in: order.ticketsReserved },
        status: TicketStatus.RESERVED,
      },
      {
        $set: {
          status: TicketStatus.ACTIVE,
          orderId: order._id,
          userId: order.userId,
        },
        $unset: {
          reservedUntil: 1,
        },
      }
    );

    // Increment competition ticketsSold
    const updatedCompetition = await Competition.findByIdAndUpdate(
      order.competitionId,
      { $inc: { ticketsSold: order.quantity } },
      { new: true }
    );

    // Check if competition should be closed (ticket limit reached)
    if (
      updatedCompetition &&
      updatedCompetition.ticketLimit !== null &&
      updatedCompetition.ticketsSold >= updatedCompetition.ticketLimit
    ) {
      updatedCompetition.status = CompetitionStatus.CLOSED;
      await updatedCompetition.save();
    }

    // Create event logs
    await Event.create([
      {
        type: EventType.ORDER_PAID,
        entity: 'order',
        entityId: order._id,
        userId: order.userId,
        competitionId: order.competitionId,
        payload: {
          amount: order.amount || ((order as any).amountPence ? (order as any).amountPence / 100 : 0),
          ticketNumbers: order.ticketsReserved,
        },
      },
      {
        type: EventType.TICKET_ISSUED,
        entity: 'ticket',
        entityId: order.competitionId,
        userId: order.userId,
        competitionId: order.competitionId,
        payload: {
          ticketNumbers: order.ticketsReserved,
          orderId: String(order._id),
        },
      },
    ]);

    // Update payment record
    await Payment.findOneAndUpdate(
      { paymentIntentId: paypalOrderId },
      {
        status: PaymentStatus.SUCCEEDED,
        paymentMethod: 'paypal',
      }
    );

    // Get competition for Klaviyo
    const competitionForKlaviyo = await Competition.findById(
      order.competitionId
    );

    // Send Klaviyo notification
    if (competitionForKlaviyo && order.billingDetails?.email) {
      try {
        // Track "Placed Order" event
        await klaviyoService.trackEvent(
          order.billingDetails.email,
          'Placed Order',
          {
            competition_id: String(competitionForKlaviyo._id),
            competition_name: competitionForKlaviyo.title,
            order_id: String(order._id),
            ticket_numbers: order.ticketsReserved,
          },
          order.amount || ((order as any).amountPence ? (order as any).amountPence / 100 : 0)
        );
        
        // Track "Paid Competition Entry" event
        await klaviyoService.trackEvent(
          order.billingDetails.email,
          'Paid Competition Entry',
          {
            competition_id: String(competitionForKlaviyo._id),
            competition_name: competitionForKlaviyo.title,
            order_id: String(order._id),
            ticket_numbers: order.ticketsReserved,
          },
          order.amount || ((order as any).amountPence ? (order as any).amountPence / 100 : 0)
        );
      } catch (error: any) {
        logger.error('Error sending Klaviyo notification:', error);
      }
    }

    logger.info(`Payment succeeded and tickets issued for order ${order._id}`);
  } catch (error: any) {
    logger.error('Handle payment success error:', error);
  }
}

/**
 * Handle failed payment
 * Releases reserved tickets
 */
async function handlePaymentFailure(capture: any) {
  try {
    const paypalOrderId = capture.order_id;
    const order = await Order.findOne({ paypalOrderId });

    if (!order) {
      logger.error(`Order not found for PayPal order ${paypalOrderId}`);
      return;
    }

    // Update order status
    order.status = OrderStatus.FAILED;
    order.paymentStatus = OrderPaymentStatus.FAILED;
    await order.save();

    // Release reserved tickets
    await Ticket.deleteMany({
      competitionId: order.competitionId,
      ticketNumber: { $in: order.ticketsReserved },
      status: TicketStatus.RESERVED,
    });

    // Create event log
    await Event.create([
      {
        type: EventType.ORDER_FAILED,
        entity: 'order',
        entityId: order._id,
        userId: order.userId,
        competitionId: order.competitionId,
        payload: {
          amount: order.amount || ((order as any).amountPence ? (order as any).amountPence / 100 : 0),
          ticketNumbers: order.ticketsReserved,
        },
      },
    ]);

    // Update payment
    await Payment.findOneAndUpdate(
      { paymentIntentId: paypalOrderId },
      { status: PaymentStatus.FAILED }
    );

    logger.info(`Payment failed and tickets released for order ${order._id}`);
  } catch (error: any) {
    logger.error('Handle payment failure error:', error);
  }
}

/**
 * Handle refund
 * Marks tickets as refunded and decrements competition ticketsSold
 */
async function handleRefund(refund: any) {
  try {
    const captureId = refund.capture_id;

    // Find payment by capture ID
    const payment = await Payment.findOne({ paymentReference: captureId });
    if (!payment) {
      logger.error(`Payment not found for capture ${captureId}`);
      return;
    }

    const order = await Order.findById(payment.orderId);
    if (!order) {
      logger.error(`Order not found for payment ${payment._id}`);
      return;
    }

    // Update payment
    await Payment.findByIdAndUpdate(payment._id, {
      status: PaymentStatus.REFUNDED,
      refundId: refund.id,
      refundAmount: Math.round(parseFloat(refund.amount.value) * 100), // Convert to pence
    });

    // Update order
    order.status = OrderStatus.REFUNDED;
    order.paymentStatus = OrderPaymentStatus.REFUNDED;
    await order.save();

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
      }
    );

    // Decrement competition ticketsSold
    await Competition.findByIdAndUpdate(order.competitionId, {
      $inc: { ticketsSold: -order.quantity },
    });

    // Create event log
    await Event.create([
      {
        type: EventType.ORDER_REFUNDED,
        entity: 'order',
        entityId: order._id,
        userId: order.userId,
        competitionId: order.competitionId,
        payload: {
          amount: order.amount || ((order as any).amountPence ? (order as any).amountPence / 100 : 0),
          refundAmount: Math.round(parseFloat(refund.amount.value) * 100),
          ticketNumbers: order.ticketsReserved,
        },
      },
    ]);

    logger.info(`Refund processed for capture ${captureId}`);
  } catch (error: any) {
    logger.error('Handle refund error:', error);
  }
}
