import { Request, Response, NextFunction } from 'express';
import { Winner, Competition, Draw } from '../models';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import { getPagination } from '../utils/pagination';

const buildPaginationMeta = (page: number, limit: number, total: number) => ({
  pagination: {
    page,
    limit,
    totalItems: total,
    totalPages: Math.ceil(total / limit) || 1,
  },
});

/**
 * Get public winners list
 * GET /api/v1/winners
 */
export const getWinners = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const competitionId = req.query.competitionId as string | undefined;

    const query: Record<string, any> = {};
    if (competitionId) {
      query.competitionId = competitionId;
    }

    const { skip, limit: pageLimit } = getPagination(page, limit);

    const [winners, total] = await Promise.all([
      Winner.find(query)
        .populate('competitionId', 'title prize images')
        .populate('drawId', 'drawTime drawMethod')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),
      Winner.countDocuments(query),
    ]);

    // Format winners for public display
    const formattedWinners = winners.map((winner: any) => ({
      id: winner._id,
      competition: {
        id: winner.competitionId._id,
        title: winner.competitionId.title,
        prize: winner.competitionId.prize,
        prizeValue: winner.competitionId.prizeValue,
        images: winner.competitionId.images,
      },
      ticketNumber: winner.ticketNumber,
      prize: winner.prize,
      prizeValue: winner.prizeValue,
      claimCode: winner.claimCode,
      drawTime: winner.drawId.drawTime,
      drawMethod: winner.drawId.drawMethod,
      verified: winner.verified,
      publicAnnouncement: winner.publicAnnouncement,
      proofImageUrl: winner.proofImageUrl,
      drawVideoUrl: winner.drawVideoUrl,
      notified: winner.notified,
      claimed: winner.claimed,
      createdAt: winner.createdAt,
    }));

    res.json(
      ApiResponse.success(
        {
          winners: formattedWinners,
        },
        'Winners retrieved successfully',
        {
          pagination: {
            page,
            limit: pageLimit,
            totalItems: total,
            totalPages: Math.ceil(total / pageLimit) || 1,
          },
        }
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get winner by ID
 * GET /api/v1/winners/:id
 */
export const getWinner = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const winner = await Winner.findById(req.params.id)
      .populate('competitionId', 'title prize images prizeValue')
      .populate(
        'drawId',
        'drawTime drawMethod seed algorithm snapshotTicketCount'
      )
      .populate('userId', 'firstName lastName email')
      .populate('ticketId', 'ticketNumber')
      .lean();

    if (!winner) {
      throw new ApiError('Winner not found', 404);
    }

    res.json(
      ApiResponse.success(
        {
          winner,
        },
        'Winner retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's own winners (authenticated user)
 * GET /api/v1/winners/my/list
 */
export const getMyWinners = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const { skip, limit: pageLimit } = getPagination(page, limit);

    const [winners, total] = await Promise.all([
      Winner.find({ userId: req.user._id })
        .populate('competitionId', 'title prize images prizeValue')
        .populate('drawId', 'drawTime drawMethod')
        .populate('ticketId', 'ticketNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),
      Winner.countDocuments({ userId: req.user._id }),
    ]);

    // Format winners for user display
    const formattedWinners = winners.map((winner: any) => ({
      id: winner._id,
      competition: {
        id: winner.competitionId._id,
        title: winner.competitionId.title,
        prize: winner.competitionId.prize,
        prizeValue: winner.competitionId.prizeValue,
        images: winner.competitionId.images,
      },
      ticketNumber: winner.ticketNumber,
      prize: winner.prize,
      prizeValue: winner.prizeValue,
      claimCode: winner.claimCode,
      drawTime: winner.drawId.drawTime,
      drawMethod: winner.drawId.drawMethod,
      notified: winner.notified,
      claimed: winner.claimed,
      claimedAt: winner.claimedAt,
      createdAt: winner.createdAt,
    }));

    res.json(
      ApiResponse.success(
        {
          winners: formattedWinners,
        },
        'My winners retrieved successfully',
        {
          pagination: {
            page,
            limit: pageLimit,
            totalItems: total,
            totalPages: Math.ceil(total / pageLimit) || 1,
          },
        }
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get winners for a competition
 * GET /api/v1/competitions/:id/winners
 */
export const getCompetitionWinners = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const competitionId = req.params.id;

    const competition = await Competition.findById(competitionId);
    if (!competition) {
      throw new ApiError('Competition not found', 404);
    }

    const winners = await Winner.find({ competitionId })
      .populate('userId', 'firstName lastName email')
      .populate('ticketId', 'ticketNumber')
      .populate('drawId', 'drawTime drawMethod evidenceUrl')
      .sort({ createdAt: 1 }) // Primary winner first
      .lean();

    // Get draw information
    const draw = await Draw.findOne({ competitionId })
      .sort({ drawTime: -1 })
      .lean();

    res.json(
      ApiResponse.success(
        {
          competition: {
            id: competition._id,
            title: competition.title,
            prize: competition.prize,
            prizeValue: competition.prizeValue,
            drawnAt: competition.drawnAt,
          },
          draw: draw
            ? {
                id: draw._id,
                drawTime: draw.drawTime,
                drawMethod: draw.drawMethod,
                algorithm: draw.algorithm,
                snapshotTicketCount: draw.snapshotTicketCount,
                evidenceUrl: draw.evidenceUrl,
              }
            : null,
          winners: winners.map((winner: any) => ({
            id: winner._id,
            ticketNumber: winner.ticketNumber,
            claimCode: winner.claimCode,
            notified: winner.notified,
            claimed: winner.claimed,
            proofImageUrl: winner.proofImageUrl,
            drawVideoUrl: winner.drawVideoUrl,
            testimonial: winner.testimonial,
            user: winner.userId
              ? {
                  firstName: winner.userId.firstName,
                  lastName: winner.userId.lastName,
                  email: winner.userId.email,
                }
              : null,
            createdAt: winner.createdAt,
          })),
        },
        'Winners retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get all winners for admin (with filters)
 * GET /api/v1/admin/winners
 */
export const getAllWinnersForAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const { skip, limit: pageLimit } = getPagination(page, limit);

    const filters: Record<string, any> = {};

    // Filter by competition ID
    if (req.query.competitionId) {
      filters.competitionId = req.query.competitionId;
    }

    // Filter by user ID
    if (req.query.userId) {
      filters.userId = req.query.userId;
    }

    // Filter by notified status
    if (req.query.notified !== undefined) {
      filters.notified = req.query.notified === 'true';
    }

    // Filter by claimed status
    if (req.query.claimed !== undefined) {
      filters.claimed = req.query.claimed === 'true';
    }

    // Search by claim code or ticket number
    if (req.query.search) {
      const searchTerm = req.query.search as string;
      const searchFilters: any[] = [
        { claimCode: { $regex: searchTerm, $options: 'i' } },
      ];

      // Only add ticket number filter if it's a valid number
      if (!isNaN(Number(searchTerm))) {
        searchFilters.push({ ticketNumber: Number(searchTerm) });
      }

      filters.$or = searchFilters;
    }

    const [winners, total] = await Promise.all([
      Winner.find(filters)
        .populate('competitionId', 'title prize prizeValue images')
        .populate(
          'drawId',
          'drawTime drawMethod seed algorithm snapshotTicketCount'
        )
        .populate('userId', 'firstName lastName email')
        .populate('ticketId', 'ticketNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),
      Winner.countDocuments(filters),
    ]);

    res.json(
      ApiResponse.success(
        { winners },
        'Winners retrieved successfully',
        buildPaginationMeta(page, pageLimit, total)
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get winner by ID for admin
 * GET /api/v1/admin/winners/:id
 */
export const getWinnerByIdForAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const winner = await Winner.findById(req.params.id)
      .populate('competitionId', 'title prize images prizeValue')
      .populate(
        'drawId',
        'drawTime drawMethod seed algorithm snapshotTicketCount'
      )
      .populate('userId', 'firstName lastName email')
      .populate('ticketId', 'ticketNumber')
      .lean();

    if (!winner) {
      throw new ApiError('Winner not found', 404);
    }

    res.json(ApiResponse.success({ winner }, 'Winner retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Update winner (admin only)
 * PUT /api/v1/admin/winners/:id
 */
export const updateWinnerForAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const winnerId = req.params.id;
    const {
      notified,
      notifiedAt,
      claimed,
      claimedAt,
      proofImageUrl,
      drawVideoUrl,
      testimonial,
    } = req.body;

    const winner = await Winner.findById(winnerId);
    if (!winner) {
      throw new ApiError('Winner not found', 404);
    }

    // Update allowed fields
    if (notified !== undefined) {
      winner.notified = notified;
      if (notified && !notifiedAt) {
        winner.notifiedAt = new Date();
      } else if (notifiedAt) {
        winner.notifiedAt = new Date(notifiedAt);
      }
    }

    if (claimed !== undefined) {
      winner.claimed = claimed;
      if (claimed && !claimedAt) {
        winner.claimedAt = new Date();
      } else if (claimedAt) {
        winner.claimedAt = new Date(claimedAt);
      }
    }

    if (proofImageUrl !== undefined) {
      winner.proofImageUrl = proofImageUrl || null;
    }

    if (drawVideoUrl !== undefined) {
      winner.drawVideoUrl = drawVideoUrl || null;
    }

    if (testimonial !== undefined) {
      if (testimonial === null) {
        winner.testimonial = undefined;
      } else {
        winner.testimonial = {
          text: testimonial.text || winner.testimonial?.text || '',
          rating: testimonial.rating || winner.testimonial?.rating,
          approved:
            testimonial.approved ?? winner.testimonial?.approved ?? false,
        };
      }
    }

    await winner.save();

    // Get updated winner with populated fields
    const updatedWinner = await Winner.findById(winnerId)
      .populate('competitionId', 'title prize images prizeValue')
      .populate(
        'drawId',
        'drawTime drawMethod seed algorithm snapshotTicketCount'
      )
      .populate('userId', 'firstName lastName email')
      .populate('ticketId', 'ticketNumber')
      .lean();

    res.json(
      ApiResponse.success(
        { winner: updatedWinner },
        'Winner updated successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Claim prize (public endpoint with claim code verification)
 * POST /api/v1/winners/:id/claim
 */
export const claimPrize = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const winnerId = req.params.id;
    const { claimCode } = req.body;

    if (!claimCode) {
      throw new ApiError('Claim code is required', 400);
    }

    // Find winner
    const winner = await Winner.findById(winnerId);
    if (!winner) {
      throw new ApiError('Winner not found', 404);
    }

    // Verify claim code (case-insensitive, trimmed)
    const providedCode = String(claimCode).trim().toUpperCase();
    const winnerCode = String(winner.claimCode).trim().toUpperCase();

    if (providedCode !== winnerCode) {
      throw new ApiError('Invalid claim code', 400);
    }

    // Check if already claimed
    if (winner.claimed) {
      throw new ApiError('Prize has already been claimed', 400);
    }

    // Update claimed status
    winner.claimed = true;
    winner.claimedAt = new Date();
    await winner.save();

    // Get updated winner with populated fields
    const updatedWinner = await Winner.findById(winnerId)
      .populate('competitionId', 'title prize images prizeValue')
      .populate('userId', 'firstName lastName email')
      .populate('ticketId', 'ticketNumber')
      .lean();

    res.json(
      ApiResponse.success(
        {
          winner: {
            id: updatedWinner?._id,
            competitionId: updatedWinner?.competitionId,
            ticketNumber: updatedWinner?.ticketNumber,
            prize: updatedWinner?.prize,
            prizeValue: updatedWinner?.prizeValue,
            claimed: updatedWinner?.claimed,
            claimedAt: updatedWinner?.claimedAt,
          },
        },
        'Prize claimed successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Delete winner (admin only)
 * DELETE /api/v1/admin/winners/:id
 */
export const deleteWinnerForAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const winnerId = req.params.id;

    const winner = await Winner.findById(winnerId);
    if (!winner) {
      throw new ApiError('Winner not found', 404);
    }

    await Winner.findByIdAndDelete(winnerId);

    res.json(ApiResponse.success(null, 'Winner deleted successfully'));
  } catch (error) {
    next(error);
  }
};
