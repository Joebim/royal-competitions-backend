import { Request, Response, NextFunction } from 'express';
import {
  Entry,
  Competition,
  Order,
  Ticket,
  User,
  TicketStatus,
} from '../models';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import { getPagination } from '../utils/pagination';
import klaviyoService from '../services/klaviyo.service';
import logger from '../utils/logger';

/**
 * @desc    Start competition entry (track when user begins entry process)
 * @route   POST /api/v1/entries/start
 * @access  Private
 *
 * This endpoint tracks "Started Competition Entry" event in Klaviyo.
 * Called when user views the competition question page or begins the entry process.
 */
export const startEntry = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const { competitionId, orderId, ticketNumber } = req.body;

    // Validate required fields
    if (!competitionId) {
      throw new ApiError('Competition ID is required', 400);
    }

    // Get competition
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      throw new ApiError('Competition not found', 404);
    }

    // Get user
    const user = await User.findById(req.user._id);
    if (!user) {
      throw new ApiError('User not found', 404);
    }

    // Verify order and ticket if provided
    if (orderId) {
      const order = await Order.findOne({
        _id: orderId,
        userId: req.user._id,
      });
      if (!order) {
        throw new ApiError('Order not found or not authorized', 404);
      }
    }

    if (ticketNumber) {
      const ticket = await Ticket.findOne({
        ticketNumber,
        competitionId,
        userId: req.user._id,
        status: TicketStatus.ACTIVE,
      });
      if (!ticket) {
        throw new ApiError('Ticket not found or not active', 404);
      }
    }

    // Track "Started Competition Entry" event in Klaviyo
    try {
      await klaviyoService.trackEvent(user.email, 'Started Competition Entry', {
        competition_id: String(competitionId),
        competition_name: competition.title,
        order_id: orderId ? String(orderId) : undefined,
        ticket_number: ticketNumber || undefined,
      });
      logger.info(
        `Started Competition Entry event tracked for user ${user.email} - competition: ${competitionId}`
      );
    } catch (error: any) {
      logger.error('Error tracking Started Competition Entry event:', error);
      // Don't fail the request if Klaviyo fails
    }

    res.json(
      ApiResponse.success(
        {
          competitionId,
          competitionName: competition.title,
          hasQuestion: !!competition.question,
          question: competition.question?.question,
          answerOptions:
            competition.question?.answerOptions ||
            competition.question?.options,
        },
        'Entry process started'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit competition entry (create entry with answer)
 * @route   POST /api/v1/entries/submit
 * @access  Private
 *
 * This endpoint creates an Entry record and tracks "Submitted Competition Entry" event in Klaviyo.
 */
export const submitEntry = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const { competitionId, orderId, ticketNumber, answer } = req.body;

    // Validate required fields
    if (!competitionId) {
      throw new ApiError('Competition ID is required', 400);
    }
    if (!orderId) {
      throw new ApiError('Order ID is required', 400);
    }
    if (!ticketNumber) {
      throw new ApiError('Ticket number is required', 400);
    }
    if (!answer) {
      throw new ApiError('Answer is required', 400);
    }

    // Get competition
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      throw new ApiError('Competition not found', 404);
    }

    // Get order and verify ownership
    const order = await Order.findOne({
      _id: orderId,
      userId: req.user._id,
    });
    if (!order) {
      throw new ApiError('Order not found or not authorized', 404);
    }

    // Verify ticket exists and belongs to user
    const ticket = await Ticket.findOne({
      ticketNumber,
      competitionId,
      userId: req.user._id,
      orderId: order._id,
      status: TicketStatus.ACTIVE,
    });
    if (!ticket) {
      throw new ApiError('Ticket not found or not active', 404);
    }

    // Check if entry already exists for this ticket
    const existingEntry = await Entry.findOne({
      ticketNumber: String(ticketNumber),
      competitionId,
      userId: req.user._id,
    });
    if (existingEntry) {
      throw new ApiError('Entry already submitted for this ticket', 400);
    }

    // Validate answer if competition has a question
    let isCorrect = true; // Default to true if no question
    if (competition.question && competition.question.correctAnswer) {
      const submittedAnswer = answer.trim().toLowerCase();
      const correctAnswer = competition.question.correctAnswer
        .trim()
        .toLowerCase();
      isCorrect = submittedAnswer === correctAnswer;
    }

    // Create entry
    const entry = await Entry.create({
      userId: req.user._id,
      competitionId,
      orderId: order._id,
      ticketNumber: String(ticketNumber),
      answer: answer.trim(),
      isCorrect,
    });

    // Update ticket validity based on answer correctness
    // If answer is incorrect, mark ticket as invalid (won't be included in draws)
    if (!isCorrect) {
      await Ticket.updateOne(
        {
          ticketNumber,
          competitionId,
          userId: req.user._id,
          orderId: order._id,
        },
        {
          $set: {
            isValid: false,
          },
        }
      );
      logger.info(
        `Marked ticket ${ticketNumber} as invalid for competition ${competitionId} due to incorrect answer`
      );
    }

    // Get user for Klaviyo
    const user = await User.findById(req.user._id);
    if (!user) {
      throw new ApiError('User not found', 404);
    }

    // Track "Submitted Competition Entry" event in Klaviyo
    try {
      await klaviyoService.trackEvent(
        user.email,
        'Submitted Competition Entry',
        {
          competition_id: String(competitionId),
          competition_name: competition.title,
          order_id: String(orderId),
          ticket_number: String(ticketNumber),
          is_correct: isCorrect,
          entry_id: String(entry._id),
        }
      );
      logger.info(
        `Submitted Competition Entry event tracked for user ${user.email} - competition: ${competitionId}, ticket: ${ticketNumber}`
      );
    } catch (error: any) {
      logger.error('Error tracking Submitted Competition Entry event:', error);
      // Don't fail the request if Klaviyo fails
    }

    res.json(
      ApiResponse.success(
        {
          entry: {
            id: entry._id,
            competitionId: entry.competitionId,
            orderId: entry.orderId,
            ticketNumber: entry.ticketNumber,
            isCorrect: entry.isCorrect,
            createdAt: entry.createdAt,
          },
          isCorrect,
          message: isCorrect
            ? 'Entry submitted successfully! Your answer is correct.'
            : 'Entry submitted successfully! However, your answer is incorrect.',
        },
        'Entry submitted successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's entries for a competition
 * @route   GET /api/v1/entries/competition/:competitionId
 * @access  Private
 */
export const getMyEntries = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const { competitionId } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const { skip, limit: pageLimit } = getPagination(page, limit);

    // Verify competition exists
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      throw new ApiError('Competition not found', 404);
    }

    const [entries, total] = await Promise.all([
      Entry.find({
        userId: req.user._id,
        competitionId,
      })
        .populate('orderId', 'orderNumber amount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit),
      Entry.countDocuments({
        userId: req.user._id,
        competitionId,
      }),
    ]);

    res.json(
      ApiResponse.success(
        {
          entries: entries.map((entry) => ({
            id: entry._id,
            competitionId: entry.competitionId,
            orderId: entry.orderId,
            ticketNumber: entry.ticketNumber,
            answer: entry.answer,
            isCorrect: entry.isCorrect,
            isWinner: entry.isWinner,
            createdAt: entry.createdAt,
          })),
        },
        'Entries retrieved successfully',
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
 * @desc    Get all entries for a competition (admin)
 * @route   GET /api/v1/admin/entries/competition/:competitionId
 * @access  Private/Admin
 */
export const getCompetitionEntries = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const { competitionId } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const { skip, limit: pageLimit } = getPagination(page, limit);

    // Verify competition exists
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      throw new ApiError('Competition not found', 404);
    }

    // Query entries for this competition
    // Note: Entries are only created when users submit answers to competition questions
    // If no entries exist, this will return an empty array (which is correct)
    const [entries, total] = await Promise.all([
      Entry.find({ competitionId })
        .populate('userId', 'firstName lastName email')
        .populate('orderId', 'orderNumber amount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),
      Entry.countDocuments({ competitionId }),
    ]);

    logger.info(
      `Admin entries query for competition ${competitionId}: found ${total} entries`
    );

    // Format entries with proper population
    const formattedEntries = entries.map((entry: any) => ({
      id: entry._id,
      userId: entry.userId
        ? {
            id: entry.userId._id,
            firstName: entry.userId.firstName,
            lastName: entry.userId.lastName,
            email: entry.userId.email,
          }
        : null,
      competitionId: entry.competitionId,
      orderId: entry.orderId
        ? {
            id: entry.orderId._id,
            orderNumber: entry.orderId.orderNumber,
            amount: entry.orderId.amount,
          }
        : null,
      ticketNumber: entry.ticketNumber,
      answer: entry.answer,
      isCorrect: entry.isCorrect,
      isWinner: entry.isWinner,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    }));

    res.json(
      ApiResponse.success(
        {
          competition: {
            id: competition._id,
            title: competition.title,
          },
          entries: formattedEntries,
        },
        'Entries retrieved successfully',
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
