import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Competition, Ticket, TicketStatus, Event, EventType, Entry, Winner, Draw } from '../models';
import { CompetitionStatus } from '../models/Competition.model';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import { getPagination } from '../utils/pagination';
import logger from '../utils/logger';

/**
 * Find available ticket numbers for a competition
 * This function finds the next available ticket numbers by checking existing tickets
 */
const findAvailableTicketNumbers = async (
  competitionId: mongoose.Types.ObjectId,
  qty: number,
  maxRetries: number = 5
): Promise<number[]> => {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      // Get all existing ticket numbers for this competition (active, reserved, winner)
      // We exclude expired reservations
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
        .sort({ ticketNumber: 1 })
        .lean();

      const existingNumbers = new Set(
        existingTickets.map((t: any) => t.ticketNumber)
      );

      // Find available ticket numbers starting from 1
      const availableNumbers: number[] = [];
      let candidate = 1;

      while (availableNumbers.length < qty) {
        if (!existingNumbers.has(candidate)) {
          availableNumbers.push(candidate);
        }
        candidate++;

        // Safety check to prevent infinite loop
        if (candidate > 1000000) {
          throw new ApiError('Unable to find available ticket numbers', 500);
        }
      }

      // Try to reserve these numbers atomically
      const reservedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      const ticketsToCreate = availableNumbers.map((ticketNumber) => ({
        competitionId,
        ticketNumber,
        status: TicketStatus.RESERVED,
        reservedUntil,
      }));

      // Use insertMany with ordered: false to handle partial failures
      // If any ticket number is already taken, we'll retry
      try {
        await Ticket.insertMany(ticketsToCreate, { ordered: false });
        return availableNumbers;
      } catch (insertError: any) {
        // If duplicate key error, retry with new numbers
        if (insertError.code === 11000) {
          retries++;
          if (retries >= maxRetries) {
            throw new ApiError(
              'Unable to reserve tickets due to high demand. Please try again.',
              409
            );
          }
          // Wait a bit before retrying (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, Math.min(100 * Math.pow(2, retries), 1000))
          );
          continue;
        }
        throw insertError;
      }
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      retries++;
      if (retries >= maxRetries) {
        logger.error('Error finding available ticket numbers:', error);
        throw new ApiError('Unable to reserve tickets. Please try again.', 500);
      }
      // Wait before retrying
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(100 * Math.pow(2, retries), 1000))
      );
    }
  }

  throw new ApiError('Unable to reserve tickets. Please try again.', 500);
};

/**
 * Hold/reserve tickets for a competition
 * POST /api/v1/competitions/:id/hold
 * Improved version that finds available tickets dynamically to prevent race conditions
 */
export const holdTickets = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const competitionId = req.params.id;
    const { qty } = req.body;
    const userId = req.user?._id;

    if (!qty || qty < 1) {
      throw new ApiError('Quantity must be at least 1', 400);
    }

    // Get competition
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      throw new ApiError('Competition not found', 404);
    }

    // Check if competition has ended (endDate passed) - CHECK THIS FIRST
    const now = new Date();
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

    // Check if competition is active
    if (!competition.isActive) {
      throw new ApiError('Competition is not active', 400);
    }

    // Check if competition is live and accepting entries
    if (competition.status !== CompetitionStatus.LIVE) {
      throw new ApiError('Competition is not currently accepting entries', 400);
    }

    // Check remaining tickets (excluding expired reservations)
    const reservedCount = await Ticket.countDocuments({
      competitionId,
      status: TicketStatus.RESERVED,
      reservedUntil: { $gt: now },
    });

    const activeTicketsCount = await Ticket.countDocuments({
      competitionId,
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

    if (totalAvailable !== Infinity && qty > totalAvailable) {
      throw new ApiError(`Only ${totalAvailable} ticket(s) available`, 400);
    }

    // Find and reserve available ticket numbers
    const reservedTickets = await findAvailableTicketNumbers(
      new mongoose.Types.ObjectId(competitionId),
      qty
    );

    // Update tickets with userId
    if (userId) {
      await Ticket.updateMany(
        {
        competitionId,
          ticketNumber: { $in: reservedTickets },
        status: TicketStatus.RESERVED,
        },
        { $set: { userId } }
        );
    }

    // Calculate cost
    const ticketPrice = competition.ticketPrice || ((competition as any).ticketPricePence ? (competition as any).ticketPricePence / 100 : 0);
    const cost = Number((ticketPrice * qty).toFixed(2));
    const reservedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create event log (non-critical, so we don't fail if this errors)
    try {
      await Event.create({
        type: EventType.TICKET_RESERVED,
        entity: 'ticket',
        entityId: competitionId as any,
        userId: userId as any,
        competitionId: competitionId as any,
        payload: {
          qty,
          ticketNumbers: reservedTickets,
          reservedUntil: reservedUntil.toISOString(),
        },
      });
    } catch (eventError) {
      // Log but don't fail the request if event creation fails
      logger.warn('Failed to create event log:', eventError);
    }

    res.json(
      ApiResponse.success(
        {
          reservationId: `res_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          reservedTickets,
          reservedUntil: reservedUntil.toISOString(),
          cost,
          costGBP: cost.toFixed(2),
          competition: {
            id: competition._id,
            title: competition.title,
            ticketPrice: competition.ticketPrice || ((competition as any).ticketPricePence ? (competition as any).ticketPricePence / 100 : 0),
            remainingTickets:
              availableTickets === Infinity ? null : availableTickets - qty,
          },
        },
        'Tickets reserved successfully'
      )
    );
  } catch (error: any) {
    logger.error('Error holding tickets:', error);
    next(error);
  }
};

/**
 * Unreserve tickets for a competition
 * DELETE /api/v1/competitions/:id/hold
 * This is called when a user removes items from cart or cancels reservation
 */
export const unreserveTickets = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const competitionId = req.params.id;
    const { ticketNumbers } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      throw new ApiError('Not authorized', 401);
    }

    // Build query to find tickets to unreserve
    const query: any = {
      competitionId,
      userId,
      status: TicketStatus.RESERVED,
    };

    // If specific ticket numbers provided, filter by them
    if (
      ticketNumbers &&
      Array.isArray(ticketNumbers) &&
      ticketNumbers.length > 0
    ) {
      query.ticketNumber = { $in: ticketNumbers };
    }

    // Delete reserved tickets (only if they belong to this user and are still reserved)
    const result = await Ticket.deleteMany(query);

    if (result.deletedCount === 0) {
      // No tickets found to unreserve - might already be unreserved or purchased
      logger.info(
        `No tickets found to unreserve for user ${userId} in competition ${competitionId}`
      );
    } else {
      logger.info(
        `Unreserved ${result.deletedCount} ticket(s) for user ${userId} in competition ${competitionId}`
      );

      // Create event log (non-critical)
      try {
        await Event.create({
          type: EventType.TICKET_RESERVED,
          entity: 'ticket',
          entityId: competitionId as any,
          userId: userId as any,
          competitionId: competitionId as any,
          payload: {
            action: 'unreserved',
            ticketNumbers: ticketNumbers || [],
            count: result.deletedCount,
          },
        });
      } catch (eventError) {
        logger.warn('Failed to create event log:', eventError);
      }
    }

    res.json(
      ApiResponse.success(
        {
          unreservedCount: result.deletedCount,
        },
        'Tickets unreserved successfully'
      )
    );
  } catch (error: any) {
    logger.error('Error unreserving tickets:', error);
    next(error);
  }
};

/**
 * Get user's tickets
 * GET /api/v1/users/:id/tickets
 */
export const getUserTickets = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const currentUserId = String(req.user._id);
    const requestedUserId = req.params.id
      ? String(req.params.id)
      : currentUserId;
    const userId = req.params.id 
      ? new mongoose.Types.ObjectId(req.params.id) 
      : (req.user._id as mongoose.Types.ObjectId);
    const competitionId = req.query.competitionId as string | undefined;

    // Only allow users to view their own tickets (unless admin)
    const userRole = req.user.role;
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    if (requestedUserId !== currentUserId && !isAdmin) {
      throw new ApiError('Not authorized to view these tickets', 403);
    }

    const query: any = {
      userId,
      status: { $in: [TicketStatus.ACTIVE, TicketStatus.WINNER] },
    };

    if (competitionId) {
      query.competitionId = competitionId;
    }

    const tickets = await Ticket.find(query)
      .populate('competitionId', 'title prize images drawAt status')
      .sort({ createdAt: -1 })
      .lean();

    // Group by competition
    const ticketsByCompetition = tickets.reduce((acc: any, ticket: any) => {
      const compId = ticket.competitionId._id.toString();
      if (!acc[compId]) {
        acc[compId] = {
          competition: ticket.competitionId,
          tickets: [],
        };
      }
      acc[compId].tickets.push({
        id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        createdAt: ticket.createdAt,
      });
      return acc;
    }, {});

    res.json(
      ApiResponse.success(
        {
          tickets: Object.values(ticketsByCompetition),
        },
        'Tickets retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get competition entry list (public or admin)
 * GET /api/v1/competitions/:id/entry-list
 * Optimized with pagination and efficient queries
 */
export const getCompetitionEntryList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  try {
    const competitionId = req.params.id;
    const isAdmin =
      req.user?.role === 'admin' || req.user?.role === 'super_admin';
    const anonymize = !isAdmin && req.query.anonymize !== 'false';
    
    // Pagination parameters
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 50, 100); // Max 100 per page
    const skip = (page - 1) * limit;

    logger.info('📋 [ENTRY LIST] Fetching entry list', {
      competitionId,
      page,
      limit,
      anonymize,
      isAdmin,
    });

    const competition = await Competition.findById(competitionId).select('title question').lean();
    if (!competition) {
      throw new ApiError('Competition not found', 404);
    }

    // OPTIMIZATION: Only create missing entries in batches, not all at once
    // First, get count of tickets and entries to determine if we need to create entries
    const [ticketCount, entryCount] = await Promise.all([
      Ticket.countDocuments({
        competitionId,
        status: TicketStatus.ACTIVE,
        userId: { $exists: true },
        orderId: { $exists: true },
      }),
      Entry.countDocuments({ competitionId }),
    ]);

    // Only create missing entries if there's a significant difference (batch operation)
    // This prevents creating entries on every request
    if (ticketCount > entryCount && ticketCount - entryCount > 0) {
      // Use aggregation to find tickets without entries efficiently
      const ticketsWithoutEntries = await Ticket.aggregate([
        {
          $match: {
            competitionId: new mongoose.Types.ObjectId(competitionId),
            status: TicketStatus.ACTIVE,
            userId: { $exists: true },
            orderId: { $exists: true },
          },
        },
        {
          $lookup: {
            from: 'entries',
            let: { ticketNum: { $toString: '$ticketNumber' } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$competitionId', new mongoose.Types.ObjectId(competitionId)] },
                      { $eq: ['$ticketNumber', '$$ticketNum'] },
                    ],
                  },
                },
              },
            ],
            as: 'entry',
          },
        },
        {
          $match: {
            entry: { $size: 0 }, // No entry exists
          },
        },
        {
          $limit: 100, // Process max 100 at a time to avoid blocking
        },
        {
          $project: {
            userId: 1,
            competitionId: 1,
            orderId: 1,
            ticketNumber: 1,
          },
        },
      ]);

      if (ticketsWithoutEntries.length > 0) {
        const defaultAnswer = competition.question?.correctAnswer || '';
        const isCorrect = competition.question ? false : true;

        const entriesToCreate = ticketsWithoutEntries.map((ticket: any) => ({
          userId: ticket.userId,
          competitionId: ticket.competitionId,
          orderId: ticket.orderId,
          ticketNumber: String(ticket.ticketNumber),
          answer: defaultAnswer,
          isCorrect: isCorrect,
        }));

        try {
          await Entry.insertMany(entriesToCreate, { ordered: false });
          logger.info(
            `Created ${entriesToCreate.length} entries for competition ${competitionId}`
          );
        } catch (insertError: any) {
          // Handle duplicate key errors (some entries might have been created concurrently)
          if (insertError.code !== 11000) {
            logger.error('Error creating entries:', insertError);
          }
        }
      }
    }

    // Get paginated entries with optimized populate
    const entryQuery = Entry.find({ competitionId })
      .sort({ ticketNumber: 1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'orderId',
        select: 'orderNumber',
      });

    // Only populate userId if not anonymizing
    if (!anonymize) {
      entryQuery.populate({
        path: 'userId',
        select: 'firstName lastName email',
      });
    }

    const [allEntries, totalEntries] = await Promise.all([
      entryQuery.lean(),
      Entry.countDocuments({ competitionId }),
    ]);

    // Format response
    const entryList = allEntries.map((entry: any) => ({
      ticketNumber: entry.ticketNumber,
      ...(anonymize
        ? {}
        : {
            user: entry.userId
              ? {
                  name: `${entry.userId.firstName} ${entry.userId.lastName}`,
                  email: entry.userId.email,
                }
              : null,
          }),
      createdAt: entry.createdAt,
    }));

    const duration = Date.now() - startTime;
    logger.info('📋 [ENTRY LIST] Entry list fetched', {
      competitionId,
      page,
      limit,
      totalEntries,
      returnedEntries: entryList.length,
      duration: `${duration}ms`,
    });

    res.json(
      ApiResponse.success(
        {
          competition: {
            id: competition._id,
            title: competition.title,
            totalTickets: ticketCount,
            totalEntries: totalEntries,
          },
          entries: entryList,
          pagination: {
            page,
            limit,
            totalItems: totalEntries,
            totalPages: Math.ceil(totalEntries / limit),
          },
        },
        'Entry list retrieved successfully'
      )
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('📋 [ENTRY LIST] Error fetching entry list', {
      competitionId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
    });
    next(error);
  }
};

/**
 * Get competition tickets (admin only)
 * GET /api/v1/admin/competitions/:id/tickets
 */
export const getCompetitionTickets = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const competitionId = req.params.id;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const statusParam = req.query.status as string | undefined;

    // Query includes ALL tickets by default (active, reserved, invalid, winner, etc.)
    // Only filters by status if statusParam is provided
    const query: any = {
      competitionId,
    };

    if (statusParam) {
      // Normalize status to lowercase to match enum values (e.g., "Reserved" -> "reserved")
      const normalizedStatus = statusParam.toLowerCase();
      // Validate against enum values
      if (Object.values(TicketStatus).includes(normalizedStatus as TicketStatus)) {
        query.status = normalizedStatus;
      } else {
        throw new ApiError(`Invalid status: ${statusParam}. Valid values are: ${Object.values(TicketStatus).join(', ')}`, 400);
    }
    }
    // Note: No filter on isValid - invalid tickets (isValid: false) are included

    const { skip, limit: pageLimit } = getPagination(page, limit);

    const [tickets, total] = await Promise.all([
      Ticket.find(query)
        .populate('userId', 'firstName lastName email phone')
        .populate({
          path: 'orderId',
          select: 'paymentStatus shippingAddress',
        })
        .sort({ ticketNumber: 1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),
      Ticket.countDocuments(query),
    ]);

    // Format tickets with user details and shipping address
    const ticketsWithFields = tickets.map((ticket: any) => {
      const formattedTicket: any = {
        ...ticket,
        isValid: ticket.isValid !== undefined ? ticket.isValid : true, // Default to true if not set
        status: ticket.status || 'reserved', // Ensure status is always present
      };
      
      // Format user details
      if (ticket.userId) {
        const user = ticket.userId as any;
        formattedTicket.user = {
          id: user._id,
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
          firstName: user.firstName || null,
          lastName: user.lastName || null,
          email: user.email || null,
          phone: user.phone || null,
        };
      } else {
        formattedTicket.user = null;
      }
      delete formattedTicket.userId;

      // Add shipping address from order
      if (ticket.orderId?.shippingAddress) {
        formattedTicket.shippingAddress = ticket.orderId.shippingAddress;
      } else {
        formattedTicket.shippingAddress = null;
      }

      // Keep order info but remove nested shippingAddress
      if (ticket.orderId) {
        formattedTicket.order = {
          id: ticket.orderId._id,
          paymentStatus: ticket.orderId.paymentStatus,
        };
      } else {
        formattedTicket.order = null;
      }
      delete formattedTicket.orderId;
      
      // Always include reservedUntil for reserved tickets (convert to ISO string if Date object)
      if (ticket.status === TicketStatus.RESERVED || ticket.status === 'reserved') {
        if (ticket.reservedUntil) {
          formattedTicket.reservedUntil = ticket.reservedUntil instanceof Date 
            ? ticket.reservedUntil.toISOString() 
            : ticket.reservedUntil;
        } else {
          // If reserved ticket doesn't have reservedUntil, set to null
          formattedTicket.reservedUntil = null;
        }
      } else if (ticket.reservedUntil) {
        // Include reservedUntil for other tickets if present (for completeness)
        formattedTicket.reservedUntil = ticket.reservedUntil instanceof Date 
          ? ticket.reservedUntil.toISOString() 
          : ticket.reservedUntil;
      }
      
      return formattedTicket;
    });

    res.json(
      ApiResponse.success(
        {
          tickets: ticketsWithFields,
          pagination: {
            page,
            limit: pageLimit,
            totalItems: total,
            totalPages: Math.ceil(total / pageLimit) || 1,
          },
        },
        'Tickets retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get ticket list for a competition with buy status (user endpoint)
 * GET /api/v1/competitions/:id/tickets/list
 * Returns tickets for a competition showing which are bought and which are available
 * Paginated in ranges of 100 tickets (1-100, 101-200, etc.)
 * 
 * Query parameters:
 * - range: Range number (1 = tickets 1-100, 2 = tickets 101-200, etc.) - defaults to 1
 * - startTicket: Alternative way to specify start ticket number (overrides range)
 * - endTicket: Alternative way to specify end ticket number (overrides range)
 */
export const getCompetitionTicketList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Authentication is optional - if user is logged in, we'll show which tickets are theirs
    const userId = req.user?._id?.toString();

    const competitionId = req.params.id;
    const RANGE_SIZE = 100; // Fixed range size of 100 tickets
    
    // Get competition to check ticket limit
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      throw new ApiError('Competition not found', 404);
    }

    // Determine the range of tickets to return
    let startTicket: number;
    let endTicket: number;

    // If startTicket and endTicket are explicitly provided, use them
    if (req.query.startTicket && req.query.endTicket) {
      startTicket = Number(req.query.startTicket);
      endTicket = Number(req.query.endTicket);
    } else {
      // Otherwise, use range parameter (1 = tickets 1-100, 2 = tickets 101-200, etc.)
      const range = Number(req.query.range) || 1;
      startTicket = (range - 1) * RANGE_SIZE + 1;
      endTicket = range * RANGE_SIZE;
    }

    // Validate range
    if (startTicket < 1) {
      startTicket = 1;
    }
    if (endTicket < startTicket) {
      endTicket = startTicket + RANGE_SIZE - 1;
    }

    // If competition has a ticket limit, don't exceed it
    const effectiveMaxTicket = competition.ticketLimit 
      ? Math.min(endTicket, competition.ticketLimit)
      : endTicket;
    
    // Ensure start doesn't exceed the limit
    if (competition.ticketLimit && startTicket > competition.ticketLimit) {
      throw new ApiError(
        `Start ticket number (${startTicket}) exceeds competition ticket limit (${competition.ticketLimit})`,
        400
      );
    }

    // Get all bought tickets (ACTIVE or WINNER status) for this competition
    const boughtTickets = await Ticket.find({
      competitionId,
      status: { $in: [TicketStatus.ACTIVE, TicketStatus.WINNER] },
      ticketNumber: { $gte: startTicket, $lte: effectiveMaxTicket },
    })
      .select('ticketNumber status isValid')
      .lean();

    // Create a set of bought ticket numbers for quick lookup
    const boughtTicketNumbers = new Set(
      boughtTickets.map((t: any) => t.ticketNumber)
    );

    // Get reserved tickets (that haven't expired) in this range
    const now = new Date();
    const reservedTickets = await Ticket.find({
      competitionId,
      status: TicketStatus.RESERVED,
      reservedUntil: { $gt: now },
      ticketNumber: { $gte: startTicket, $lte: effectiveMaxTicket },
    })
      .select('ticketNumber userId')
      .lean();

    // Create a set of reserved ticket numbers
    const reservedTicketNumbers = new Set(
      reservedTickets.map((t: any) => t.ticketNumber)
    );

    // Build the ticket list
    const ticketList: Array<{
      ticketNumber: number;
      status: 'available' | 'bought' | 'reserved';
      isValid?: boolean; // Only present for bought tickets
      isMine?: boolean;
    }> = [];

    for (let ticketNum = startTicket; ticketNum <= effectiveMaxTicket; ticketNum++) {
      if (boughtTicketNumbers.has(ticketNum)) {
        // Ticket is bought - get its validity status
        const boughtTicket = boughtTickets.find(
          (t: any) => t.ticketNumber === ticketNum
        );
        ticketList.push({
          ticketNumber: ticketNum,
          status: 'bought',
          isValid: boughtTicket?.isValid !== false, // Default to true if not set
        });
      } else if (reservedTicketNumbers.has(ticketNum)) {
        // Check if it's reserved by the current user (if authenticated)
        const reservedTicket = reservedTickets.find(
          (t: any) => t.ticketNumber === ticketNum
        );
        const isMine =
          userId &&
          reservedTicket &&
          reservedTicket.userId &&
          String(reservedTicket.userId) === userId;

        ticketList.push({
          ticketNumber: ticketNum,
          status: 'reserved',
          isMine: isMine || false,
        });
      } else {
        // Ticket is available
        ticketList.push({
          ticketNumber: ticketNum,
          status: 'available',
        });
      }
    }

    // Get statistics
    const totalBought = await Ticket.countDocuments({
      competitionId,
      status: { $in: [TicketStatus.ACTIVE, TicketStatus.WINNER] },
    });

    const totalReserved = await Ticket.countDocuments({
      competitionId,
      status: TicketStatus.RESERVED,
      reservedUntil: { $gt: now },
    });

    const totalAvailable =
      competition.ticketLimit === null
        ? null
        : Math.max(0, competition.ticketLimit - totalBought - totalReserved);

    // Calculate pagination info
    const totalTickets = competition.ticketLimit || null;
    const currentRange = Math.floor((startTicket - 1) / RANGE_SIZE) + 1;
    const totalRanges = totalTickets 
      ? Math.ceil(totalTickets / RANGE_SIZE)
      : null;
    const hasNextRange = totalTickets 
      ? effectiveMaxTicket < totalTickets
      : true; // If unlimited, assume there's always a next range
    const hasPreviousRange = startTicket > 1;

    res.json(
      ApiResponse.success(
        {
          competition: {
            id: competition._id,
            title: competition.title,
            ticketLimit: competition.ticketLimit,
            ticketsSold: competition.ticketsSold,
          },
          tickets: ticketList,
          range: {
            start: startTicket,
            end: effectiveMaxTicket,
            total: ticketList.length,
            currentRange,
            totalRanges,
            hasNextRange,
            hasPreviousRange,
            nextRangeStart: hasNextRange ? effectiveMaxTicket + 1 : null,
            previousRangeStart: hasPreviousRange 
              ? Math.max(1, startTicket - RANGE_SIZE)
              : null,
          },
          statistics: {
            totalBought,
            totalReserved,
            totalAvailable,
          },
        },
        'Ticket list retrieved successfully'
      )
    );
  } catch (error: any) {
    logger.error('Error getting competition ticket list:', error);
    next(error);
  }
};

/**
 * Delete a ticket (admin only)
 * DELETE /api/v1/admin/tickets/:id
 */
export const deleteTicket = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const ticketId = req.params.id;

    // Find the ticket
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      throw new ApiError('Ticket not found', 404);
    }

    // Prevent deletion if ticket is a winner (unless force delete)
    const forceDelete = req.query.force === 'true' || req.body.force === true;
    if (ticket.status === TicketStatus.WINNER && !forceDelete) {
      throw new ApiError(
        'Cannot delete a winning ticket. Please handle the winner record first, or use ?force=true to delete both.',
        400
      );
    }

    // Check if ticket is associated with a Winner record
    const winner = await Winner.findOne({ ticketId: ticket._id });
    if (winner) {
      // Check if force delete is requested (cascade delete)
      const forceDelete = req.query.force === 'true' || req.body.force === true;
      
      if (!forceDelete) {
        throw new ApiError(
          'Cannot delete ticket that is associated with a winner record. Please delete the winner record first, or use ?force=true to delete both.',
          400
        );
      }

      // Cascade delete: delete the winner first
      await Winner.findByIdAndDelete(winner._id);
      logger.info(
        `Cascade deleted winner ${winner._id} when deleting ticket ${ticketId}`
      );
    }

    // Check if ticket is associated with a Draw
    const draws = await Draw.find({
      'result.ticketId': ticket._id,
    });
    if (draws.length > 0) {
      // Check if force delete is requested
      const forceDelete = req.query.force === 'true' || req.body.force === true;
      
      if (!forceDelete) {
        throw new ApiError(
          'Cannot delete ticket that is part of a draw result. Draw results cannot be modified. Use ?force=true to remove the ticket from draw results and delete it.',
          400
        );
      }

      // Remove ticket from all draw results
      const ticketIdObj = ticket._id as mongoose.Types.ObjectId;
      for (const draw of draws) {
        draw.result = draw.result.filter(
          (result) => result.ticketId.toString() !== ticketIdObj.toString()
        );
        await draw.save();
        logger.info(
          `Removed ticket ${ticketId} from draw ${draw._id} result array`
        );
      }
    }

    // Store ticket info for logging before deletion
    const ticketInfo = {
      id: ticket._id,
      ticketNumber: ticket.ticketNumber,
      competitionId: ticket.competitionId,
      userId: ticket.userId,
      orderId: ticket.orderId,
      status: ticket.status,
    };

    // Delete the ticket
    await Ticket.findByIdAndDelete(ticketId);

    // Log the deletion event (non-critical)
    try {
      await Event.create({
        type: EventType.TICKET_DELETED,
        entity: 'ticket',
        entityId: ticket._id as any,
        userId: req.user?._id as any,
        competitionId: ticket.competitionId as any,
        payload: {
          ticketId: ticketInfo.id,
          ticketNumber: ticketInfo.ticketNumber,
          previousStatus: ticketInfo.status,
          deletedBy: req.user?._id,
        },
      });
    } catch (eventError) {
      logger.warn('Failed to create event log for ticket deletion:', eventError);
    }

    logger.info(
      `Admin ${req.user?._id} deleted ticket ${ticketInfo.ticketNumber} (ID: ${ticketInfo.id}) from competition ${ticketInfo.competitionId}`
    );

    res.json(
      ApiResponse.success(
        {
          ticket: {
            id: ticketInfo.id,
            ticketNumber: ticketInfo.ticketNumber,
            status: ticketInfo.status,
          },
        },
        'Ticket deleted successfully'
      )
    );
  } catch (error: any) {
    logger.error('Error deleting ticket:', error);
    next(error);
  }
};