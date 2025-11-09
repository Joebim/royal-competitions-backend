import { Request, Response, NextFunction } from 'express';
import { Draw, Competition } from '../models';
import { CompetitionStatus } from '../models/Competition.model';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import { getPagination } from '../utils/pagination';

/**
 * @swagger
 * /api/v1/draws:
 *   get:
 *     summary: Get all draws
 *     tags: [Draws]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: competitionId
 *         schema:
 *           type: string
 *       - in: query
 *         name: winnerId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Draws retrieved successfully
 */
export const getDraws = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = 1, limit = 10, competitionId, winnerId, includeInactive } =
      req.query;

    const query: Record<string, any> = {};

    const includeInactiveFlag =
      ['true', '1'].includes(String(includeInactive).toLowerCase()) ||
      (req.user &&
        (req.user.role === 'admin' || req.user.role === 'super_admin'));

    if (!includeInactiveFlag) {
      query.isActive = true;
    }

    if (competitionId) query.competitionId = competitionId;
    if (winnerId) query.winnerId = winnerId;

    const pageNumber = Number(page) || 1;
    const pageSize = Number(limit) || 10;
    const { skip, limit: pageLimit } = getPagination(pageNumber, pageSize);

    const [draws, total] = await Promise.all([
      Draw.find(query)
        .populate('competitionId', 'title category')
        .populate('winnerId', 'firstName lastName email')
        .sort({ drawnAt: -1 })
        .skip(skip)
        .limit(pageLimit),
      Draw.countDocuments(query),
    ]);

    res.json(
      ApiResponse.success(
        { draws },
        'Draws retrieved successfully',
        {
          pagination: {
            page: pageNumber,
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
 * @swagger
 * /api/v1/draws/{id}:
 *   get:
 *     summary: Get single draw by ID
 *     tags: [Draws]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Draw retrieved successfully
 *       404:
 *         description: Draw not found
 */
export const getDraw = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const draw = await Draw.findById(req.params.id)
      .populate('competitionId')
      .populate('winnerId', 'firstName lastName email phone');

    if (!draw) {
      throw new ApiError('Draw not found', 404);
    }

    res.json(ApiResponse.success({ draw }, 'Draw retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/draws:
 *   post:
 *     summary: Create a new draw (Admin only)
 *     tags: [Draws]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - competitionId
 *               - winnerId
 *               - winnerName
 *               - winnerLocation
 *               - totalTickets
 *               - winningTicketNumber
 *             properties:
 *               competitionId:
 *                 type: string
 *               winnerId:
 *                 type: string
 *               winnerName:
 *                 type: string
 *               winnerLocation:
 *                 type: string
 *               totalTickets:
 *                 type: integer
 *               winningTicketNumber:
 *                 type: integer
 *               drawDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Draw created successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Competition not found
 */
export const createDraw = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      competitionId,
      winnerId,
      winnerName,
      winnerLocation,
      totalTickets,
      winningTicketNumber,
      drawDate,
    } = req.body;

    // Verify competition exists
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      throw new ApiError('Competition not found', 404);
    }

    // Validate winning ticket number
    if (winningTicketNumber > totalTickets || winningTicketNumber < 1) {
      throw new ApiError('Invalid winning ticket number', 400);
    }

    const drawData = {
      competitionId,
      competitionTitle: competition.title,
      prizeName: competition.prize,
      prizeValue: competition.prizeValue,
      winnerId,
      winnerName,
      winnerLocation,
      drawDate: drawDate || new Date(),
      drawnAt: new Date(),
      totalTickets,
      winningTicketNumber,
      ...(req.body.imageUrl && { imageUrl: req.body.imageUrl }),
      ...(req.body.publicId && { publicId: req.body.publicId }),
    };

    const draw = await Draw.create(drawData);

    // Update competition status to completed
    competition.status = CompetitionStatus.COMPLETED;
    competition.drawnAt = new Date();
    competition.winnerId = winnerId;
    await competition.save();

    res.status(201).json(
      ApiResponse.success({ draw }, 'Draw created successfully')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/draws/{id}:
 *   put:
 *     summary: Update a draw (Admin only)
 *     tags: [Draws]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Draw updated successfully
 *       404:
 *         description: Draw not found
 */
export const updateDraw = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const draw = await Draw.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('competitionId')
      .populate('winnerId');

    if (!draw) {
      throw new ApiError('Draw not found', 404);
    }

    res.json(ApiResponse.success({ draw }, 'Draw updated successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/draws/{id}:
 *   delete:
 *     summary: Delete a draw (Admin only)
 *     tags: [Draws]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Draw deleted successfully
 *       404:
 *         description: Draw not found
 */
export const deleteDraw = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const draw = await Draw.findById(req.params.id);

    if (!draw) {
      throw new ApiError('Draw not found', 404);
    }

    // Soft delete
    draw.isActive = false;
    await draw.save();

    res.json(ApiResponse.success(null, 'Draw deleted successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/draws/recent:
 *   get:
 *     summary: Get recent draws
 *     tags: [Draws]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 4
 *     responses:
 *       200:
 *         description: Recent draws retrieved successfully
 */
export const getRecentDraws = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const limit = Number(req.query.limit) || 4;

    const draws = await Draw.find({ isActive: true })
      .populate('winnerId', 'firstName lastName')
      .sort({ drawnAt: -1 })
      .limit(limit)
      .select('winnerName winnerLocation prizeName drawDate drawnAt totalTickets winningTicketNumber imageUrl');

    res.json(ApiResponse.success({ draws }, 'Recent draws retrieved'));
  } catch (error) {
    next(error);
  }
};
