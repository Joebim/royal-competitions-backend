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
import squareService from '../services/square.service';
import { v4 as uuidv4 } from 'uuid';
import klaviyoService from '../services/klaviyo.service';
import emailService from '../services/email.service';
import logger from '../utils/logger';

/**
 * @desc    Create Square payment
 * @route   POST /api/v1/payments/create-payment
 * @access  Public (can be called from frontend)
 *
 * This endpoint creates a Square payment using the sourceId (nonce) from frontend
 * Frontend will use Square Web Payments SDK to get the sourceId
 */
export const createSquarePayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startTime = Date.now();
  try {
    logger.info('💳 [PAYMENT] ===== CREATE SQUARE PAYMENT =====', {
      userId: req.user?._id,
      timestamp: new Date().toISOString(),
    });

    if (!req.user) {
      logger.warn('💳 [PAYMENT] Unauthorized - no user');
      throw new ApiError('Not authorized', 401);
    }

    const { sourceId, amount, orderId, idempotencyKey } = req.body;

    logger.info('💳 [PAYMENT] Payment request received', {
      userId: req.user._id,
      orderId,
      amount,
      hasSourceId: !!sourceId,
      sourceIdPrefix: sourceId?.substring(0, 20),
      idempotencyKey,
    });

    if (!sourceId) {
      logger.warn('💳 [PAYMENT] Missing sourceId', {
        userId: req.user._id,
      });
      throw new ApiError('sourceId (payment nonce) is required', 400);
    }

    if (!amount && !orderId) {
      logger.warn('💳 [PAYMENT] Missing amount and orderId', {
        userId: req.user._id,
      });
      throw new ApiError('Amount or orderId is required', 400);
    }

    // If orderId is provided, verify it exists and user owns it
    let order = null;
    if (orderId) {
      logger.info('💳 [PAYMENT] Fetching order', {
        userId: req.user._id,
        orderId,
      });

      order = await Order.findById(orderId);
      if (!order) {
        logger.error('💳 [PAYMENT] Order not found', {
          userId: req.user._id,
          orderId,
        });
        throw new ApiError('Order not found', 404);
      }

      logger.info('💳 [PAYMENT] Order found', {
        userId: req.user._id,
        orderId: order._id,
        orderNumber: order.orderNumber,
        orderUserId: order.userId,
        orderStatus: order.status,
        paymentStatus: order.paymentStatus,
        amount: order.amount,
        ticketsReserved: order.ticketsReserved,
        ticketsReservedCount: order.ticketsReserved?.length || 0,
      });

      // Check authorization - user must own the order
      if (order.userId && order.userId.toString() !== String(req.user._id)) {
        logger.warn('💳 [PAYMENT] Authorization failed', {
          userId: req.user._id,
          orderId: order._id,
          orderUserId: order.userId,
        });
        throw new ApiError('Not authorized to access this order', 403);
      }
    }

    // Get order amount
    const orderAmount = order
      ? order.amount ||
        ((order as any).amountPence ? (order as any).amountPence / 100 : 0)
      : amount;

    logger.info('💳 [PAYMENT] Creating Square payment', {
      userId: req.user._id,
      orderId: order?._id,
      amount: orderAmount,
      currency: order?.currency || 'GBP',
      competitionId: order ? String(order.competitionId) : undefined,
    });

    // Create Square payment
    const squarePayment = await squareService.createPayment({
      sourceId,
      amount: orderAmount,
      currency: order?.currency || 'GBP',
      orderId: orderId || undefined,
      userId: order?.userId
        ? String(order.userId)
        : String(req.user._id),
      competitionId: order ? String(order.competitionId) : undefined,
      idempotencyKey: idempotencyKey || uuidv4(),
    });

    logger.info('💳 [PAYMENT] Square payment created', {
      userId: req.user._id,
      orderId: order?._id,
      paymentId: squarePayment.id,
      paymentStatus: squarePayment.status,
      amount: squarePayment.amountMoney?.amount,
    });

    // Update order with Square payment ID if order exists
    if (order) {
      logger.info('💳 [PAYMENT] Updating order with payment ID', {
        userId: req.user._id,
        orderId: order._id,
        paymentId: squarePayment.id,
      });

      order.squarePaymentId = squarePayment.id;
      await order.save();

      logger.info('💳 [PAYMENT] Order updated', {
        userId: req.user._id,
        orderId: order._id,
        squarePaymentId: order.squarePaymentId,
      });

      // Create payment record
      const paymentRecord = await Payment.create({
        orderId: order._id,
        userId: order.userId || req.user._id,
        amount: orderAmount,
        paymentIntentId: squarePayment.id,
        status: PaymentStatus.PENDING,
      });

      logger.info('💳 [PAYMENT] Payment record created', {
        userId: req.user._id,
        orderId: order._id,
        paymentRecordId: paymentRecord._id,
        paymentId: squarePayment.id,
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

    // Return payment details immediately to prevent timeout
    // Heavy operations (Klaviyo, emails) will be handled asynchronously
    const duration = Date.now() - startTime;
    logger.info('💳 [PAYMENT] ===== CREATE SQUARE PAYMENT COMPLETED =====', {
      userId: req.user._id,
      orderId: order?._id,
      paymentId: squarePayment.id,
      paymentStatus: squarePayment.status,
      duration: `${duration}ms`,
    });

    // Send response immediately to prevent timeout
    res.json(
      ApiResponse.success(
        {
          paymentId: squarePayment.id,
          status: squarePayment.status,
          orderId: order?._id || null,
        },
        'Square payment created'
      )
    );

    // Process payment success asynchronously (non-blocking)
    // This prevents timeout issues while still processing tickets and sending emails
    if (squarePayment.status === 'COMPLETED' && order && req.user) {
      const userId = req.user._id; // Capture userId before async callback
      logger.info('💳 [PAYMENT] Payment completed, processing success asynchronously', {
        userId: userId,
        orderId: order._id,
        paymentId: squarePayment.id,
      });

      // Use setImmediate to process after response is sent
      setImmediate(async () => {
        try {
          await handlePaymentSuccess(
            {
              id: squarePayment.id,
              status: squarePayment.status,
              amount_money: squarePayment.amountMoney,
            },
            userId
          );
        } catch (error: any) {
          logger.error('💳 [PAYMENT] Error in async payment success handling', {
            userId: userId,
            orderId: order._id,
            paymentId: squarePayment.id,
            error: error.message,
          });
          // Don't throw - payment is already successful, just log the error
        }
      });
    } else {
      logger.info('💳 [PAYMENT] Payment not completed yet', {
        userId: req.user?._id,
        orderId: order?._id,
        paymentId: squarePayment.id,
        paymentStatus: squarePayment.status,
      });
    }
    return;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('💳 [PAYMENT] ===== CREATE SQUARE PAYMENT ERROR =====', {
      userId: req.user?._id,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
    });
    next(error);
  }
};

/**
 * @desc    Confirm Square payment
 * @route   POST /api/v1/payments/confirm-payment
 * @access  Public (called from frontend after payment)
 *
 * This endpoint confirms a Square payment by payment ID
 * Frontend calls this after Square payment is processed
 */
export const confirmPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startTime = Date.now();
  try {
    logger.info('✅ [PAYMENT] ===== CONFIRM PAYMENT =====', {
      userId: req.user?._id,
      timestamp: new Date().toISOString(),
    });

    if (!req.user) {
      logger.warn('✅ [PAYMENT] Unauthorized - no user');
      throw new ApiError('Not authorized', 401);
    }

    const { paymentId, orderId } = req.body;

    logger.info('✅ [PAYMENT] Confirm payment request received', {
      userId: req.user._id,
      paymentId,
      orderId,
    });

    if (!paymentId && !orderId) {
      logger.warn('✅ [PAYMENT] Missing paymentId and orderId', {
        userId: req.user._id,
      });
      throw new ApiError('Payment ID or Order ID is required', 400);
    }

    // Find order by Square payment ID or internal order ID
    let order = null;
    if (orderId) {
      logger.info('✅ [PAYMENT] Finding order by orderId', {
        userId: req.user._id,
        orderId,
      });

      order = await Order.findById(orderId);
      if (!order) {
        logger.error('✅ [PAYMENT] Order not found', {
          userId: req.user._id,
          orderId,
        });
        throw new ApiError('Order not found', 404);
      }

      logger.info('✅ [PAYMENT] Order found by orderId', {
        userId: req.user._id,
        orderId: order._id,
        orderNumber: order.orderNumber,
        orderStatus: order.status,
        paymentStatus: order.paymentStatus,
        squarePaymentId: order.squarePaymentId,
      });
      
      // Check authorization - user must own the order
      if (order.userId && order.userId.toString() !== String(req.user._id)) {
        logger.warn('✅ [PAYMENT] Authorization failed', {
          userId: req.user._id,
          orderId: order._id,
          orderUserId: order.userId,
        });
        throw new ApiError('Not authorized to access this order', 403);
      }
    } else if (paymentId) {
      logger.info('✅ [PAYMENT] Finding order by paymentId', {
        userId: req.user._id,
        paymentId,
      });

      order = await Order.findOne({ squarePaymentId: paymentId });
      if (!order) {
        logger.warn('✅ [PAYMENT] Order not found for Square payment', {
          userId: req.user._id,
          paymentId,
        });
        throw new ApiError('Order not found for this payment', 404);
      }

      logger.info('✅ [PAYMENT] Order found by paymentId', {
        userId: req.user._id,
        orderId: order._id,
        orderNumber: order.orderNumber,
        orderStatus: order.status,
        paymentStatus: order.paymentStatus,
        squarePaymentId: order.squarePaymentId,
      });
      
      // Check authorization for payment ID lookup - user must own the order
      if (order.userId && order.userId.toString() !== String(req.user._id)) {
        logger.warn('✅ [PAYMENT] Authorization failed', {
          userId: req.user._id,
          orderId: order._id,
          orderUserId: order.userId,
        });
        throw new ApiError('Not authorized to access this order', 403);
      }
    }

    // Check if order is already paid
    if (order && order.paymentStatus === OrderPaymentStatus.PAID) {
      logger.info('✅ [PAYMENT] Order already paid', {
        userId: req.user._id,
        orderId: order._id,
        paymentStatus: order.paymentStatus,
      });
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

    // Get payment details from Square
    if (!order) {
      logger.error('✅ [PAYMENT] Order not found after lookup', {
        userId: req.user._id,
        paymentId,
        orderId,
      });
      throw new ApiError('Order not found', 404);
    }
    
    logger.info('✅ [PAYMENT] Fetching payment from Square', {
      userId: req.user._id,
      orderId: order._id,
      paymentId: paymentId || order.squarePaymentId,
    });

    const squarePayment = await squareService.getPayment(
      paymentId || order.squarePaymentId || ''
    );

    logger.info('✅ [PAYMENT] Square payment retrieved', {
      userId: req.user._id,
      orderId: order._id,
      paymentId: squarePayment.id,
      paymentStatus: squarePayment.status,
      amount: squarePayment.amountMoney?.amount,
    });

    // Check if payment was successful
    if (squarePayment.status === 'COMPLETED') {
      logger.info('✅ [PAYMENT] Payment completed, handling success', {
        userId: req.user._id,
        orderId: order._id,
        paymentId: squarePayment.id,
      });

      if (order && squarePayment.status === 'COMPLETED') {
        await handlePaymentSuccess(
          {
            id: squarePayment.id,
            status: squarePayment.status,
            amount_money: squarePayment.amountMoney,
          },
          req.user._id
        );
      }

      const duration = Date.now() - startTime;
      logger.info('✅ [PAYMENT] ===== CONFIRM PAYMENT COMPLETED =====', {
        userId: req.user._id,
        orderId: order._id,
        paymentId: squarePayment.id,
        paymentStatus: squarePayment.status,
        duration: `${duration}ms`,
      });

      res.json(
        ApiResponse.success(
          {
            status: 'success',
            orderId: order?._id || null,
            paymentId: squarePayment.id,
            data: squarePayment,
          },
          'Payment confirmed successfully'
        )
      );
      return;
    } else {
      logger.error('✅ [PAYMENT] Payment failed', {
        userId: req.user._id,
        orderId: order._id,
        paymentId: squarePayment.id,
        paymentStatus: squarePayment.status,
      });
      throw new ApiError(
        `Payment failed with status: ${squarePayment.status}`,
        400
      );
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('✅ [PAYMENT] ===== CONFIRM PAYMENT ERROR =====', {
      userId: req.user?._id,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
    });
    next(error);
  }
};


/**
 * @desc    Square webhook handler
 * @route   POST /api/v1/payments/webhook
 * @access  Public
 */
export const handleWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const webhookUrl = req.originalUrl;
    const body = JSON.stringify(req.body);

    // Verify webhook signature
    const verified = await squareService.verifyWebhookSignature(
      req.headers as any,
      body,
      webhookUrl
    );

    if (!verified) {
      logger.error('Invalid Square webhook signature');
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }

    const event = req.body;
    logger.info(`Square webhook received: ${event.type}`);

    switch (event.type) {
      case 'payment.updated':
        const payment = event.data?.object?.payment;
        if (payment) {
          if (payment.status === 'COMPLETED') {
            await handlePaymentSuccess(
              {
                id: payment.id,
                status: payment.status,
                amount_money: payment.amountMoney,
              },
              undefined
            );
          } else if (payment.status === 'FAILED' || payment.status === 'CANCELED') {
            await handlePaymentFailure({
              id: payment.id,
              status: payment.status,
            });
          }
        }
        break;

      case 'refund.updated':
        const refund = event.data?.object?.refund;
        if (refund && refund.status === 'COMPLETED') {
          await handleRefund({
            id: refund.id,
            payment_id: refund.paymentId,
            amount_money: refund.amountMoney,
          });
        }
        break;

      default:
        logger.info(`Unhandled Square event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
    return;
  } catch (error: any) {
    logger.error('Square webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
    return;
  }
};

/**
 * Handle successful payment
 * Issues tickets and updates order status
 */
export async function handlePaymentSuccess(
  payment: any,
  authenticatedUserId?: any
) {
  const startTime = Date.now();
  try {
    logger.info('🎉 [PAYMENT] ===== HANDLE PAYMENT SUCCESS =====', {
      paymentId: payment.id,
      paymentStatus: payment.status,
      authenticatedUserId,
      timestamp: new Date().toISOString(),
    });

    // Find order by Square payment ID
    const squarePaymentId = payment.id;

    logger.info('🎉 [PAYMENT] Finding order by Square payment ID', {
      paymentId: squarePaymentId,
      authenticatedUserId,
    });

    const order = await Order.findOne({ squarePaymentId });

    if (!order) {
      logger.error('🎉 [PAYMENT] Order not found for Square payment', {
        paymentId: squarePaymentId,
        authenticatedUserId,
      });
      return;
    }

    logger.info('🎉 [PAYMENT] Order found', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      paymentStatus: order.paymentStatus,
      orderUserId: order.userId,
      competitionId: order.competitionId,
      ticketsReserved: order.ticketsReserved,
      ticketsReservedCount: order.ticketsReserved?.length || 0,
      ticketsValid: order.ticketsValid,
    });

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
    order.paymentReference = payment.id;
    await order.save();

    // Get isValid from order - frontend can send this when creating order
    // Default to true if not provided
    const isValid = order.ticketsValid !== false; // Default to true

    // Update reserved tickets to active
    // First, try to find tickets by orderId (preferred - tickets should be associated with order)
    // If not found, fall back to finding by ticketNumber + competitionId
    logger.info('🎉 [PAYMENT] Updating tickets to ACTIVE (method 1: by orderId)', {
      orderId: order._id,
      competitionId: order.competitionId,
      ticketNumbers: order.ticketsReserved,
      isValid,
      orderCreatedAt: order.createdAt,
      orderStatus: order.status,
      paymentStatus: order.paymentStatus,
    });

    // First, check what tickets exist before updating
    const ticketsBeforePayment = await Ticket.find({
      competitionId: order.competitionId,
      ticketNumber: { $in: order.ticketsReserved },
    }).lean();

    logger.info('🎉 [PAYMENT] Tickets found before payment processing', {
      orderId: order._id,
      expectedCount: order.quantity,
      foundCount: ticketsBeforePayment.length,
      ticketNumbers: order.ticketsReserved,
      foundTickets: ticketsBeforePayment.map((t: any) => ({
        ticketNumber: t.ticketNumber,
        status: t.status,
        orderId: t.orderId,
        userId: t.userId,
        reservedUntil: t.reservedUntil,
        isValid: t.isValid,
        isExpired: t.reservedUntil ? new Date(t.reservedUntil) <= new Date() : true,
      })),
    });

    let updateResult = await Ticket.updateMany(
      {
        orderId: order._id,
        competitionId: order.competitionId,
        ticketNumber: { $in: order.ticketsReserved },
        status: TicketStatus.RESERVED,
      },
      {
        $set: {
          status: TicketStatus.ACTIVE,
          userId: order.userId || null, // Set userId even if null (for guest orders)
          isValid: isValid, // Set isValid based on answer correctness
        },
        $unset: {
          reservedUntil: 1,
        },
      }
    );

    logger.info('🎉 [PAYMENT] Ticket update result (method 1)', {
      orderId: order._id,
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount,
      expectedCount: order.quantity,
    });

    // If not found by orderId, try without orderId (for backward compatibility or edge cases)
    if (updateResult.matchedCount === 0) {
      logger.warn('🎉 [PAYMENT] No tickets found by orderId, trying method 2 (by ticketNumber + competitionId)', {
        orderId: order._id,
        competitionId: order.competitionId,
        ticketNumbers: order.ticketsReserved,
        reason: 'Tickets may not have orderId set during order creation',
      });

      // Check tickets again without orderId filter
      const ticketsWithoutOrderId = await Ticket.find({
        competitionId: order.competitionId,
        ticketNumber: { $in: order.ticketsReserved },
        status: TicketStatus.RESERVED,
      }).lean();

      logger.info('🎉 [PAYMENT] Tickets found without orderId filter', {
        orderId: order._id,
        foundCount: ticketsWithoutOrderId.length,
        tickets: ticketsWithoutOrderId.map((t: any) => ({
          ticketNumber: t.ticketNumber,
          status: t.status,
          orderId: t.orderId,
          userId: t.userId,
          reservedUntil: t.reservedUntil,
        })),
      });
      
      updateResult = await Ticket.updateMany(
        {
          competitionId: order.competitionId,
          ticketNumber: { $in: order.ticketsReserved },
          status: TicketStatus.RESERVED,
        },
        {
          $set: {
            status: TicketStatus.ACTIVE,
            orderId: order._id, // Associate with order now
            userId: order.userId || null,
            isValid: isValid,
          },
          $unset: {
            reservedUntil: 1,
          },
        }
      );

      logger.info('🎉 [PAYMENT] Ticket update result (method 2)', {
        orderId: order._id,
        matchedCount: updateResult.matchedCount,
        modifiedCount: updateResult.modifiedCount,
        expectedCount: order.quantity,
      });
    }

    // If still not found, check if tickets exist but in wrong status
    if (updateResult.matchedCount === 0) {
      const existingTickets = await Ticket.find({
        competitionId: order.competitionId,
        ticketNumber: { $in: order.ticketsReserved },
      }).lean();

      logger.error(
        `No RESERVED tickets found for order ${order._id}`,
        {
          orderId: order._id,
          competitionId: order.competitionId,
          ticketsReserved: order.ticketsReserved,
          existingTickets: existingTickets.map((t: any) => ({
            ticketNumber: t.ticketNumber,
            status: t.status,
            orderId: t.orderId,
            userId: t.userId,
            reservedUntil: t.reservedUntil,
          })),
        }
      );

      // CRITICAL FIX: If tickets don't exist, recreate them for the order
      // This handles the case where tickets were deleted by cleanup job
      logger.warn('🎉 [PAYMENT] Attempting to recreate missing tickets for order', {
        orderId: order._id,
        competitionId: order.competitionId,
        ticketsReserved: order.ticketsReserved,
      });

      const now = new Date();
      const reservedUntil24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const ticketsToCreate = order.ticketsReserved.map((ticketNumber: number) => ({
        competitionId: order.competitionId,
        ticketNumber,
        userId: order.userId || null,
        status: TicketStatus.RESERVED,
        reservedUntil: reservedUntil24Hours,
        orderId: order._id,
        isValid: isValid,
      }));

      try {
        await Ticket.insertMany(ticketsToCreate, { ordered: false });
        logger.info('🎉 [PAYMENT] Recreated missing tickets for order', {
          orderId: order._id,
          ticketsCreated: ticketsToCreate.length,
        });

        // Now update them to ACTIVE
        const recreateUpdateResult = await Ticket.updateMany(
          {
            orderId: order._id,
            competitionId: order.competitionId,
            ticketNumber: { $in: order.ticketsReserved },
            status: TicketStatus.RESERVED,
          },
          {
            $set: {
              status: TicketStatus.ACTIVE,
              userId: order.userId || null,
              isValid: isValid,
            },
            $unset: {
              reservedUntil: 1,
            },
          }
        );

        logger.info('🎉 [PAYMENT] Updated recreated tickets to ACTIVE', {
          orderId: order._id,
          matchedCount: recreateUpdateResult.matchedCount,
          modifiedCount: recreateUpdateResult.modifiedCount,
        });

        // Continue with the rest of the payment success flow
        // Update the updateResult for logging purposes
        updateResult = recreateUpdateResult;
      } catch (insertError: any) {
        if (insertError.code === 11000) {
          // Tickets might have been created concurrently, try update again
          logger.warn('🎉 [PAYMENT] Tickets created concurrently, retrying update');
          const retryUpdateResult = await Ticket.updateMany(
            {
              orderId: order._id,
              competitionId: order.competitionId,
              ticketNumber: { $in: order.ticketsReserved },
              status: TicketStatus.RESERVED,
            },
            {
              $set: {
                status: TicketStatus.ACTIVE,
                userId: order.userId || null,
                isValid: isValid,
              },
              $unset: {
                reservedUntil: 1,
              },
            }
          );

          if (retryUpdateResult.matchedCount === 0) {
            throw new ApiError(
              'Tickets not found. Please ensure items were added to cart before checkout.',
              400
            );
          }
          updateResult = retryUpdateResult;
        } else {
          logger.error('🎉 [PAYMENT] Failed to recreate tickets', {
            orderId: order._id,
            error: insertError.message,
          });
          throw new ApiError(
            'Tickets not found. Please ensure items were added to cart before checkout.',
            400
          );
        }
      }
    }

    // Log the update for debugging
    logger.info('🎉 [PAYMENT] Tickets updated to ACTIVE', {
      orderId: order._id,
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount,
      ticketNumbers: order.ticketsReserved,
      userId: order.userId || null,
    });

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
      { paymentIntentId: squarePaymentId },
      {
        status: PaymentStatus.SUCCEEDED,
        paymentMethod: 'square',
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

    const duration = Date.now() - startTime;
    logger.info('🎉 [PAYMENT] ===== HANDLE PAYMENT SUCCESS COMPLETED =====', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      paymentId: squarePaymentId,
      ticketsUpdated: updateResult.modifiedCount,
      orderStatus: order.status,
      paymentStatus: order.paymentStatus,
      duration: `${duration}ms`,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('🎉 [PAYMENT] ===== HANDLE PAYMENT SUCCESS ERROR =====', {
      paymentId: payment?.id,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
    });
    throw error;
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
      const isValid = order.ticketsValid !== false; // Default to true
      const ticketsToCreate = missingNumbers.map((ticketNumber) => ({
        competitionId: order.competitionId,
        ticketNumber,
        status: TicketStatus.ACTIVE,
        orderId: order._id,
        userId: order.userId || null,
        isValid: isValid,
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
          isValid: order.ticketsValid !== false, // Default to true
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
async function handlePaymentFailure(payment: any) {
  try {
    const squarePaymentId = payment.id;
    const order = await Order.findOne({ squarePaymentId });

    if (!order) {
      logger.error(`Order not found for Square payment ${squarePaymentId}`);
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
      { paymentIntentId: squarePaymentId },
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
    const refundId = refund.id;
    const squarePaymentId = refund.payment_id;

    // Find order by Square payment ID
    const order = await Order.findOne({ squarePaymentId });
    if (!order) {
      logger.error(`Order not found for Square payment ${squarePaymentId}`);
      return;
    }

    // Find payment record
    const payment = await Payment.findOne({ orderId: order._id });
    if (!payment) {
      logger.error(`Payment not found for order ${order._id}`);
      return;
    }

    // Convert amount from cents to decimal
    const refundAmount = refund.amount_money
      ? Number(refund.amount_money.amount) / 100
      : order.amount;

    // Update payment
    await Payment.findByIdAndUpdate(payment._id, {
      status: PaymentStatus.REFUNDED,
      refundId: refundId,
      refundAmount: refundAmount,
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
          refundAmount: refundAmount,
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

    logger.info(`Refund processed for Square payment ${squarePaymentId}`);
  } catch (error: any) {
    logger.error('Handle refund error:', error);
  }
}
