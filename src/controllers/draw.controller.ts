import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import {
  Draw,
  Competition,
  Ticket,
  Winner,
  Event,
  EventType,
  User,
} from '../models';
import { CompetitionStatus, DrawMode } from '../models/Competition.model';
import { DrawMethod } from '../models/Draw.model';
import { TicketStatus } from '../models/Ticket.model';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import { getPagination } from '../utils/pagination';
import drawService from '../services/draw.service';
import klaviyoService from '../services/klaviyo.service';
import logger from '../utils/logger';

/**
 * Run draw for a competition (admin-triggered)
 * POST /api/v1/admin/competitions/:id/run-draw
 */
export const runDraw = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const competitionId = req.params.id;
    const { numWinners = 1, reserveWinners = 3, liveUrl, urlType } = req.body;

    // Get competition
    const competition =
      await Competition.findById(competitionId).session(session);
    if (!competition) {
      throw new ApiError('Competition not found', 404);
    }

    // Check if competition can be drawn
    if (competition.status === 'drawn') {
      throw new ApiError('Competition has already been drawn', 400);
    }

    if (competition.status !== 'closed' && competition.status !== 'live') {
      throw new ApiError('Competition must be closed or live to draw', 400);
    }

    // Close competition if still live
    if (competition.status === 'live') {
      competition.status = CompetitionStatus.CLOSED;
      await competition.save({ session });
    }

    // Run draw
    const totalWinners = numWinners + reserveWinners;
    const drawResult = await drawService.runDraw({
      competitionId,
      numWinners: totalWinners,
    });

    const { results, snapshot, seed } = drawResult;

    // Create draw record
    const draw = await drawService.createDrawRecord(
      competitionId,
      seed,
      results,
      snapshot,
      DrawMethod.ADMIN_TRIGGERED,
      String(req.user._id),
      req.body.notes,
      undefined, // evidenceUrl (not used for admin-triggered)
      liveUrl,
      urlType
    );

    // Create winners (primary + reserves)
    const winners = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const isPrimary = i < numWinners;

      // Get ticket
      const ticket = await Ticket.findById(result.ticketId).session(session);
      if (!ticket) {
        logger.warn(`Ticket ${result.ticketId} not found, skipping`);
        continue;
      }

      // Mark ticket as winner
      ticket.status = TicketStatus.WINNER;
      await ticket.save({ session });

      // Create winner record
      const winner = await Winner.create(
        [
          {
            drawId: draw._id,
            competitionId,
            ticketId: ticket._id,
            userId: ticket.userId,
            ticketNumber: ticket.ticketNumber,
            prize: competition.prize,
            notified: false,
            claimed: false,
          },
        ],
        { session }
      );

      winners.push(winner[0]);

      // Notify primary winners
      if (isPrimary && ticket.userId) {
        const user = await User.findById(ticket.userId);
        if (user && user.email) {
          await klaviyoService.trackWinnerNotification(
            user.email,
            user.phone,
            String(competition._id),
            competition.title,
            competition.prize,
            ticket.ticketNumber,
            winner[0].claimCode,
            user.firstName,
            user.lastName
          );

          // Mark as notified
          winner[0].notified = true;
          winner[0].notifiedAt = new Date();
          await winner[0].save({ session });
        }
      }

      // Create event log
      await Event.create(
        [
          {
            type: EventType.WINNER_SELECTED,
            entity: 'winner',
            entityId: winner[0]._id,
            userId: ticket.userId,
            competitionId,
            payload: {
              ticketNumber: ticket.ticketNumber,
              isPrimary,
              drawId: draw._id.toString(),
            },
          },
        ],
        { session }
      );
    }

    // Update competition status
    competition.status = CompetitionStatus.DRAWN;
    competition.drawnAt = new Date();
    await competition.save({ session });

    // Create event log
    await Event.create(
      [
        {
          type: EventType.DRAW_CREATED,
          entity: 'draw',
          entityId: draw._id,
          competitionId,
          payload: {
            drawMethod: DrawMethod.ADMIN_TRIGGERED,
            numWinners,
            reserveWinners,
            seed,
            algorithm: 'hmac-sha256-v1',
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();

    res.json(
      ApiResponse.success(
        {
          draw: {
            id: draw._id,
            competitionId,
            drawTime: draw.drawTime,
            seed: draw.seed,
            algorithm: draw.algorithm,
            snapshotTicketCount: draw.snapshotTicketCount,
            result: draw.result,
            winners: winners.map((w) => ({
              id: w._id,
              ticketNumber: w.ticketNumber,
              claimCode: w.claimCode,
              notified: w.notified,
            })),
          },
        },
        'Draw completed successfully'
      )
    );
  } catch (error: any) {
    await session.abortTransaction();
    logger.error('Error running draw:', error);
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * Manual winner entry
 * POST /api/v1/admin/competitions/:id/add-winner
 */
export const addManualWinner = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const competitionId = req.params.id;
    const { ticketNumber, notes, evidenceUrl, liveUrl, urlType } = req.body;

    if (!ticketNumber) {
      throw new ApiError('Ticket number is required', 400);
    }

    // Get competition
    const competition =
      await Competition.findById(competitionId).session(session);
    if (!competition) {
      throw new ApiError('Competition not found', 404);
    }

    // Get ticket
    const ticket = await Ticket.findOne({
      competitionId,
      ticketNumber,
      status: TicketStatus.ACTIVE,
    }).session(session);

    if (!ticket) {
      throw new ApiError('Ticket not found', 404);
    }

    // Create snapshot for manual draw (single ticket)
    const snapshot = [
      {
        ticketNumber,
        ticketId: String(ticket._id),
        userId: ticket.userId?.toString(),
      },
    ];

    // Create draw record (manual)
    const ticketId = ticket._id as mongoose.Types.ObjectId;
    const userId = ticket.userId as mongoose.Types.ObjectId | undefined;
    const draw = await drawService.createDrawRecord(
      competitionId,
      drawService.generateSeed(),
      [
        {
          ticketNumber,
          ticketId,
          userId,
        },
      ],
      snapshot,
      DrawMethod.MANUAL,
      String(req.user._id),
      notes,
      evidenceUrl,
      liveUrl,
      urlType
    );

    // Mark ticket as winner
    ticket.status = TicketStatus.WINNER;
    await ticket.save({ session });

    // Create winner record
    const winner = await Winner.create(
      [
        {
          drawId: draw._id,
          competitionId,
          ticketId: ticket._id,
          userId: ticket.userId,
          ticketNumber,
          prize: competition.prize,
          notified: false,
          claimed: false,
          drawVideoUrl: evidenceUrl,
        },
      ],
      { session }
    );

    // Notify winner if user exists
    if (ticket.userId) {
      const user = await User.findById(ticket.userId);
      if (user && user.email) {
        await klaviyoService.trackWinnerNotification(
          user.email,
          user.phone,
          String(competition._id),
          competition.title,
          competition.prize,
          ticketNumber,
          winner[0].claimCode,
          user.firstName,
          user.lastName
        );

        winner[0].notified = true;
        winner[0].notifiedAt = new Date();
        await winner[0].save({ session });
      }
    }

    // Update competition status
    competition.status = CompetitionStatus.DRAWN;
    competition.drawnAt = new Date();
    await competition.save({ session });

    // Create event logs
    await Event.create(
      [
        {
          type: EventType.DRAW_CREATED,
          entity: 'draw',
          entityId: draw._id,
          competitionId,
          payload: {
            drawMethod: DrawMethod.MANUAL,
            ticketNumber,
            notes,
            evidenceUrl,
          },
        },
        {
          type: EventType.WINNER_SELECTED,
          entity: 'winner',
          entityId: winner[0]._id,
          userId: ticket.userId,
          competitionId,
          payload: {
            ticketNumber,
            drawId: draw._id.toString(),
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();

    res.json(
      ApiResponse.success(
        {
          draw: {
            id: draw._id,
            competitionId,
            drawTime: draw.drawTime,
            drawMethod: draw.drawMethod,
            result: draw.result,
          },
          winner: {
            id: winner[0]._id,
            ticketNumber,
            claimCode: winner[0].claimCode,
          },
        },
        'Manual winner added successfully'
      )
    );
  } catch (error: any) {
    await session.abortTransaction();
    logger.error('Error adding manual winner:', error);
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * Get draw details with audit information
 * GET /api/v1/draws/:id
 */
export const getDraw = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const draw = await Draw.findById(req.params.id)
      .populate('competitionId', 'title prize prizeValue')
      .populate('initiatedBy', 'firstName lastName email')
      .lean();

    if (!draw) {
      throw new ApiError('Draw not found', 404);
    }

    // Get winners
    const winners = await Winner.find({ drawId: draw._id })
      .populate('userId', 'firstName lastName email')
      .populate('ticketId', 'ticketNumber')
      .lean();

    res.json(
      ApiResponse.success(
        {
          draw: {
            ...draw,
            liveUrl: draw.liveUrl,
            urlType: draw.urlType,
            winners,
            audit: {
              seed: draw.seed,
              algorithm: draw.algorithm,
              snapshotTicketCount: draw.snapshotTicketCount,
              snapshot: draw.snapshot,
              result: draw.result,
            },
          },
        },
        'Draw retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update draw (admin only)
 * PUT /api/v1/admin/draws/:id
 */
export const updateDraw = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const drawId = req.params.id;
    const { drawTime, notes, evidenceUrl, liveUrl, urlType } = req.body;

    const draw = await Draw.findById(drawId);
    if (!draw) {
      throw new ApiError('Draw not found', 404);
    }

    // Update allowed fields
    if (drawTime !== undefined) {
      draw.drawTime = new Date(drawTime);
    }
    if (notes !== undefined) {
      draw.notes = notes || null;
    }
    if (evidenceUrl !== undefined) {
      draw.evidenceUrl = evidenceUrl || null;
    }
    if (liveUrl !== undefined) {
      draw.liveUrl = liveUrl || null;
    }
    if (urlType !== undefined) {
      draw.urlType = urlType || null;
    }

    await draw.save();

    // Get updated draw with populated fields
    const updatedDraw = await Draw.findById(drawId)
      .populate('competitionId', 'title prize prizeValue')
      .populate('initiatedBy', 'firstName lastName email')
      .lean();

    // Get winners
    const winners = await Winner.find({ drawId: draw._id })
      .populate('userId', 'firstName lastName email')
      .populate('ticketId', 'ticketNumber')
      .lean();

    res.json(
      ApiResponse.success(
        {
          draw: {
            ...updatedDraw,
            liveUrl: updatedDraw?.liveUrl,
            urlType: updatedDraw?.urlType,
            winners,
            audit: {
              seed: updatedDraw?.seed,
              algorithm: updatedDraw?.algorithm,
              snapshotTicketCount: updatedDraw?.snapshotTicketCount,
              snapshot: updatedDraw?.snapshot,
              result: updatedDraw?.result,
            },
          },
        },
        'Draw updated successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get draws for a competition
 * GET /api/v1/competitions/:id/draws
 */
export const getCompetitionDraws = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const competitionId = req.params.id;

    const draws = await Draw.find({ competitionId })
      .populate('initiatedBy', 'firstName lastName')
      .sort({ drawTime: -1 })
      .lean();

    const winners = await Winner.find({ competitionId })
      .populate('userId', 'firstName lastName')
      .populate('ticketId', 'ticketNumber')
      .lean();

    res.json(
      ApiResponse.success(
        {
          draws,
          winners,
        },
        'Draws retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get all draws (public endpoint with pagination)
 * GET /api/v1/draws
 */
export const getAllDraws = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const { skip, limit: pageLimit } = getPagination(page, limit);

    const filters: Record<string, any> = {};

    // Filter by competition ID if provided
    if (req.query.competitionId) {
      filters.competitionId = req.query.competitionId;
    }

    // Filter by draw method if provided
    if (req.query.drawMethod) {
      filters.drawMethod = req.query.drawMethod;
    }

    const [draws, total] = await Promise.all([
      Draw.find(filters)
        .populate('competitionId', [
          'title',
          'shortDescription',
          'description',
          'prize',
          'prizeValue',
          'cashAlternative',
          'images',
          'category',
          'slug',
          'status',
          'ticketPricePence',
          'ticketLimit',
          'ticketsSold',
          'drawAt',
          'drawnAt',
          'startDate',
          'endDate',
          'featured',
          'tags',
        ])
        .populate('initiatedBy', 'firstName lastName')
        .sort({ drawTime: -1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),
      Draw.countDocuments(filters),
    ]);

    // Get winners for each draw
    const drawsWithWinners = await Promise.all(
      draws.map(async (draw: any) => {
        const winners = await Winner.find({ drawId: draw._id })
          .populate('userId', 'firstName lastName')
          .populate('ticketId', 'ticketNumber')
          .lean();

        return {
          id: draw._id,
          competitionId: draw.competitionId,
          competition: draw.competitionId, // Full competition data
          drawTime: draw.drawTime,
          drawMethod: draw.drawMethod,
          seed: draw.seed,
          algorithm: draw.algorithm,
          snapshotTicketCount: draw.snapshotTicketCount,
          result: draw.result,
          initiatedBy: draw.initiatedBy,
          notes: draw.notes,
          evidenceUrl: draw.evidenceUrl,
          liveUrl: draw.liveUrl,
          urlType: draw.urlType,
          winnersCount: winners.length,
          winners: winners.map((w: any) => ({
            id: w._id,
            ticketNumber: w.ticketNumber,
            prize: w.prize,
            claimed: w.claimed,
            notified: w.notified,
            drawVideoUrl: w.drawVideoUrl,
            user: w.userId
              ? {
                  firstName: w.userId.firstName,
                  lastName: w.userId.lastName,
                }
              : null,
          })),
          createdAt: draw.createdAt,
          updatedAt: draw.updatedAt,
        };
      })
    );

    res.json(
      ApiResponse.success(
        {
          draws: drawsWithWinners,
          pagination: {
            page,
            limit: pageLimit,
            total,
            totalPages: Math.ceil(total / pageLimit),
            hasNext: page < Math.ceil(total / pageLimit),
            hasPrev: page > 1,
          },
        },
        'Draws retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get all draws for admin (with pagination)
 * GET /api/v1/admin/draws
 */
export const getAllDrawsForAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const { skip, limit: pageLimit } = getPagination(page, limit);

    const filters: Record<string, any> = {};

    // Filter by competition ID if provided
    if (req.query.competitionId) {
      filters.competitionId = req.query.competitionId;
    }

    // Filter by draw method if provided
    if (req.query.drawMethod) {
      filters.drawMethod = req.query.drawMethod;
    }

    // Search by competition title
    if (req.query.search) {
      const competitions = await Competition.find({
        title: { $regex: req.query.search, $options: 'i' },
      }).select('_id');
      const competitionIds = competitions.map((c) => c._id);
      if (competitionIds.length > 0) {
        filters.competitionId = { $in: competitionIds };
      } else {
        // No competitions found, return empty result
        filters.competitionId = { $in: [] };
      }
    }

    const [draws, total] = await Promise.all([
      Draw.find(filters)
        .populate('competitionId', 'title prize prizeValue')
        .populate('initiatedBy', 'firstName lastName email')
        .sort({ drawTime: -1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),
      Draw.countDocuments(filters),
    ]);

    // Get winners for each draw
    const drawsWithWinners = await Promise.all(
      draws.map(async (draw: any) => {
        const winners = await Winner.find({ drawId: draw._id })
          .populate('userId', 'firstName lastName email')
          .populate('ticketId', 'ticketNumber')
          .lean();

        return {
          ...draw,
          winners,
          winnerCount: winners.length,
        };
      })
    );

    res.json(
      ApiResponse.success(
        {
          draws: drawsWithWinners,
          pagination: {
            page,
            limit: pageLimit,
            total,
            totalPages: Math.ceil(total / pageLimit),
            hasNext: page < Math.ceil(total / pageLimit),
            hasPrev: page > 1,
          },
        },
        'Draws retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Verify draw (for audit purposes)
 * GET /api/v1/draws/:id/verify
 */
export const verifyDraw = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const drawId = req.params.id;

    const isValid = await drawService.verifyDraw(drawId);

    res.json(
      ApiResponse.success(
        {
          drawId,
          isValid,
        },
        isValid ? 'Draw verification passed' : 'Draw verification failed'
      )
    );
  } catch (error: any) {
    next(new ApiError(error.message, 400));
  }
};

/**
 * Automatic draw function (called by scheduled job)
 * This is not exposed as an API endpoint but used by jobs
 */
export const runAutomaticDraw = async (
  competitionId: string
): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get competition
    const competition =
      await Competition.findById(competitionId).session(session);
    if (!competition) {
      logger.error(`Competition ${competitionId} not found for automatic draw`);
      await session.abortTransaction();
      return;
    }

    // Check if competition should be drawn
    if (competition.status === 'drawn') {
      logger.info(`Competition ${competitionId} already drawn, skipping`);
      await session.abortTransaction();
      return;
    }

    if (competition.drawMode !== DrawMode.AUTOMATIC) {
      logger.info(
        `Competition ${competitionId} is not set to automatic draw, skipping`
      );
      await session.abortTransaction();
      return;
    }

    // Close competition
    competition.status = CompetitionStatus.CLOSED;
    await competition.save({ session });

    // Run draw (1 primary winner, 3 reserves)
    const drawResult = await drawService.runDraw({
      competitionId,
      numWinners: 4,
    });

    const { results, snapshot, seed } = drawResult;

    // Create draw record
    const draw = await drawService.createDrawRecord(
      competitionId,
      seed,
      results,
      snapshot,
      DrawMethod.AUTOMATIC,
      undefined, // No admin user for automatic
      undefined, // No notes
      undefined, // No evidence URL
      undefined, // No live URL for automatic
      undefined // No URL type for automatic
    );

    // Create winners
    const winners = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const isPrimary = i === 0; // First is primary winner

      // Get ticket
      const ticket = await Ticket.findById(result.ticketId).session(session);
      if (!ticket) {
        logger.warn(`Ticket ${result.ticketId} not found, skipping`);
        continue;
      }

      // Mark ticket as winner
      ticket.status = TicketStatus.WINNER;
      await ticket.save({ session });

      // Create winner record
      const winner = await Winner.create(
        [
          {
            drawId: draw._id,
            competitionId,
            ticketId: ticket._id,
            userId: ticket.userId,
            ticketNumber: ticket.ticketNumber,
            prize: competition.prize,
            notified: false,
            claimed: false,
          },
        ],
        { session }
      );

      winners.push(winner[0]);

      // Notify primary winner
      if (isPrimary && ticket.userId) {
        const user = await User.findById(ticket.userId);
        if (user && user.email) {
          await klaviyoService.trackWinnerNotification(
            user.email,
            user.phone,
            String(competition._id),
            competition.title,
            competition.prize,
            ticket.ticketNumber,
            winner[0].claimCode,
            user.firstName,
            user.lastName
          );

          winner[0].notified = true;
          winner[0].notifiedAt = new Date();
          await winner[0].save({ session });
        }
      }

      // Create event log
      await Event.create(
        [
          {
            type: EventType.WINNER_SELECTED,
            entity: 'winner',
            entityId: winner[0]._id,
            userId: ticket.userId,
            competitionId,
            payload: {
              ticketNumber: ticket.ticketNumber,
              isPrimary,
              drawId: draw._id.toString(),
            },
          },
        ],
        { session }
      );
    }

    // Update competition status
    competition.status = CompetitionStatus.DRAWN;
    competition.drawnAt = new Date();
    await competition.save({ session });

    // Create event log
    await Event.create(
      [
        {
          type: EventType.DRAW_CREATED,
          entity: 'draw',
          entityId: draw._id,
          competitionId,
          payload: {
            drawMethod: DrawMethod.AUTOMATIC,
            seed,
            algorithm: 'hmac-sha256-v1',
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();

    logger.info(`Automatic draw completed for competition ${competitionId}`);
  } catch (error: any) {
    await session.abortTransaction();
    logger.error(
      `Error running automatic draw for competition ${competitionId}:`,
      error
    );
    throw error;
  } finally {
    session.endSession();
  }
};
