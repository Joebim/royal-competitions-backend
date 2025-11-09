import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Cart, Competition, Entry, Order, Payment } from '../models';
import { OrderPaymentStatus, OrderStatus } from '../models/Order.model';
import { CompetitionStatus } from '../models/Competition.model';
import { PaymentStatus } from '../models/Payment.model';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import stripeService from '../services/stripe.service';
import { generateTicketNumbers } from '../utils/randomGenerator';

interface CheckoutItemInput {
  competitionId: string;
  quantity: number;
  answer?: string;
}

const MAX_TICKETS_PER_ITEM = 20;

const parseItems = (items: any): CheckoutItemInput[] => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ApiError('At least one item is required', 422);
  }

  return items.map((item) => ({
    competitionId: item.competitionId || item.id,
    quantity: Number(item.quantity),
    answer: item.answer,
  }));
};

const ensureCompetitionCanBePurchased = (competition: any) => {
  if (!competition.isActive) {
    throw new ApiError(`Competition ${competition.title} is not active`, 400);
  }

  if (competition.status !== CompetitionStatus.ACTIVE) {
    throw new ApiError(
      `Competition ${competition.title} is not open for entries`,
      400
    );
  }
};

const formatOrderResponse = (order: any) => {
  const doc = order.toObject ? order.toObject() : order;
  return {
    id: doc._id,
    orderNumber: doc.orderNumber,
    status: doc.status,
    paymentStatus: doc.paymentStatus,
    subtotal: doc.subtotal,
    total: doc.total,
    currency: doc.currency,
    items: doc.items.map((item: any) => ({
      id: item._id,
      competitionId: item.competitionId,
      competitionTitle: item.competitionTitle,
      quantity: item.quantity,
      ticketPrice: item.ticketPrice,
      total: item.total,
      ticketNumbers: item.ticketNumbers,
      answer: item.answer,
    })),
    billingDetails: doc.billingDetails,
    billingAddress: doc.billingAddress,
    shippingAddress: doc.shippingAddress,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

export const createCheckoutPaymentIntent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const items = parseItems(req.body.items);

    const competitionIds = items.map((item) => item.competitionId);
    const competitions = await Competition.find({
      _id: { $in: competitionIds },
    });

    if (competitions.length !== items.length) {
      throw new ApiError('One or more competitions could not be found', 404);
    }

    const competitionMap = new Map(
      competitions.map((competition) => [String(competition._id), competition])
    );

    const orderItems = items.map((item) => {
      const competition = competitionMap.get(item.competitionId);

      if (!competition) {
        throw new ApiError('Competition not found', 404);
      }

      ensureCompetitionCanBePurchased(competition);

      if (!item.quantity || item.quantity < 1) {
        throw new ApiError('Quantity must be at least 1', 422);
      }

      if (item.quantity > MAX_TICKETS_PER_ITEM) {
        throw new ApiError(
          `You can only purchase up to ${MAX_TICKETS_PER_ITEM} tickets per competition`,
          422
        );
      }

      const availableTickets = competition.maxTickets - competition.soldTickets;

      if (item.quantity > availableTickets) {
        throw new ApiError(
          `Only ${availableTickets} tickets remaining for ${competition.title}`,
          400
        );
      }

      const answer = (item.answer || '').toString().trim();
      if (!answer) {
        throw new ApiError(
          `Answer is required for competition ${competition.title}`,
          422
        );
      }

      return {
        competitionId: competition._id,
        competitionTitle: competition.title,
        quantity: item.quantity,
        ticketPrice: competition.ticketPrice,
        total: Number((competition.ticketPrice * item.quantity).toFixed(2)),
        answer,
        ticketNumbers: [],
      };
    });

    const subtotal = orderItems.reduce((total, item) => total + item.total, 0);
    const currency = 'GBP';

    const requesterId = String(req.user._id);

    let orderDoc =
      req.body.orderId !== undefined && req.body.orderId !== null
        ? await Order.findById(req.body.orderId)
        : null;

    if (orderDoc) {
      if (
        orderDoc.userId.toString() !== requesterId ||
        orderDoc.status !== OrderStatus.PENDING
      ) {
        throw new ApiError('Cannot reuse this order for checkout', 400);
      }

      orderDoc.items = orderItems as any;
      orderDoc.subtotal = subtotal;
      orderDoc.total = subtotal;
      orderDoc.currency = currency;
      orderDoc.billingDetails = req.body.billingDetails;
      orderDoc.billingAddress = req.body.billingAddress;
      await orderDoc.save();
    } else {
      orderDoc = await Order.create({
        userId: req.user._id,
        items: orderItems,
        subtotal,
        total: subtotal,
        currency,
        billingDetails: req.body.billingDetails,
        billingAddress: req.body.billingAddress,
      });
    }

    const paymentIntent = await stripeService.createPaymentIntent({
      amount: orderDoc.total,
      currency: currency.toLowerCase(),
      metadata: {
        orderId: String(orderDoc._id),
        userId: String(req.user._id),
      },
    });

    orderDoc.paymentIntentId = paymentIntent.id;
    await orderDoc.save();

    await Payment.findOneAndUpdate(
      { paymentIntentId: paymentIntent.id },
      {
        orderId: orderDoc._id,
        userId: req.user._id,
        amount: orderDoc.total,
        currency: currency.toLowerCase(),
        status: PaymentStatus.PENDING,
      },
      { upsert: true, new: true }
    );

    res.status(201).json(
      ApiResponse.success(
        {
          order: formatOrderResponse(orderDoc),
          payment: {
            clientSecret: paymentIntent.client_secret,
            amount: orderDoc.total,
            currency,
          },
        },
        'Payment intent created'
      )
    );
  } catch (error) {
    next(error);
  }
};

export const confirmCheckoutOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const session = await mongoose.startSession();

  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const requesterId = String(req.user._id);
    const requesterObjectId = req.user._id;

    const { paymentIntentId, orderId } = req.body;

    if (!paymentIntentId) {
      throw new ApiError('paymentIntentId is required', 422);
    }

    const paymentIntent = await stripeService.getPaymentIntent(paymentIntentId);

    if (
      paymentIntent.status !== 'succeeded' &&
      paymentIntent.status !== 'processing'
    ) {
      throw new ApiError(
        'Payment has not been completed. Please confirm the payment with Stripe.',
        400
      );
    }

    const resolvedOrderId =
      orderId ||
      paymentIntent.metadata?.orderId ||
      paymentIntent.metadata?.order_id;

    if (!resolvedOrderId) {
      throw new ApiError('Order could not be determined for this payment', 400);
    }

    let order = await Order.findById(resolvedOrderId);

    if (!order) {
      throw new ApiError('Order not found', 404);
    }

    const existingOrder = order;

    if (existingOrder.userId.toString() !== requesterId) {
      throw new ApiError('You are not allowed to modify this order', 403);
    }

    if (existingOrder.paymentStatus === OrderPaymentStatus.PAID) {
      res.json(
        ApiResponse.success(
          { order: formatOrderResponse(existingOrder) },
          'Order already confirmed'
        )
      );
      return;
    }

    await session.withTransaction(async () => {
      const updatedItems = [];
      const entriesToCreate: any[] = [];

      for (const item of existingOrder.items) {
        const competition = await Competition.findOne({
          _id: item.competitionId,
          isActive: true,
        }).session(session);

        if (!competition) {
          throw new ApiError('Competition not found during confirmation', 404);
        }

        ensureCompetitionCanBePurchased(competition);

        const availableTickets =
          competition.maxTickets - competition.soldTickets;

        if (item.quantity > availableTickets) {
          throw new ApiError(
            `Only ${availableTickets} tickets remaining for ${competition.title}`,
            400
          );
        }

        const ticketNumbers = generateTicketNumbers(item.quantity);
        updatedItems.push({
          competitionId: item.competitionId,
          competitionTitle: item.competitionTitle,
          quantity: item.quantity,
          ticketPrice: item.ticketPrice,
          total: item.total,
          answer: item.answer,
          ticketNumbers,
        });

        const entries = ticketNumbers.map((ticketNumber) => ({
          userId: requesterObjectId,
          competitionId: competition._id,
          orderId: existingOrder._id,
          ticketNumber,
          answer: item.answer,
          isCorrect:
            item.answer.toLowerCase() ===
            competition.question.correctAnswer.toLowerCase(),
        }));

        entriesToCreate.push(...entries);

        await Competition.updateOne(
          {
            _id: competition._id,
            soldTickets: { $lte: competition.maxTickets - item.quantity },
          },
          { $inc: { soldTickets: item.quantity } }
        ).session(session);
      }

      await Entry.insertMany(entriesToCreate, { session });

      existingOrder.items = updatedItems as any;
      existingOrder.status = OrderStatus.COMPLETED;
      existingOrder.paymentStatus = OrderPaymentStatus.PAID;
      existingOrder.paymentMethod =
        paymentIntent.payment_method_types?.[0] || existingOrder.paymentMethod;
      existingOrder.billingDetails =
        req.body.billingDetails || existingOrder.billingDetails;
      existingOrder.billingAddress =
        req.body.billingAddress || existingOrder.billingAddress;
      existingOrder.shippingAddress =
        req.body.shippingAddress || existingOrder.shippingAddress;

      await existingOrder.save({ session });

      await Payment.findOneAndUpdate(
        { paymentIntentId },
        {
          status: PaymentStatus.SUCCEEDED,
          paymentMethod: existingOrder.paymentMethod,
        },
        { session }
      );

      await Cart.findOneAndUpdate(
        { userId: requesterObjectId },
        { $set: { items: [] } },
        { session }
      );
    });

    await session.endSession();

    order = await Order.findById(resolvedOrderId);
    const entries = await Entry.find({ orderId: resolvedOrderId })
      .sort({ createdAt: 1 })
      .lean();

    res.json(
      ApiResponse.success(
        {
          order: formatOrderResponse(order!),
          entries: entries.map((entry) => ({
            id: entry._id,
            competitionId: entry.competitionId,
            userId: entry.userId,
            ticketNumber: entry.ticketNumber,
            answer: entry.answer,
            isCorrect: entry.isCorrect,
            createdAt: entry.createdAt,
          })),
        },
        'Order confirmed successfully'
      )
    );
  } catch (error) {
    await session.endSession();
    next(error);
  }
};
