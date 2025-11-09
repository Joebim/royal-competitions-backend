import { Request, Response, NextFunction } from 'express';
import { Order, Payment } from '../models';
import {
  OrderPaymentStatus,
  OrderStatus,
} from '../models/Order.model';
import { PaymentStatus } from '../models/Payment.model';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import stripeService from '../services/stripe.service';
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

    if (order.userId.toString() !== String(req.user._id)) {
      throw new ApiError('Not authorized', 403);
    }

    const paymentIntent = await stripeService.createPaymentIntent({
      amount: order.total,
      metadata: {
        orderId: String(order._id),
        userId: String(req.user._id),
      },
    });

    order.paymentIntentId = paymentIntent.id;
    await order.save();

    // Create payment record
    await Payment.create({
      orderId: order._id,
      userId: req.user._id,
      amount: order.total,
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

    res.json({ received: true });
  } catch (error: any) {
    logger.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(paymentIntent: any) {
  try {
    const orderId = paymentIntent.metadata.orderId;

    // Update order
    const order = await Order.findById(orderId);
    if (order) {
      order.status = OrderStatus.PROCESSING;
      order.paymentStatus = OrderPaymentStatus.PAID;
      await order.save();
    }

    // Update payment
    await Payment.findOneAndUpdate(
      { paymentIntentId: paymentIntent.id },
      {
        status: PaymentStatus.SUCCEEDED,
        paymentMethod: paymentIntent.payment_method,
      }
    );

    logger.info(`Payment succeeded for order ${orderId}`);
  } catch (error) {
    logger.error('Handle payment success error:', error);
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailure(paymentIntent: any) {
  try {
    const orderId = paymentIntent.metadata.orderId;

    // Update order
    await Order.findByIdAndUpdate(orderId, { status: OrderStatus.FAILED });

    // Update payment
    await Payment.findOneAndUpdate(
      { paymentIntentId: paymentIntent.id },
      { status: PaymentStatus.FAILED }
    );

    logger.info(`Payment failed for order ${orderId}`);
  } catch (error) {
    logger.error('Handle payment failure error:', error);
  }
}

/**
 * Handle refund
 */
async function handleRefund(charge: any) {
  try {
    const paymentIntentId = charge.payment_intent;

    // Update payment
    await Payment.findOneAndUpdate(
      { paymentIntentId },
      {
        status: PaymentStatus.REFUNDED,
        refundId: charge.refunds.data[0].id,
        refundAmount: charge.amount_refunded / 100,
      }
    );

    // Update order
    const payment = await Payment.findOne({ paymentIntentId });
    if (payment) {
      await Order.findByIdAndUpdate(payment.orderId, { status: OrderStatus.REFUNDED });
    }

    logger.info(`Refund processed for payment intent ${paymentIntentId}`);
  } catch (error) {
    logger.error('Handle refund error:', error);
  }
}




