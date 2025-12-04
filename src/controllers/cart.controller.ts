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
    'title slug images ticketPrice ticketLimit ticketsSold status isActive drawAt category'
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
      const competition = competitionMap
        .get(item.competitionId.toString())
        ?.toObject();

      return {
        id: item._id,
        competitionId: item.competitionId,
        quantity: item.quantity,
        ticketNumbers: Array.isArray(item.ticketNumbers)
          ? item.ticketNumbers
          : [], // Array of issued ticket numbers (always included)
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        ticketsValid: item.ticketsValid !== undefined ? item.ticketsValid : true, // Default to true if not set
        addedAt: item.addedAt,
        updatedAt: item.updatedAt,
        competition: competition
          ? {
              id: competition._id,
              title: competition.title,
              slug: competition.slug,
              image: competition.images?.[0]?.url || null,
              ticketPrice: (
                competition.ticketPrice ||
                ((competition as any).ticketPricePence
                  ? (competition as any).ticketPricePence / 100
                  : 0)
              ).toFixed(2),
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
    throw new ApiError('This competition is no longer accepting entries', 400);
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

    const { competitionId, quantity, ticketNumbers, ticketType, ticketsValid } = req.body;
    // ticketType: 'lucky_draw' | 'number_picker'
    // If ticketType is 'lucky_draw', ticketNumbers should not be provided (random selection)
    // If ticketType is 'number_picker', ticketNumbers must be provided

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

    // Get all existing ticket numbers (active, winner, or validly reserved)
    const now = new Date();
    const existingTickets = await Ticket.find({
      competitionId,
      $or: [
        { status: { $in: [TicketStatus.ACTIVE, TicketStatus.WINNER] } },
        {
          status: TicketStatus.RESERVED,
          reservedUntil: { $gt: now },
        },
      ],
    })
      .select('ticketNumber')
      .lean();

    const existingNumbers = new Set(
      existingTickets.map((t: any) => t.ticketNumber)
    );

    // Calculate available tickets
    const totalTicketsUsed = existingNumbers.size;
    const availableTickets =
      competition.ticketLimit !== null
        ? competition.ticketLimit - totalTicketsUsed
        : Infinity;

    if (availableTickets !== Infinity && parsedQuantity > availableTickets) {
      // For lucky draw, provide helpful message with available ticket numbers
      if (ticketType === 'lucky_draw' || !ticketNumbers) {
        // Find available ticket numbers to suggest
        const availableNumbers: number[] = [];
        let candidate = 1;
        const maxCheck = competition.ticketLimit || 1000000;

        while (
          candidate <= maxCheck &&
          availableNumbers.length < Math.min(availableTickets, 50)
        ) {
          if (!existingNumbers.has(candidate)) {
            availableNumbers.push(candidate);
          }
          candidate++;
        }

        throw new ApiError(
          `Only ${availableTickets} ticket(s) remaining for this competition. Available ticket numbers: ${availableNumbers.slice(0, 20).join(', ')}${availableNumbers.length > 20 ? '...' : ''}. Please use the number picker to select specific tickets.`,
          400
        );
      } else {
        throw new ApiError(
          `Only ${availableTickets} tickets remaining for this competition`,
          400
        );
      }
    }

    // Get ticket price in decimal
    const ticketPriceGBP =
      competition.ticketPrice ||
      ((competition as any).ticketPricePence
        ? (competition as any).ticketPricePence / 100
        : 0);

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

    // Determine which ticket numbers to use
    let finalTicketNumbers: number[] = [];

    if (ticketType === 'number_picker' || ticketNumbers) {
      // Number picker mode - use provided ticket numbers
      if (!ticketNumbers || !Array.isArray(ticketNumbers)) {
        throw new ApiError(
          'ticketNumbers must be provided for number picker mode',
          422
        );
      }
      if (ticketNumbers.length !== parsedQuantity) {
        throw new ApiError(
          `ticketNumbers array length (${ticketNumbers.length}) must match quantity (${parsedQuantity})`,
          422
        );
      }
      // Validate all ticket numbers are positive integers
      if (
        !ticketNumbers.every((num: any) => Number.isInteger(num) && num > 0)
      ) {
        throw new ApiError('All ticket numbers must be positive integers', 422);
      }
      // Check if any ticket numbers are already taken
      const takenNumbers = ticketNumbers.filter((num: number) =>
        existingNumbers.has(num)
      );
      if (takenNumbers.length > 0) {
        throw new ApiError(
          `Ticket number(s) ${takenNumbers.join(', ')} are already taken. Please select different tickets.`,
          400
        );
      }
      finalTicketNumbers = ticketNumbers;
    } else {
      // Lucky draw mode - randomly select available tickets
      const availableNumbers: number[] = [];
      let candidate = 1;
      const maxCheck = competition.ticketLimit || 1000000;

      while (
        availableNumbers.length < parsedQuantity &&
        candidate <= maxCheck
      ) {
        if (!existingNumbers.has(candidate)) {
          availableNumbers.push(candidate);
        }
        candidate++;
      }

      if (availableNumbers.length < parsedQuantity) {
        throw new ApiError(
          `Unable to find ${parsedQuantity} available tickets. Only ${availableNumbers.length} tickets available.`,
          400
        );
      }

      // Randomly shuffle and take the requested quantity
      for (let i = availableNumbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableNumbers[i], availableNumbers[j]] = [
          availableNumbers[j],
          availableNumbers[i],
        ];
      }
      finalTicketNumbers = availableNumbers
        .slice(0, parsedQuantity)
        .sort((a, b) => a - b);
    }

    // Create tickets with status RESERVED
    const reservedUntil = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
    const ticketsToCreate = finalTicketNumbers.map((ticketNumber) => ({
      competitionId: competition._id,
      ticketNumber,
      userId: req.user!._id, // Already validated at top of function
      status: TicketStatus.RESERVED,
      reservedUntil,
    }));

    try {
      await Ticket.insertMany(ticketsToCreate, { ordered: false });
      logger.info(
        `Created ${finalTicketNumbers.length} reserved tickets for cart`,
        {
          competitionId,
          ticketNumbers: finalTicketNumbers,
          userId: req.user!._id,
        }
      );
    } catch (insertError: any) {
      if (insertError.code === 11000) {
        // Duplicate key - tickets were taken by another request
        throw new ApiError(
          'Some tickets are no longer available. Please try again.',
          409
        );
      }
      throw insertError;
    }

    // If existing item, remove old tickets first
    // CRITICAL: Only delete cart-only reservations (without orderId)
    if (existingItem) {
      // Delete old reserved tickets for this cart item
      await Ticket.deleteMany({
        competitionId: competition._id,
        userId: req.user._id,
        status: TicketStatus.RESERVED,
        ticketNumber: { $in: existingItem.ticketNumbers || [] },
        orderId: { $exists: false }, // Only delete cart reservations, not order reservations
      });
    }

    // Update or add cart item
    if (existingItem) {
      existingItem.quantity = parsedQuantity;
      existingItem.unitPrice = ticketPriceGBP;
      existingItem.ticketNumbers = finalTicketNumbers;
      // Update ticketsValid if provided, otherwise keep existing value or default to true
      if (ticketsValid !== undefined) {
        existingItem.ticketsValid = ticketsValid;
      } else if (existingItem.ticketsValid === undefined) {
        existingItem.ticketsValid = true;
      }
      recalculateItemSubtotal(existingItem);
    } else {
      cart.items.push({
        competitionId: competition._id,
        quantity: parsedQuantity,
        ticketNumbers: finalTicketNumbers,
        unitPrice: ticketPriceGBP,
        subtotal: Number((parsedQuantity * ticketPriceGBP).toFixed(2)),
        ticketsValid: ticketsValid !== undefined ? ticketsValid : true, // Default to true if not provided
      } as any);
    }

    await cart.save();

    res
      .status(201)
      .json(
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

    const { quantity, ticketNumbers, ticketType, ticketsValid } = req.body;
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

    // Get all existing ticket numbers (excluding current item's tickets)
    const now = new Date();
    const existingTickets = await Ticket.find({
      competitionId: item.competitionId,
      $or: [
        { status: { $in: [TicketStatus.ACTIVE, TicketStatus.WINNER] } },
        {
          status: TicketStatus.RESERVED,
          reservedUntil: { $gt: now },
          // Exclude current item's tickets
          ticketNumber: { $nin: item.ticketNumbers || [] },
        },
      ],
    })
      .select('ticketNumber')
      .lean();

    const existingNumbers = new Set(
      existingTickets.map((t: any) => t.ticketNumber)
    );

    // Calculate available tickets
    const totalTicketsUsed = existingNumbers.size;
    const availableTickets =
      competition.ticketLimit !== null
        ? competition.ticketLimit - totalTicketsUsed
        : Infinity;

    if (availableTickets !== Infinity && parsedQuantity > availableTickets) {
      if (ticketType === 'lucky_draw' || !ticketNumbers) {
        // Find available ticket numbers to suggest
        const availableNumbers: number[] = [];
        let candidate = 1;
        const maxCheck = competition.ticketLimit || 1000000;

        while (
          candidate <= maxCheck &&
          availableNumbers.length < Math.min(availableTickets, 50)
        ) {
          if (!existingNumbers.has(candidate)) {
            availableNumbers.push(candidate);
          }
          candidate++;
        }

        throw new ApiError(
          `Only ${availableTickets} ticket(s) remaining for this competition. Available ticket numbers: ${availableNumbers.slice(0, 20).join(', ')}${availableNumbers.length > 20 ? '...' : ''}. Please use the number picker to select specific tickets.`,
          400
        );
      } else {
        throw new ApiError(
          `Only ${availableTickets} tickets remaining for this competition`,
          400
        );
      }
    }

    // Get ticket price in decimal
    const ticketPriceGBP =
      competition.ticketPrice ||
      ((competition as any).ticketPricePence
        ? (competition as any).ticketPricePence / 100
        : 0);

    // Determine which ticket numbers to use
    let finalTicketNumbers: number[] = [];

    if (ticketType === 'number_picker' || ticketNumbers) {
      // Number picker mode
      if (!ticketNumbers || !Array.isArray(ticketNumbers)) {
        throw new ApiError(
          'ticketNumbers must be provided for number picker mode',
          422
        );
      }
      if (ticketNumbers.length !== parsedQuantity) {
        throw new ApiError(
          `ticketNumbers array length (${ticketNumbers.length}) must match quantity (${parsedQuantity})`,
          422
        );
      }
      if (
        !ticketNumbers.every((num: any) => Number.isInteger(num) && num > 0)
      ) {
        throw new ApiError('All ticket numbers must be positive integers', 422);
      }
      // Check if any ticket numbers are already taken
      const takenNumbers = ticketNumbers.filter((num: number) =>
        existingNumbers.has(num)
      );
      if (takenNumbers.length > 0) {
        throw new ApiError(
          `Ticket number(s) ${takenNumbers.join(', ')} are already taken. Please select different tickets.`,
          400
        );
      }
      finalTicketNumbers = ticketNumbers;
    } else if (ticketNumbers === null || ticketNumbers === undefined) {
      // Lucky draw mode - randomly select available tickets
      const availableNumbers: number[] = [];
      let candidate = 1;
      const maxCheck = competition.ticketLimit || 1000000;

      while (
        availableNumbers.length < parsedQuantity &&
        candidate <= maxCheck
      ) {
        if (!existingNumbers.has(candidate)) {
          availableNumbers.push(candidate);
        }
        candidate++;
      }

      if (availableNumbers.length < parsedQuantity) {
        throw new ApiError(
          `Unable to find ${parsedQuantity} available tickets. Only ${availableNumbers.length} tickets available.`,
          400
        );
      }

      // Randomly shuffle and take the requested quantity
      for (let i = availableNumbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableNumbers[i], availableNumbers[j]] = [
          availableNumbers[j],
          availableNumbers[i],
        ];
      }
      finalTicketNumbers = availableNumbers
        .slice(0, parsedQuantity)
        .sort((a, b) => a - b);
    } else {
      // Keep existing ticket numbers if quantity unchanged and no new numbers provided
      if (
        parsedQuantity === item.quantity &&
        item.ticketNumbers &&
        item.ticketNumbers.length === parsedQuantity
      ) {
        finalTicketNumbers = item.ticketNumbers;
      } else {
        throw new ApiError(
          'ticketNumbers or ticketType must be provided when updating quantity',
          422
        );
      }
    }

    // Delete old reserved tickets for this cart item
    // CRITICAL: Only delete cart-only reservations (without orderId)
    if (item.ticketNumbers && item.ticketNumbers.length > 0) {
      await Ticket.deleteMany({
        competitionId: item.competitionId,
        userId: req.user._id,
        status: TicketStatus.RESERVED,
        ticketNumber: { $in: item.ticketNumbers },
        orderId: { $exists: false }, // Only delete cart reservations, not order reservations
      });
    }

    // Create new tickets with status RESERVED
    const reservedUntil = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
    const ticketsToCreate = finalTicketNumbers.map((ticketNumber) => ({
      competitionId: item.competitionId,
      ticketNumber,
      userId: req.user!._id, // Already validated at top of function
      status: TicketStatus.RESERVED,
      reservedUntil,
    }));

    try {
      await Ticket.insertMany(ticketsToCreate, { ordered: false });
      logger.info(
        `Updated ${finalTicketNumbers.length} reserved tickets for cart item`,
        {
          competitionId: item.competitionId,
          ticketNumbers: finalTicketNumbers,
          userId: req.user._id,
        }
      );
    } catch (insertError: any) {
      if (insertError.code === 11000) {
        throw new ApiError(
          'Some tickets are no longer available. Please try again.',
          409
        );
      }
      throw insertError;
    }

    item.quantity = parsedQuantity;
    item.unitPrice = ticketPriceGBP;
    item.ticketNumbers = finalTicketNumbers;
    // Update ticketsValid if provided, otherwise keep existing value or default to true
    if (ticketsValid !== undefined) {
      item.ticketsValid = ticketsValid;
    } else if (item.ticketsValid === undefined) {
      item.ticketsValid = true;
    }
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

    // Delete reserved tickets for this cart item
    // CRITICAL: Only delete cart-only reservations (without orderId)
    if (item.ticketNumbers && item.ticketNumbers.length > 0) {
      const deleteResult = await Ticket.deleteMany({
        competitionId: item.competitionId,
        userId: req.user._id,
        status: TicketStatus.RESERVED,
        ticketNumber: { $in: item.ticketNumbers },
        orderId: { $exists: false }, // Only delete cart reservations, not order reservations
      });
      logger.info(
        `Deleted ${deleteResult.deletedCount} cart-only reserved tickets for removed cart item`,
        {
          competitionId: item.competitionId,
          ticketNumbers: item.ticketNumbers,
          userId: req.user._id,
          deletedCount: deleteResult.deletedCount,
        }
      );
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

    const cart = await Cart.findOne({ userId: req.user._id });
    if (cart && cart.items && cart.items.length > 0) {
      // Delete all reserved tickets for all cart items
      // CRITICAL: Only delete tickets WITHOUT orderId - tickets with orderId belong to orders
      for (const item of cart.items) {
        if (item.ticketNumbers && item.ticketNumbers.length > 0) {
          const deleteResult = await Ticket.deleteMany({
            competitionId: item.competitionId,
            userId: req.user._id,
            status: TicketStatus.RESERVED,
            ticketNumber: { $in: item.ticketNumbers },
            orderId: { $exists: false }, // CRITICAL: Only delete cart reservations, not order reservations
          });
          
          logger.info(
            `Cleared cart: Deleted ${deleteResult.deletedCount} cart-only reserved tickets for cart item`,
            {
              userId: req.user._id,
              competitionId: item.competitionId,
              ticketNumbers: item.ticketNumbers,
              deletedCount: deleteResult.deletedCount,
            }
          );
        }
      }
      logger.info(
        `Cleared cart and deleted reserved tickets for user ${req.user._id}`
      );
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

/**
 * Sync local cart (from localStorage) with server cart
 * Merges local cart items with server cart items
 * POST /api/v1/cart/sync
 */
export const syncCart = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const { localCartItems } = req.body;

    if (!localCartItems || !Array.isArray(localCartItems)) {
      throw new ApiError('localCartItems must be an array', 400);
    }

    // Get or create server cart
    let cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      cart = await Cart.create({
        userId: req.user._id,
        items: [],
      });
    }

    const mergedItems: any[] = [];
    const processedCompetitionIds = new Set<string>();

    // First, add all server cart items (they take priority)
    for (const item of cart.items) {
      const competitionId = String(item.competitionId);
      processedCompetitionIds.add(competitionId);

      // Verify competition is still available
      const competition = await Competition.findById(item.competitionId);
      if (competition) {
        try {
          ensureCompetitionAvailability(competition);

          // Recalculate price in case it changed
          const ticketPriceGBP =
            competition.ticketPrice ||
            ((competition as any).ticketPricePence
              ? (competition as any).ticketPricePence / 100
              : 0);

          item.unitPrice = ticketPriceGBP;
          recalculateItemSubtotal(item);

          mergedItems.push(item);
        } catch (error: any) {
          // Competition no longer available, skip this item
          logger.warn(
            `Skipping cart item for unavailable competition ${competitionId}: ${error.message}`
          );
        }
      }
    }

    // Then, add local cart items that don't exist in server cart
    for (const localItem of localCartItems) {
      const { competitionId, quantity, ticketNumbers, ticketsValid } = localItem;

      if (!competitionId || !mongoose.Types.ObjectId.isValid(competitionId)) {
        logger.warn('Skipping invalid local cart item:', localItem);
        continue;
      }

      const competitionIdStr = String(competitionId);

      // Skip if already in server cart
      if (processedCompetitionIds.has(competitionIdStr)) {
        continue;
      }

      // Validate and add local item
      try {
        const competition = await Competition.findById(competitionId);
        if (!competition) {
          logger.warn(
            `Competition ${competitionId} not found, skipping local cart item`
          );
          continue;
        }

        ensureCompetitionAvailability(competition);

        const parsedQuantity = Number(quantity) || 1;
        if (parsedQuantity < 1 || parsedQuantity > MAX_TICKETS_PER_ITEM) {
          logger.warn(
            `Invalid quantity ${parsedQuantity} for competition ${competitionId}, skipping`
          );
          continue;
        }

        // Calculate available tickets
        const availableTickets =
          competition.ticketLimit !== null
            ? competition.ticketLimit - competition.ticketsSold
            : Infinity;

        if (
          availableTickets !== Infinity &&
          parsedQuantity > availableTickets
        ) {
          logger.warn(
            `Only ${availableTickets} tickets available for competition ${competitionId}, adjusting quantity`
          );
          // Adjust quantity to available tickets
          if (availableTickets <= 0) {
            continue; // Skip if no tickets available
          }
        }

        // Get ticket price
        const ticketPriceGBP =
          competition.ticketPrice ||
          ((competition as any).ticketPricePence
            ? (competition as any).ticketPricePence / 100
            : 0);

        // Validate ticket numbers if provided
        if (ticketNumbers) {
          if (!Array.isArray(ticketNumbers)) {
            logger.warn(
              `Invalid ticketNumbers for competition ${competitionId}, skipping`
            );
            continue;
          }
          if (ticketNumbers.length !== parsedQuantity) {
            logger.warn(
              `Ticket numbers length mismatch for competition ${competitionId}, using auto-assignment`
            );
            // Use auto-assignment if ticket numbers don't match quantity
          }
        }

        // Add item to merged cart
        mergedItems.push({
          competitionId: competition._id,
          quantity: Math.min(
            parsedQuantity,
            availableTickets === Infinity ? parsedQuantity : availableTickets
          ),
          ticketNumbers:
            ticketNumbers &&
            Array.isArray(ticketNumbers) &&
            ticketNumbers.length === parsedQuantity
              ? ticketNumbers
              : undefined,
          unitPrice: ticketPriceGBP,
          subtotal: Number(
            (
              Math.min(
                parsedQuantity,
                availableTickets === Infinity
                  ? parsedQuantity
                  : availableTickets
              ) * ticketPriceGBP
            ).toFixed(2)
          ),
          ticketsValid: ticketsValid !== undefined ? ticketsValid : true, // Default to true if not provided
        } as any);

        processedCompetitionIds.add(competitionIdStr);
      } catch (error: any) {
        // Skip invalid or unavailable items
        logger.warn(
          `Error processing local cart item for competition ${competitionId}: ${error.message}`
        );
      }
    }

    // Update cart with merged items
    cart.items = mergedItems;
    await cart.save();

    res.json(
      ApiResponse.success(
        await formatCartResponse(cart),
        'Cart synced successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};
