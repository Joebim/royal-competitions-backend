import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Competition, Ticket, TicketStatus, Event, EventType } from '../models';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import { getPagination } from '../utils/pagination';
import logger from '../utils/logger';

/**
 * Hold/reserve tickets for a competition
 * POST /api/v1/competitions/:id/hold
 * Uses atomic operations instead of transactions for standalone MongoDB support
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

    // Check if competition is live and accepting entries
    if (competition.status !== 'live') {
      throw new ApiError('Competition is not currently accepting entries', 400);
    }

    // Check if competition is active
    if (!competition.isActive) {
      throw new ApiError('Competition is not active', 400);
    }

    // Check remaining tickets
    const reservedCount = await Ticket.countDocuments({
      competitionId,
      status: TicketStatus.RESERVED,
      reservedUntil: { $gt: new Date() },
    });

    const availableTickets = competition.getRemainingTickets();
    const totalAvailable = availableTickets === Infinity 
      ? Infinity 
      : availableTickets - reservedCount;

    if (totalAvailable !== Infinity && qty > totalAvailable) {
      throw new ApiError(
        `Only ${totalAvailable} ticket(s) available`,
        400
      );
    }

    // Reserve tickets using atomic operations
    const reservedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const reservedTickets: number[] = [];

    // Atomically get and increment nextTicketNumber
    // This operation is atomic and doesn't require transactions
    const updatedCompetition = await Competition.findByIdAndUpdate(
      competitionId,
      { $inc: { nextTicketNumber: qty } },
      { new: true }
    );

    if (!updatedCompetition) {
      throw new ApiError('Competition not found', 404);
    }

    const startTicketNumber = updatedCompetition.nextTicketNumber - qty;

    // Create reserved tickets - use bulk insert for better performance
    // The unique index on (competitionId, ticketNumber) will prevent duplicates
    const ticketsToCreate = [];
    for (let i = 0; i < qty; i++) {
      const ticketNumber = startTicketNumber + i;
      ticketsToCreate.push({
        competitionId,
        ticketNumber,
        userId,
        status: TicketStatus.RESERVED,
        reservedUntil,
      });
      reservedTickets.push(ticketNumber);
    }

    try {
      // Bulk insert tickets - will fail if duplicates exist due to unique index
      await Ticket.insertMany(ticketsToCreate, { ordered: false });
    } catch (insertError: any) {
      // If there's a duplicate key error, rollback the ticket number increment
      // This is a best-effort rollback since we're not using transactions
      if (insertError.code === 11000) {
        // Rollback the nextTicketNumber increment
        await Competition.findByIdAndUpdate(
          competitionId,
          { $inc: { nextTicketNumber: -qty } }
        );
        throw new ApiError(
          'Some tickets are already reserved. Please try again.',
          409
        );
      }
      throw insertError;
    }

    // Calculate cost
    const costPence = competition.ticketPricePence * qty;

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
          reservationId: `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          reservedTickets,
          reservedUntil: reservedUntil.toISOString(),
          costPence,
          costGBP: (costPence / 100).toFixed(2),
          competition: {
            id: competition._id,
            title: competition.title,
            ticketPricePence: competition.ticketPricePence,
            remainingTickets: availableTickets === Infinity ? null : availableTickets - qty,
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
    const requestedUserId = req.params.id ? String(req.params.id) : currentUserId;
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
 */
export const getCompetitionEntryList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const competitionId = req.params.id;
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    const anonymize = !isAdmin && req.query.anonymize !== 'false';

    const competition = await Competition.findById(competitionId);
    if (!competition) {
      throw new ApiError('Competition not found', 404);
    }

    const tickets = await Ticket.find({
      competitionId,
      status: TicketStatus.ACTIVE,
    })
      .populate(anonymize ? '' : 'userId', anonymize ? '' : 'firstName lastName email')
      .sort({ ticketNumber: 1 })
      .select(anonymize ? 'ticketNumber createdAt' : 'ticketNumber userId createdAt')
      .lean();

    // Format response
    const entryList = tickets.map((ticket: any) => ({
      ticketNumber: ticket.ticketNumber,
      ...(anonymize
        ? {}
        : {
            user: ticket.userId
              ? {
                  name: `${ticket.userId.firstName} ${ticket.userId.lastName}`,
                  email: ticket.userId.email,
                }
              : null,
          }),
      createdAt: ticket.createdAt,
    }));

    res.json(
      ApiResponse.success(
        {
          competition: {
            id: competition._id,
            title: competition.title,
            totalTickets: tickets.length,
          },
          entries: entryList,
        },
        'Entry list retrieved successfully'
      )
    );
  } catch (error) {
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
    const status = req.query.status as string | undefined;

    const query: any = {
      competitionId,
    };

    if (status) {
      query.status = status;
    }

    const { skip, limit: pageLimit } = getPagination(page, limit);

    const [tickets, total] = await Promise.all([
      Ticket.find(query)
        .populate('userId', 'firstName lastName email phone')
        .populate('orderId', 'paymentStatus')
        .sort({ ticketNumber: 1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),
      Ticket.countDocuments(query),
    ]);

    res.json(
      ApiResponse.success(
        {
          tickets,
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

