import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Cart, Competition, Ticket, TicketStatus } from '../models';
import { CompetitionStatus } from '../models/Competition.model';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import logger from '../utils/logger';

const MAX_TICKETS_PER_ITEM = 20;

const formatCartResponse = async (cart: any) => {
  const competitionIds = cart.items.map((item: any) =>
    String(item.competitionId)
  );

  const competitions = await Competition.find({
    _id: { $in: competitionIds },
  }).select(
    'title slug images ticketPricePence ticketLimit ticketsSold status isActive drawAt category'
  );

  const competitionMap = new Map<string, any>(
    competitions.map((competition: any) => [
      competition._id.toString(),
      competition,
    ])
  );

  return {
    id: cart._id,
    currency: cart.currency,
    items: cart.items.map((item: any) => {
      const competition = competitionMap.get(
        item.competitionId.toString()
      )?.toObject();

      return {
        id: item._id,
        competitionId: item.competitionId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        addedAt: item.addedAt,
        updatedAt: item.updatedAt,
        competition: competition
          ? {
              id: competition._id,
              title: competition.title,
              slug: competition.slug,
              image: competition.images?.[0]?.url || null,
              ticketPrice: (competition.ticketPrice || ((competition as any).ticketPricePence ? (competition as any).ticketPricePence / 100 : 0)).toFixed(2),
              maxTickets: competition.ticketLimit,
              soldTickets: competition.ticketsSold,
              status: competition.status,
              isActive: competition.isActive,
              drawDate: competition.drawAt,
              category: competition.category,
            }
          : null,
      };
    }),
    totals: cart.getTotals(),
    updatedAt: cart.updatedAt,
  };
};

const recalculateItemSubtotal = (item: any) => {
  item.subtotal = Number((item.quantity * item.unitPrice).toFixed(2));
};

const ensureCompetitionAvailability = (competition: any) => {
  const now = new Date();
  
  // Check if competition has ended (endDate passed) - CHECK THIS FIRST
  if (competition.endDate && competition.endDate <= now) {
    throw new ApiError(
      'This competition has ended and is no longer accepting entries',
      400
    );
  }

  // Check if competition status indicates it's ended
  if (
    competition.status === CompetitionStatus.ENDED ||
    competition.status === CompetitionStatus.DRAWN ||
    competition.status === CompetitionStatus.CANCELLED
  ) {
    throw new ApiError(
      'This competition is no longer accepting entries',
      400
    );
  }

  if (!competition.isActive) {
    throw new ApiError('Competition is no longer active', 400);
  }

  if (competition.status !== CompetitionStatus.LIVE) {
    throw new ApiError('Competition is not open for entries', 400);
  }
};

export const getCart = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    let cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      cart = await Cart.create({
        userId: req.user._id,
        items: [],
      });
    }

    res.json(
      ApiResponse.success(
        await formatCartResponse(cart),
        'Cart retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

export const addOrUpdateCartItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const { competitionId, quantity } = req.body;

    if (!competitionId || !mongoose.Types.ObjectId.isValid(competitionId)) {
      throw new ApiError('Valid competitionId is required', 422);
    }

    const parsedQuantity = Number(quantity);
    if (!parsedQuantity || parsedQuantity < 1) {
      throw new ApiError('Quantity must be at least 1', 422);
    }

    if (parsedQuantity > MAX_TICKETS_PER_ITEM) {
      throw new ApiError(
        `You can only purchase up to ${MAX_TICKETS_PER_ITEM} tickets per competition`,
        422
      );
    }

    const competition = await Competition.findById(competitionId);

    if (!competition) {
      throw new ApiError('Competition not found', 404);
    }

    ensureCompetitionAvailability(competition);

    // Calculate available tickets
    const availableTickets = competition.ticketLimit !== null
      ? competition.ticketLimit - competition.ticketsSold
      : Infinity;

    if (availableTickets !== Infinity && parsedQuantity > availableTickets) {
      throw new ApiError(
        `Only ${availableTickets} tickets remaining for this competition`,
        400
      );
    }

    // Get ticket price in decimal
    const ticketPriceGBP = competition.ticketPrice || ((competition as any).ticketPricePence ? (competition as any).ticketPricePence / 100 : 0);

    let cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      cart = await Cart.create({
        userId: req.user._id,
        items: [],
      });
    }

    const existingItem = cart.items.find((item: any) =>
      item.competitionId.equals(competition._id)
    );

    if (existingItem) {
      existingItem.quantity = parsedQuantity;
      existingItem.unitPrice = ticketPriceGBP;
      recalculateItemSubtotal(existingItem);
    } else {
      cart.items.push({
        competitionId: competition._id,
        quantity: parsedQuantity,
        unitPrice: ticketPriceGBP,
        subtotal: Number(
          (parsedQuantity * ticketPriceGBP).toFixed(2)
        ),
      } as any);
    }

    await cart.save();

    res.status(201).json(
      ApiResponse.success(
        await formatCartResponse(cart),
        'Cart updated successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

export const updateCartItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const { quantity } = req.body;
    const parsedQuantity = Number(quantity);

    if (!parsedQuantity || parsedQuantity < 1) {
      throw new ApiError('Quantity must be at least 1', 422);
    }

    if (parsedQuantity > MAX_TICKETS_PER_ITEM) {
      throw new ApiError(
        `You can only purchase up to ${MAX_TICKETS_PER_ITEM} tickets per competition`,
        422
      );
    }

    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      throw new ApiError('Cart not found', 404);
    }

    const item = cart.items.find(
      (entry: any) => entry._id.toString() === req.params.itemId
    );
    if (!item) {
      throw new ApiError('Cart item not found', 404);
    }

    const competition = await Competition.findById(item.competitionId);
    if (!competition) {
      throw new ApiError('Competition not found', 404);
    }

    ensureCompetitionAvailability(competition);

    // Calculate available tickets
    const availableTickets = competition.ticketLimit !== null
      ? competition.ticketLimit - competition.ticketsSold
      : Infinity;

    if (availableTickets !== Infinity && parsedQuantity > availableTickets) {
      throw new ApiError(
        `Only ${availableTickets} tickets remaining for this competition`,
        400
      );
    }

    // Get ticket price in decimal
    const ticketPriceGBP = competition.ticketPrice || ((competition as any).ticketPricePence ? (competition as any).ticketPricePence / 100 : 0);

    item.quantity = parsedQuantity;
    item.unitPrice = ticketPriceGBP;
    recalculateItemSubtotal(item);

    await cart.save();

    res.json(
      ApiResponse.success(
        await formatCartResponse(cart),
        'Cart item updated successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

export const removeCartItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      throw new ApiError('Cart not found', 404);
    }

    const item = cart.items.find(
      (entry: any) => entry._id.toString() === req.params.itemId
    );
    if (!item) {
      throw new ApiError('Cart item not found', 404);
    }

    const competitionId = item.competitionId;

    // Unreserve any tickets for this competition that belong to this user
    try {
      const now = new Date();
      const unreservedResult = await Ticket.deleteMany({
        competitionId,
        userId: req.user._id,
        status: TicketStatus.RESERVED,
        reservedUntil: { $gt: now }, // Only unreserve non-expired reservations
      });

      if (unreservedResult.deletedCount > 0) {
        logger.info(
          `Unreserved ${unreservedResult.deletedCount} ticket(s) for user ${req.user._id} in competition ${competitionId} when removing from cart`
        );
      }
    } catch (unreserveError) {
      // Log but don't fail the request if unreserving fails
      logger.warn('Error unreserving tickets when removing cart item:', unreserveError);
    }

    item.deleteOne();
    await cart.save();

    res.json(
      ApiResponse.success(
        await formatCartResponse(cart),
        'Cart item removed successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    // Get cart to find all competition IDs before clearing
    const cart = await Cart.findOne({ userId: req.user._id });
    const competitionIds = cart?.items?.map((item: any) => item.competitionId) || [];

    // Unreserve all tickets for all competitions in the cart
    if (competitionIds.length > 0) {
      try {
        const now = new Date();
        const unreservedResult = await Ticket.deleteMany({
          competitionId: { $in: competitionIds },
          userId: req.user._id,
          status: TicketStatus.RESERVED,
          reservedUntil: { $gt: now }, // Only unreserve non-expired reservations
        });

        if (unreservedResult.deletedCount > 0) {
          logger.info(
            `Unreserved ${unreservedResult.deletedCount} ticket(s) for user ${req.user._id} when clearing cart`
          );
        }
      } catch (unreserveError) {
        // Log but don't fail the request if unreserving fails
        logger.warn('Error unreserving tickets when clearing cart:', unreserveError);
      }
    }

    await Cart.findOneAndUpdate(
      { userId: req.user._id },
      { $set: { items: [] } }
    );

    res.json(ApiResponse.success(null, 'Cart cleared successfully'));
  } catch (error) {
    next(error);
  }
};


