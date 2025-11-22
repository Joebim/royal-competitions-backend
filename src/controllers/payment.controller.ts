import { Request, Response, NextFunction } from 'express';
import {
  Order,
  Payment,
  Ticket,
  TicketStatus,
  Competition,
  Event,
  EventType,
  User,
} from '../models';
import { OrderPaymentStatus, OrderStatus } from '../models/Order.model';
import { CompetitionStatus } from '../models/Competition.model';
import { PaymentStatus } from '../models/Payment.model';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import paypalService from '../services/paypal.service';
import { config } from '../config/environment';
import klaviyoService from '../services/klaviyo.service';
import emailService from '../services/email.service';
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
): Promise<void> => {
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
    const orderAmount = order
      ? order.amount ||
        ((order as any).amountPence ? (order as any).amountPence / 100 : 0)
      : amount;
    const paypalOrder = await paypalService.createOrder({
      amount: orderAmount,
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
        amount: orderAmount,
        paymentIntentId: paypalOrder.id,
        status: PaymentStatus.PENDING,
      });

      // Track "Started Checkout" event in Klaviyo
      try {
        const competition = await Competition.findById(order.competitionId);
        const email = order.billingDetails?.email;

        if (email && competition) {
          await klaviyoService.trackEvent(
            email,
            'Started Checkout',
            {
              competition_id: String(order.competitionId),
              competition_name: competition.title,
              order_id: String(order._id),
              items: [
                {
                  competition_id: String(order.competitionId),
                  competition_name: competition.title,
                  quantity: order.quantity,
                  ticket_numbers: order.ticketsReserved || [],
                },
              ],
            },
            orderAmount
          );
        }
      } catch (error: any) {
        logger.error('Error tracking Started Checkout event:', error);
      }
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
    return;
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
        // If order doesn't have userId but user is authenticated, update order with userId
        if (!order.userId && req.user?._id) {
          order.userId = req.user._id as any;
          await order.save();
          logger.info(
            `Updated order ${order._id} with userId ${req.user._id} from authenticated user`
          );
        }
        await handlePaymentSuccess(
          {
            ...capture,
            order_id: paypalOrderId,
            supplementary_data: {
              related_ids: {
                order_id: paypalOrderId,
              },
            },
          },
          req.user?._id // Pass authenticated user ID if available
        );
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
export async function handlePaymentSuccess(
  capture: any,
  authenticatedUserId?: any
) {
  try {
    // Find order by PayPal order ID
    const paypalOrderId =
      capture.supplementary_data?.related_ids?.order_id || capture.order_id;

    const order = await Order.findOne({ paypalOrderId });

    if (!order) {
      logger.error(`Order not found for PayPal order ${paypalOrderId}`);
      return;
    }

    // If order doesn't have userId but authenticatedUserId is provided, update order
    if (!order.userId && authenticatedUserId) {
      order.userId = authenticatedUserId;
      await order.save();
      logger.info(
        `Updated order ${order._id} with userId ${authenticatedUserId} from authenticated user`
      );
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
    // First, try to find tickets by RESERVED status
    const updateResult = await Ticket.updateMany(
      {
        competitionId: order.competitionId,
        ticketNumber: { $in: order.ticketsReserved },
        status: TicketStatus.RESERVED,
      },
      {
        $set: {
          status: TicketStatus.ACTIVE,
          orderId: order._id,
          userId: order.userId || null, // Set userId even if null (for guest orders)
        },
        $unset: {
          reservedUntil: 1,
        },
      }
    );

    // If no tickets were updated, check if tickets exist at all
    if (updateResult.matchedCount === 0) {
      logger.warn(
        `No RESERVED tickets found for order ${order._id}, checking if tickets exist`
      );

      // Check if any tickets exist with these numbers (regardless of status)
      const existingTickets = await Ticket.find({
        competitionId: order.competitionId,
        ticketNumber: { $in: order.ticketsReserved },
      });

      const existingNumbers = new Set(
        existingTickets.map((t) => t.ticketNumber)
      );
      const missingNumbers = order.ticketsReserved.filter(
        (num) => !existingNumbers.has(num)
      );

      // If tickets don't exist, create them as ACTIVE
      if (missingNumbers.length > 0) {
        logger.info(
          `Creating ${missingNumbers.length} missing tickets for order ${order._id}`
        );
        const ticketsToCreate = missingNumbers.map((ticketNumber) => ({
          competitionId: order.competitionId,
          ticketNumber,
          status: TicketStatus.ACTIVE,
          orderId: order._id,
          userId: order.userId || null,
        }));

        await Ticket.insertMany(ticketsToCreate);
        logger.info(
          `Created ${missingNumbers.length} tickets for order ${order._id}`
        );
      }

      // Update any existing tickets that aren't already ACTIVE
      if (existingTickets.length > 0) {
        await Ticket.updateMany(
          {
            competitionId: order.competitionId,
            ticketNumber: { $in: order.ticketsReserved },
            status: { $ne: TicketStatus.ACTIVE }, // Only update if not already ACTIVE
          },
          {
            $set: {
              status: TicketStatus.ACTIVE,
              orderId: order._id,
              userId: order.userId || null,
            },
            $unset: {
              reservedUntil: 1,
            },
          }
        );
      }
    }

    // Log the update for debugging
    logger.info(
      `Updated ${updateResult.modifiedCount} tickets to ACTIVE for order ${order._id}, userId: ${order.userId || 'null'}`
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
          amount:
            order.amount ||
            ((order as any).amountPence ? (order as any).amountPence / 100 : 0),
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

    // Get user and competition for Klaviyo
    const user = order.userId ? await User.findById(order.userId) : null;
    const competitionForKlaviyo = await Competition.findById(
      order.competitionId
    );

    const email = order.billingDetails?.email;
    const orderAmount =
      order.amount ||
      ((order as any).amountPence ? (order as any).amountPence / 100 : 0);

    // Track Klaviyo events for successful payment
    if (competitionForKlaviyo && email) {
      try {
        // Track "Placed Order" event
        await klaviyoService.trackEvent(
          email,
          'Placed Order',
          {
            competition_id: String(order.competitionId),
            competition_name: competitionForKlaviyo.title,
            order_id: String(order._id),
            order_number: order.orderNumber,
            items: [
              {
                competition_id: String(order.competitionId),
                competition_name: competitionForKlaviyo.title,
                quantity: order.quantity,
                ticket_numbers: order.ticketsReserved || [],
              },
            ],
          },
          orderAmount
        );

        // Track "Paid Competition Entry" event
        await klaviyoService.trackEvent(
          email,
          'Paid Competition Entry',
          {
            competition_id: String(order.competitionId),
            competition_name: competitionForKlaviyo.title,
            order_id: String(order._id),
            ticket_numbers: order.ticketsReserved || [],
            quantity: order.quantity,
          },
          orderAmount
        );

        // Handle marketing opt-in subscriptions
        if (order.marketingOptIn) {
          // Subscribe to email list
          await klaviyoService.subscribeToEmailList(email);

          // Subscribe to SMS list if phone provided
          const phone = order.billingDetails?.phone || user?.phone;
          if (phone) {
            await klaviyoService.subscribeToSMSList(phone, email);
          }
        }

        // Handle referral reward: Grant 10 free entries to referrer on first paid entry
        if (user && user.referredBy) {
          try {
            // Find the payment record for this order
            const paymentRecord = await Payment.findOne({ orderId: order._id });

            // Check if this is the user's first successful paid entry
            const previousSuccessfulPayments = await Payment.countDocuments({
              userId: user._id,
              status: PaymentStatus.SUCCEEDED,
              ...(paymentRecord ? { _id: { $ne: paymentRecord._id } } : {}), // Exclude current payment if it exists
            });

            // Only grant reward on first paid entry
            if (previousSuccessfulPayments === 0) {
              // Get the referrer
              const referrer = await User.findById(user.referredBy);

              if (referrer && !user.hasReceivedReferralReward) {
                // Grant 10 free entries to referrer
                await klaviyoService.grantFreeEntriesAndTrack(
                  String(referrer._id),
                  10,
                  'referral_reward'
                );

                // Mark that reward has been given for this referral
                user.hasReceivedReferralReward = true;
                await user.save();

                logger.info(
                  `Granted 10 free entries to referrer ${referrer.email} for referral of ${email}`
                );
              }
            }
          } catch (error: any) {
            logger.error('Error processing referral reward:', error);
            // Don't fail payment if referral reward fails
          }
        }

        // Update/identify profile in Klaviyo
        if (user) {
          await klaviyoService.identifyOrUpdateProfile(user);
        }
      } catch (error: any) {
        logger.error('Error tracking Klaviyo events:', error);
      }
    }

    // Send email notification
    if (competitionForKlaviyo && order.billingDetails?.email) {
      try {
        await emailService.sendPaymentSuccessEmail({
          email: order.billingDetails.email,
          firstName:
            user?.firstName ||
            order.billingDetails.firstName ||
            'Valued Customer',
          lastName: user?.lastName || order.billingDetails.lastName,
          orderNumber: order.orderNumber,
          competitionTitle: competitionForKlaviyo.title,
          ticketNumbers: order.ticketsReserved,
          amountGBP: (
            order.amount ||
            ((order as any).amountPence ? (order as any).amountPence / 100 : 0)
          ).toFixed(2),
          orderId: String(order._id),
        });
        logger.info(
          `Payment success email sent to ${order.billingDetails.email}`
        );
      } catch (error: any) {
        logger.error('Error sending payment success email:', error);
        // Don't fail the payment process if email fails
      }
    }

    logger.info(`Payment succeeded and tickets issued for order ${order._id}`);
  } catch (error: any) {
    logger.error('Handle payment success error:', error);
  }
}

/**
 * Fix tickets for a paid order that doesn't have tickets
 * This is a utility function to retroactively create tickets for orders
 * that were paid but tickets weren't created
 */
export async function fixOrderTickets(orderId: string) {
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new ApiError('Order not found', 404);
    }

    if (order.paymentStatus !== OrderPaymentStatus.PAID) {
      throw new ApiError('Order is not paid', 400);
    }

    // Check if tickets already exist
    const existingTickets = await Ticket.find({
      orderId: order._id,
      status: { $in: [TicketStatus.ACTIVE, TicketStatus.WINNER] },
    });

    if (existingTickets.length === order.quantity) {
      logger.info(
        `Order ${order._id} already has ${existingTickets.length} tickets`
      );
      return {
        created: 0,
        updated: 0,
        total: existingTickets.length,
      };
    }

    // Check which ticket numbers need to be created
    const existingNumbers = new Set(existingTickets.map((t) => t.ticketNumber));
    const missingNumbers = order.ticketsReserved.filter(
      (num) => !existingNumbers.has(num)
    );

    let created = 0;
    let updated = 0;

    // Create missing tickets
    if (missingNumbers.length > 0) {
      const ticketsToCreate = missingNumbers.map((ticketNumber) => ({
        competitionId: order.competitionId,
        ticketNumber,
        status: TicketStatus.ACTIVE,
        orderId: order._id,
        userId: order.userId || null,
      }));

      try {
        await Ticket.insertMany(ticketsToCreate);
        created = missingNumbers.length;
        logger.info(`Created ${created} tickets for order ${order._id}`);
      } catch (error: any) {
        if (error.code === 11000) {
          // Duplicate key - some tickets might have been created
          logger.warn(
            `Some tickets already exist for order ${order._id}, updating existing ones`
          );
        } else {
          throw error;
        }
      }
    }

    // Update any existing tickets to ensure they're linked to the order
    const updateResult = await Ticket.updateMany(
      {
        competitionId: order.competitionId,
        ticketNumber: { $in: order.ticketsReserved },
        orderId: { $ne: order._id },
      },
      {
        $set: {
          orderId: order._id,
          userId: order.userId || null,
          status: TicketStatus.ACTIVE,
        },
      }
    );

    updated = updateResult.modifiedCount;

    logger.info(
      `Fixed tickets for order ${order._id}: created ${created}, updated ${updated}`
    );

    return {
      created,
      updated,
      total: created + existingTickets.length + updated,
    };
  } catch (error: any) {
    logger.error(`Error fixing tickets for order ${orderId}:`, error);
    throw error;
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
          amount:
            order.amount ||
            ((order as any).amountPence ? (order as any).amountPence / 100 : 0),
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
      refundAmount: parseFloat(refund.amount.value), // Amount in decimal
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
    const competition = await Competition.findById(order.competitionId);
    if (competition) {
      await Competition.findByIdAndUpdate(order.competitionId, {
        $inc: { ticketsSold: -order.quantity },
      });
    }

    // Create event log
    await Event.create([
      {
        type: EventType.ORDER_REFUNDED,
        entity: 'order',
        entityId: order._id,
        userId: order.userId,
        competitionId: order.competitionId,
        payload: {
          amount:
            order.amount ||
            ((order as any).amountPence ? (order as any).amountPence / 100 : 0),
          refundAmount: parseFloat(refund.amount.value),
          ticketNumbers: order.ticketsReserved,
        },
      },
    ]);

    // Send refund email notification
    if (order.billingDetails?.email && competition) {
      try {
        const user = order.userId ? await User.findById(order.userId) : null;
        await emailService.sendOrderRefundedEmail({
          email: order.billingDetails.email,
          firstName:
            user?.firstName ||
            order.billingDetails.firstName ||
            'Valued Customer',
          lastName: user?.lastName || order.billingDetails.lastName,
          orderNumber: order.orderNumber,
          competitionTitle: competition.title,
          amountGBP: (
            order.amount ||
            ((order as any).amountPence ? (order as any).amountPence / 100 : 0)
          ).toFixed(2),
          refundReason: refund.reason || undefined,
        });
        logger.info(`Refund email sent to ${order.billingDetails.email}`);
      } catch (error: any) {
        logger.error('Error sending refund email:', error);
      }
    }

    logger.info(`Refund processed for capture ${captureId}`);
  } catch (error: any) {
    logger.error('Handle refund error:', error);
  }
}
