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
import { DrawMethod, IDrawResult } from '../models/Draw.model';
import { TicketStatus } from '../models/Ticket.model';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import { getPagination } from '../utils/pagination';
import drawService from '../services/draw.service';
import klaviyoService from '../services/klaviyo.service';
import emailService from '../services/email.service';
import { config } from '../config/environment';
import logger from '../utils/logger';
import { supportsTransactions } from '../utils/mongoTransaction';

/**
 * Generate a unique claim code for winners
 * Format: ABCD-1234
 */
const generateClaimCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part1 = Array.from({ length: 4 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
  const part2 = Array.from({ length: 4 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
  return `${part1}-${part2}`;
};

/**
 * Run draw for a competition (admin-triggered)
 * POST /api/v1/admin/competitions/:id/run-draw
 */
export const runDraw = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Check if we have a real session (transactions supported)
  const useSession = async (
    callback: (session: mongoose.ClientSession) => Promise<void>
  ) => {
    const hasTransactions = await supportsTransactions();

    if (hasTransactions) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        await callback(session);
        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    } else {
      // No transactions - run without session
      const dummySession = {} as mongoose.ClientSession;
      await callback(dummySession);
    }
  };

  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const userId = String(req.user._id);
    const competitionId = req.params.id;
    const { numWinners = 1, reserveWinners = 3, liveUrl, urlType } = req.body;

    await useSession(async (session) => {
      const isRealSession = session && 'startTransaction' in session;

      // Get competition
      const competition = isRealSession
        ? await Competition.findById(competitionId).session(session)
        : await Competition.findById(competitionId);
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
        if (isRealSession) {
          await competition.save({ session });
        } else {
          await competition.save();
        }
      }

      // Run draw
      const totalWinners = numWinners + reserveWinners;
      let drawResult;
      let results: IDrawResult[] = [];
      let snapshot: any[] = [];
      let seed: string = drawService.generateSeed();
      let drawError: string | undefined;

      try {
        drawResult = await drawService.runDraw({
          competitionId,
          numWinners: totalWinners,
        });
        results = drawResult.results;
        snapshot = drawResult.snapshot;
        seed = drawResult.seed;
      } catch (error: any) {
        // If draw fails (e.g., no tickets), still create draw record for audit
        logger.warn(`Draw execution failed: ${error.message}. Creating draw record with empty results.`);
        drawError = error.message;
        // Create empty snapshot for audit
        snapshot = [];
      }

      // Create draw record (always create, even if draw failed or no winners found)
      const notes = drawError 
        ? `${req.body.notes || ''} [Draw Error: ${drawError}]`.trim()
        : req.body.notes;
      
      const draw = await drawService.createDrawRecord(
        competitionId,
        seed,
        results,
        snapshot,
        DrawMethod.ADMIN_TRIGGERED,
        userId,
        notes,
        undefined, // evidenceUrl (not used for admin-triggered)
        liveUrl,
        urlType
      );

      // If no winners found, still update competition and create event
      if (results.length === 0) {
        logger.warn(
          `No winners found for competition ${competitionId}. Draw record created for audit purposes.`
        );

        // Update competition status
        competition.status = CompetitionStatus.DRAWN;
        competition.drawnAt = new Date();
        if (isRealSession) {
          await competition.save({ session });
        } else {
          await competition.save();
        }

        // Create event log
        const drawEventOptions = isRealSession ? { session } : {};
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
                note: drawError || 'No winners found - no tickets available',
              },
            },
          ],
          drawEventOptions
        );

        
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
                winners: [],
                note: drawError || 'No winners found',
              },
            },
            drawError 
              ? `Draw completed with error: ${drawError}` 
              : 'Draw completed successfully (no winners found)'
          )
        );
        return;
      }

      // Create winners (primary + reserves)
      const winners = [];
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const isPrimary = i < numWinners;

        // Get ticket
        const ticket = isRealSession
          ? await Ticket.findById(result.ticketId).session(session)
          : await Ticket.findById(result.ticketId);
        if (!ticket) {
          logger.warn(`Ticket ${result.ticketId} not found, skipping`);
          continue;
        }

        // Mark ticket as winner
        ticket.status = TicketStatus.WINNER;
        if (isRealSession) {
          await ticket.save({ session });
        } else {
          await ticket.save();
        }

        // Create winner record
        const winnerOptions = isRealSession ? { session } : {};
        const winner = await Winner.create(
          [
            {
              drawId: draw._id,
              competitionId,
              ticketId: ticket._id,
              userId: ticket.userId,
              ticketNumber: ticket.ticketNumber,
              prize: competition.prize,
              prizeValue: competition.prizeValue,
              notified: false,
              claimed: false,
              claimCode: generateClaimCode(),
            },
          ],
          winnerOptions
        );

        winners.push(winner[0]);

        // Notify primary winners
        if (isPrimary && ticket.userId) {
          const user = await User.findById(ticket.userId);
          if (user && user.email) {
            // Track "Won Competition" event in Klaviyo
            try {
              // Determine prize type
              let prizeType = 'other';
              const prizeLower = competition.prize.toLowerCase();
              if (
                prizeLower.includes('cash') ||
                prizeLower.includes('£') ||
                prizeLower.includes('money')
              ) {
                prizeType = 'cash';
              } else if (
                prizeLower.includes('car') ||
                prizeLower.includes('vehicle')
              ) {
                prizeType = 'car';
              } else if (
                prizeLower.includes('holiday') ||
                prizeLower.includes('trip') ||
                prizeLower.includes('vacation')
              ) {
                prizeType = 'holiday';
              }

              await klaviyoService.trackEvent(
                user.email,
                'Won Competition',
                {
                  competition_id: String(competition._id),
                  competition_name: competition.title,
                  ticket_number: ticket.ticketNumber,
                  claim_code: winner[0].claimCode,
                  prize_type: prizeType,
                },
                competition.prizeValue || competition.cashAlternative || 0
              );
            } catch (error: any) {
              logger.error('Error tracking Won Competition event:', error);
            }

            // Send email notification
            try {
              const claimUrl = `${config.frontendUrl}/winners/${winner[0]._id}/claim?code=${winner[0].claimCode}`;
              await emailService.sendWinnerNotificationEmail({
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                competitionTitle: competition.title,
                ticketNumber: ticket.ticketNumber,
                prize: competition.prize,
                drawDate: draw.createdAt.toISOString(),
                claimUrl,
              });
              logger.info(`Winner notification email sent to ${user.email}`);
            } catch (error: any) {
              logger.error('Error sending winner notification email:', error);
            }

            // Mark as notified
            winner[0].notified = true;
            winner[0].notifiedAt = new Date();
            if (isRealSession) {
              await winner[0].save({ session });
            } else {
              await winner[0].save();
            }
          }
        }

        // Create event log
        const eventOptions = isRealSession ? { session } : {};
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
          eventOptions
        );
      }

      // Update competition status
      competition.status = CompetitionStatus.DRAWN;
      competition.drawnAt = new Date();
      if (isRealSession) {
        await competition.save({ session });
      } else {
        await competition.save();
      }

      // Create event log
      const drawEventOptions = isRealSession ? { session } : {};
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
        drawEventOptions
      );

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
    });
  } catch (error: any) {
    logger.error('Error running draw:', error);
    next(error);
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
  // Check if we have a real session (transactions supported)
  const useSession = async (
    callback: (session: mongoose.ClientSession) => Promise<void>
  ) => {
    const hasTransactions = await supportsTransactions();

    if (hasTransactions) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        await callback(session);
        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    } else {
      // No transactions - run without session
      const dummySession = {} as mongoose.ClientSession;
      await callback(dummySession);
    }
  };

  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const adminUserId = String(req.user._id);
    const competitionId = req.params.id;
    const { ticketNumber, notes, evidenceUrl, liveUrl, urlType } = req.body;

    if (!ticketNumber) {
      throw new ApiError('Ticket number is required', 400);
    }

    await useSession(async (session) => {
      const isRealSession = session && 'startTransaction' in session;

      // Get competition
      const competition = isRealSession
        ? await Competition.findById(competitionId).session(session)
        : await Competition.findById(competitionId);
      if (!competition) {
        throw new ApiError('Competition not found', 404);
      }

      // Get ticket
      const ticket = isRealSession
        ? await Ticket.findOne({
            competitionId,
            ticketNumber,
            status: TicketStatus.ACTIVE,
          }).session(session)
        : await Ticket.findOne({
            competitionId,
            ticketNumber,
            status: TicketStatus.ACTIVE,
          });

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
        adminUserId,
        notes,
        evidenceUrl,
        liveUrl,
        urlType
      );

      // Mark ticket as winner
      ticket.status = TicketStatus.WINNER;
      if (isRealSession) {
        await ticket.save({ session });
      } else {
        await ticket.save();
      }

      // Create winner record
      const winnerOptions = isRealSession ? { session } : {};
      const winner = await Winner.create(
        [
          {
            drawId: draw._id,
            competitionId,
            ticketId: ticket._id,
            userId: ticket.userId,
            ticketNumber,
            prize: competition.prize,
            prizeValue: competition.prizeValue,
            notified: false,
            claimed: false,
            claimCode: generateClaimCode(),
            drawVideoUrl: evidenceUrl,
          },
        ],
        winnerOptions
      );

      // Notify winner if user exists
      if (ticket.userId) {
        const user = await User.findById(ticket.userId);
        if (user && user.email) {
          // Track "Won Competition" event in Klaviyo
          try {
            // Determine prize type
            let prizeType = 'other';
            const prizeLower = competition.prize.toLowerCase();
            if (
              prizeLower.includes('cash') ||
              prizeLower.includes('£') ||
              prizeLower.includes('money')
            ) {
              prizeType = 'cash';
            } else if (
              prizeLower.includes('car') ||
              prizeLower.includes('vehicle')
            ) {
              prizeType = 'car';
            } else if (
              prizeLower.includes('holiday') ||
              prizeLower.includes('trip') ||
              prizeLower.includes('vacation')
            ) {
              prizeType = 'holiday';
            }

            await klaviyoService.trackEvent(
              user.email,
              'Won Competition',
              {
                competition_id: String(competition._id),
                competition_name: competition.title,
                ticket_number: ticketNumber,
                claim_code: winner[0].claimCode,
                prize_type: prizeType,
              },
              competition.prizeValue || competition.cashAlternative || 0
            );
          } catch (error: any) {
            logger.error('Error tracking Won Competition event:', error);
          }

          // Send email notification
          try {
            const claimUrl = `${config.frontendUrl}/winners/${winner[0]._id}/claim?code=${winner[0].claimCode}`;
            logger.info(
              `Attempting to send email to ${user.email} with claim URL: ${claimUrl}`
            );
            await emailService.sendWinnerNotificationEmail({
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              competitionTitle: competition.title,
              ticketNumber: ticketNumber,
              prize: competition.prize,
              drawDate: draw.createdAt.toISOString(),
              claimUrl,
            });
            logger.info(
              `✅ Winner notification email successfully sent to ${user.email}`
            );
          } catch (error: any) {
            logger.error(
              `❌ Error sending winner notification email to ${user.email}:`,
              error
            );
            logger.error('Email error details:', {
              message: error.message,
              stack: error.stack,
              email: user.email,
              competitionId,
            });
            // Don't fail the draw if email fails
          }

          winner[0].notified = true;
          winner[0].notifiedAt = new Date();
          if (isRealSession) {
            await winner[0].save({ session });
          } else {
            await winner[0].save();
          }
        }
      }

      // Update competition status
      competition.status = CompetitionStatus.DRAWN;
      competition.drawnAt = new Date();
      if (isRealSession) {
        await competition.save({ session });
      } else {
        await competition.save();
      }

      // Create event logs
      const eventOptions = isRealSession ? { session } : {};
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
        eventOptions
      );

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
    });
  } catch (error: any) {
    logger.error('Error adding manual winner:', error);
    next(error);
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
          'ticketPrice',
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
 * Delete draw (admin only)
 * DELETE /api/v1/admin/draws/:id
 */
export const deleteDraw = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const drawId = req.params.id;

    const draw = await Draw.findById(drawId);
    if (!draw) {
      throw new ApiError('Draw not found', 404);
    }

    // Check if draw has winners - warn but allow deletion
    const winners = await Winner.find({ drawId: draw._id });
    if (winners.length > 0) {
      logger.warn(
        `Deleting draw ${drawId} with ${winners.length} associated winner(s)`
      );
    }

    // Delete associated winners
    if (winners.length > 0) {
      await Winner.deleteMany({ drawId: draw._id });
      logger.info(`Deleted ${winners.length} winner(s) associated with draw ${drawId}`);
    }

    // Delete draw
    await Draw.findByIdAndDelete(drawId);

    // Create event log
    await Event.create({
      type: EventType.DRAW_CREATED, // Using existing event type
      entity: 'draw',
      entityId: draw._id,
      competitionId: draw.competitionId,
      userId: req.user._id,
      payload: {
        action: 'deleted',
        drawId: drawId,
        drawMethod: draw.drawMethod,
        winnerCount: winners.length,
      },
    });

    logger.info(`Draw ${drawId} deleted by admin ${req.user._id}`);

    res.json(
      ApiResponse.success(
        {
          drawId,
          deletedWinners: winners.length,
        },
        'Draw deleted successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Automatic draw function (called by scheduled job)
 * This is not exposed as an API endpoint but used by jobs
 */
export const runAutomaticDraw = async (
  competitionId: string
): Promise<void> => {
  // Check if we have a real session (transactions supported)
  const useSession = async (
    callback: (session: mongoose.ClientSession) => Promise<void>
  ) => {
    const hasTransactions = await supportsTransactions();

    if (hasTransactions) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        await callback(session);
        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    } else {
      // No transactions - run without session
      const dummySession = {} as mongoose.ClientSession;
      await callback(dummySession);
    }
  };

  await useSession(async (session) => {
    const isRealSession = session && 'startTransaction' in session;

    // Get competition
    const competition = isRealSession
      ? await Competition.findById(competitionId).session(session)
      : await Competition.findById(competitionId);

    if (!competition) {
      logger.error(`Competition ${competitionId} not found for automatic draw`);
      return;
    }

    // Check if competition should be drawn
    if (competition.status === 'drawn') {
      logger.info(`Competition ${competitionId} already drawn, skipping`);
      return;
    }

    if (competition.drawMode !== DrawMode.AUTOMATIC) {
      logger.info(
        `Competition ${competitionId} is not set to automatic draw, skipping`
      );
      return;
    }

    // Close competition
    competition.status = CompetitionStatus.CLOSED;
    if (isRealSession) {
      await competition.save({ session });
    } else {
      await competition.save();
    }

    // Run draw (1 primary winner, 3 reserves)
    logger.info(
      `Running draw for competition ${competitionId} with 4 winners (1 primary + 3 reserves)`
    );
    
    let results: IDrawResult[] = [];
    let snapshot: any[] = [];
    let seed: string = drawService.generateSeed();
    let drawError: string | undefined;

    try {
      const drawResult = await drawService.runDraw({
        competitionId,
        numWinners: 4,
      });
      results = drawResult.results;
      snapshot = drawResult.snapshot;
      seed = drawResult.seed;
      logger.info(
        `Draw completed: found ${results.length} winner(s) for competition ${competitionId}`
      );
    } catch (error: any) {
      // If draw fails (e.g., no tickets), still create draw record for audit
      logger.warn(`Automatic draw execution failed for competition ${competitionId}: ${error.message}. Creating draw record with empty results.`);
      drawError = error.message;
      // Create empty snapshot for audit
      snapshot = [];
    }

    // Create draw record (always create, even if draw failed or no winners found for audit purposes)
    const notes = drawError ? `[Draw Error: ${drawError}]` : undefined;
    const draw = await drawService.createDrawRecord(
      competitionId,
      seed,
      results,
      snapshot,
      DrawMethod.AUTOMATIC,
      undefined, // No admin user for automatic
      notes,
      undefined, // No evidence URL
      undefined, // No live URL for automatic
      undefined // No URL type for automatic
    );

    if (results.length === 0) {
      logger.warn(
        `No winners found for competition ${competitionId} - no tickets available or draw failed. Draw record created for audit purposes.`
      );
      
      // Update competition status even if no winners
      competition.status = CompetitionStatus.DRAWN;
      competition.drawnAt = new Date();
      if (isRealSession) {
        await competition.save({ session });
      } else {
        await competition.save();
      }

      // Create event log
      const drawEventOptions = isRealSession ? { session } : {};
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
              note: 'No winners found - no tickets available',
            },
          },
        ],
        drawEventOptions
      );

      logger.info(`Automatic draw completed for competition ${competitionId} (no winners found)`);
      return;
    }

    // Create winners
    const winners = [];
    logger.info(
      `Creating ${results.length} winner(s) for competition ${competitionId}`
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const isPrimary = i === 0; // First is primary winner

      // Get ticket
      const ticket = isRealSession
        ? await Ticket.findById(result.ticketId).session(session)
        : await Ticket.findById(result.ticketId);

      if (!ticket) {
        logger.warn(`Ticket ${result.ticketId} not found, skipping`);
        continue;
      }

      logger.info(
        `Processing winner ${i + 1}: ticket ${ticket.ticketNumber}, userId: ${ticket.userId}, isPrimary: ${isPrimary}`
      );

      // Mark ticket as winner
      ticket.status = TicketStatus.WINNER;
      if (isRealSession) {
        await ticket.save({ session });
      } else {
        await ticket.save();
      }

      // Create winner record
      const winnerOptions = isRealSession ? { session } : {};
      const winner = await Winner.create(
        [
          {
            drawId: draw._id,
            competitionId,
            ticketId: ticket._id,
            userId: ticket.userId,
            ticketNumber: ticket.ticketNumber,
            prize: competition.prize,
            prizeValue: competition.prizeValue,
            notified: false,
            claimed: false,
            claimCode: generateClaimCode(),
          },
        ],
        winnerOptions
      );

      winners.push(winner[0]);

      // Notify primary winner
      if (isPrimary && ticket.userId) {
        logger.info(
          `Primary winner found: ticket ${ticket.ticketNumber}, userId: ${ticket.userId}`
        );
        const user = await User.findById(ticket.userId);

        if (!user) {
          logger.warn(
            `User ${ticket.userId} not found for winner notification`
          );
        } else if (!user.email) {
          logger.warn(
            `User ${ticket.userId} has no email address for winner notification`
          );
        } else {
          logger.info(
            `Sending winner notification to ${user.email} for competition ${competitionId}`
          );

          // Track "Won Competition" event in Klaviyo
          try {
            // Determine prize type
            let prizeType = 'other';
            const prizeLower = competition.prize.toLowerCase();
            if (
              prizeLower.includes('cash') ||
              prizeLower.includes('£') ||
              prizeLower.includes('money')
            ) {
              prizeType = 'cash';
            } else if (
              prizeLower.includes('car') ||
              prizeLower.includes('vehicle')
            ) {
              prizeType = 'car';
            } else if (
              prizeLower.includes('holiday') ||
              prizeLower.includes('trip') ||
              prizeLower.includes('vacation')
            ) {
              prizeType = 'holiday';
            }

            await klaviyoService.trackEvent(
              user.email,
              'Won Competition',
              {
                competition_id: String(competition._id),
                competition_name: competition.title,
                ticket_number: ticket.ticketNumber,
                claim_code: winner[0].claimCode,
                prize_type: prizeType,
              },
              competition.prizeValue || competition.cashAlternative || 0
            );
          } catch (error: any) {
            logger.error('Error tracking Won Competition event:', error);
          }

          // Send email notification
          try {
            const claimUrl = `${config.frontendUrl}/winners/${winner[0]._id}/claim?code=${winner[0].claimCode}`;
            logger.info(
              `Attempting to send email to ${user.email} with claim URL: ${claimUrl}`
            );

            await emailService.sendWinnerNotificationEmail({
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              competitionTitle: competition.title,
              ticketNumber: ticket.ticketNumber,
              prize: competition.prize,
              drawDate: draw.createdAt.toISOString(),
              claimUrl,
            });
            logger.info(
              `✅ Winner notification email successfully sent to ${user.email}`
            );
          } catch (error: any) {
            logger.error(
              `❌ Error sending winner notification email to ${user.email}:`,
              error
            );
            logger.error('Email error details:', {
              message: error.message,
              stack: error.stack,
              email: user.email,
              competitionId,
            });
            // Don't fail the draw if email fails
          }

          winner[0].notified = true;
          winner[0].notifiedAt = new Date();
          if (isRealSession) {
            await winner[0].save({ session });
          } else {
            await winner[0].save();
          }
        }
      } else {
        logger.warn(
          `Skipping notification: isPrimary=${isPrimary}, hasUserId=${!!ticket.userId}`
        );
      }

      // Create event log
      const eventOptions = isRealSession ? { session } : {};
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
        eventOptions
      );
    }

    // Update competition status
    competition.status = CompetitionStatus.DRAWN;
    competition.drawnAt = new Date();
    if (isRealSession) {
      await competition.save({ session });
    } else {
      await competition.save();
    }

    // Create event log
    const drawEventOptions = isRealSession ? { session } : {};
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
      drawEventOptions
    );

    logger.info(`Automatic draw completed for competition ${competitionId}`);
  }).catch((error: any) => {
    logger.error(
      `Error running automatic draw for competition ${competitionId}:`,
      error
    );
    throw error;
  });
};
