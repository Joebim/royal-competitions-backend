import { Request, Response, NextFunction } from 'express';
import { Event, EventType } from '../models';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import { getPagination } from '../utils/pagination';

/**
 * Format activity for response
 */
const formatActivity = (event: any) => {
  const activity: any = {
    id: event._id,
    type: event.type,
    entity: event.entity,
    entityId: event.entityId,
    timestamp: event.createdAt,
    payload: event.payload,
  };

  // Add user information if available
  if (event.userId) {
    activity.user = event.userId
      ? {
          id: event.userId._id,
          name: event.userId.firstName && event.userId.lastName
            ? `${event.userId.firstName} ${event.userId.lastName}`
            : event.userId.email || 'Unknown',
          email: event.userId.email,
        }
      : null;
  }

  // Add competition information if available
  if (event.competitionId) {
    activity.competition = event.competitionId
      ? {
          id: event.competitionId._id,
          title: event.competitionId.title,
          prize: event.competitionId.prize,
        }
      : null;
  }

  // Generate human-readable description based on event type
  activity.description = generateActivityDescription(event);

  return activity;
};

/**
 * Generate human-readable description for activity
 */
const generateActivityDescription = (event: any): string => {
  const userName = event.userId
    ? event.userId.firstName && event.userId.lastName
      ? `${event.userId.firstName} ${event.userId.lastName}`
      : event.userId.email || 'User'
    : 'Guest';

  const competitionTitle = event.competitionId?.title || 'Competition';

  switch (event.type) {
    case EventType.TICKET_RESERVED:
      return `${userName} reserved ${event.payload?.qty || 1} ticket(s) for ${competitionTitle}`;
    case EventType.TICKET_ISSUED:
      return `${userName} purchased ${event.payload?.qty || 1} ticket(s) for ${competitionTitle}`;
    case EventType.TICKET_CANCELLED:
      return `Ticket ${event.payload?.ticketNumber || ''} cancelled for ${competitionTitle}`;
    case EventType.ORDER_CREATED:
      return `Order created for ${competitionTitle} by ${userName}`;
    case EventType.ORDER_PAID:
      const amount = event.payload?.amount || (event.payload?.amountPence ? event.payload.amountPence / 100 : 0);
      return `Order paid for ${competitionTitle} by ${userName} - £${amount.toFixed(2)}`;
    case EventType.ORDER_FAILED:
      return `Order payment failed for ${competitionTitle} by ${userName}`;
    case EventType.ORDER_REFUNDED:
      return `Order refunded for ${competitionTitle} by ${userName}`;
    case EventType.DRAW_CREATED:
      return `Draw completed for ${competitionTitle} (${event.payload?.drawMethod || 'unknown'} method)`;
    case EventType.WINNER_SELECTED:
      return `Winner selected for ${competitionTitle} - Ticket #${event.payload?.ticketNumber || ''}`;
    case EventType.WINNER_NOTIFIED:
      return `Winner notified for ${competitionTitle}`;
    case EventType.WINNER_CLAIMED:
      return `Prize claimed for ${competitionTitle}`;
    case EventType.COMPETITION_CLOSED:
      return `${competitionTitle} closed`;
    case EventType.COMPETITION_DRAWN:
      return `${competitionTitle} drawn`;
    default:
      return `Activity: ${event.type}`;
  }
};

/**
 * @desc    Get all activities (Admin)
 * @route   GET /api/v1/admin/activities
 * @access  Private/Admin
 */
export const getAllActivities = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const { skip, limit: pageLimit } = getPagination(page, limit);

    // Build query filters
    const query: any = {};

    // Filter by type
    if (req.query.type) {
      const types = Array.isArray(req.query.type)
        ? req.query.type
        : [req.query.type];
      query.type = { $in: types };
    }

    // Filter by entity
    if (req.query.entity) {
      query.entity = req.query.entity;
    }

    // Filter by entityId
    if (req.query.entityId) {
      query.entityId = req.query.entityId;
    }

    // Filter by userId
    if (req.query.userId) {
      query.userId = req.query.userId;
    }

    // Filter by competitionId
    if (req.query.competitionId) {
      query.competitionId = req.query.competitionId;
    }

    // Date range filters
    if (req.query.from || req.query.to) {
      query.createdAt = {};
      if (req.query.from) {
        query.createdAt.$gte = new Date(req.query.from as string);
      }
      if (req.query.to) {
        query.createdAt.$lte = new Date(req.query.to as string);
      }
    }

    const [events, total] = await Promise.all([
      Event.find(query)
        .populate('userId', 'firstName lastName email')
        .populate('competitionId', 'title prize')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),
      Event.countDocuments(query),
    ]);

    const activities = events.map(formatActivity);

    res.json(
      ApiResponse.success(
        {
          activities,
          pagination: {
            page,
            limit: pageLimit,
            totalItems: total,
            totalPages: Math.ceil(total / pageLimit) || 1,
          },
        },
        'Activities retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get recent activities for dashboard
 * @route   GET /api/v1/admin/activities/recent
 * @access  Private/Admin
 */
export const getRecentActivities = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const types = req.query.types
      ? (Array.isArray(req.query.types)
          ? req.query.types
          : [req.query.types])
      : undefined;

    const query: any = {};
    if (types && types.length > 0) {
      query.type = { $in: types };
    }

    const events = await Event.find(query)
      .populate('userId', 'firstName lastName email')
      .populate('competitionId', 'title prize')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const activities = events.map(formatActivity);

    res.json(
      ApiResponse.success(
        {
          activities,
          total: activities.length,
        },
        'Recent activities retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get activities by type
 * @route   GET /api/v1/admin/activities/type/:type
 * @access  Private/Admin
 */
export const getActivitiesByType = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { type } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const { skip, limit: pageLimit } = getPagination(page, limit);

    // Validate event type
    if (!Object.values(EventType).includes(type as EventType)) {
      throw new ApiError(`Invalid event type: ${type}`, 400);
    }

    const [events, total] = await Promise.all([
      Event.find({ type })
        .populate('userId', 'firstName lastName email')
        .populate('competitionId', 'title prize')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),
      Event.countDocuments({ type }),
    ]);

    const activities = events.map(formatActivity);

    res.json(
      ApiResponse.success(
        {
          activities,
          type,
          pagination: {
            page,
            limit: pageLimit,
            totalItems: total,
            totalPages: Math.ceil(total / pageLimit) || 1,
          },
        },
        'Activities retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get activities by entity
 * @route   GET /api/v1/admin/activities/entity/:entity/:entityId
 * @access  Private/Admin
 */
export const getActivitiesByEntity = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { entity, entityId } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const { skip, limit: pageLimit } = getPagination(page, limit);

    const [events, total] = await Promise.all([
      Event.find({
        entity,
        entityId,
      })
        .populate('userId', 'firstName lastName email')
        .populate('competitionId', 'title prize')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),
      Event.countDocuments({
        entity,
        entityId,
      }),
    ]);

    const activities = events.map(formatActivity);

    res.json(
      ApiResponse.success(
        {
          activities,
          entity,
          entityId,
          pagination: {
            page,
            limit: pageLimit,
            totalItems: total,
            totalPages: Math.ceil(total / pageLimit) || 1,
          },
        },
        'Activities retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get activities by user
 * @route   GET /api/v1/admin/activities/user/:userId
 * @access  Private/Admin
 */
export const getActivitiesByUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const { skip, limit: pageLimit } = getPagination(page, limit);

    const [events, total] = await Promise.all([
      Event.find({ userId })
        .populate('userId', 'firstName lastName email')
        .populate('competitionId', 'title prize')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),
      Event.countDocuments({ userId }),
    ]);

    const activities = events.map(formatActivity);

    res.json(
      ApiResponse.success(
        {
          activities,
          userId,
          pagination: {
            page,
            limit: pageLimit,
            totalItems: total,
            totalPages: Math.ceil(total / pageLimit) || 1,
          },
        },
        'User activities retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get activities by competition
 * @route   GET /api/v1/admin/activities/competition/:competitionId
 * @access  Private/Admin
 */
export const getActivitiesByCompetition = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { competitionId } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const { skip, limit: pageLimit } = getPagination(page, limit);

    const [events, total] = await Promise.all([
      Event.find({ competitionId })
        .populate('userId', 'firstName lastName email')
        .populate('competitionId', 'title prize')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),
      Event.countDocuments({ competitionId }),
    ]);

    const activities = events.map(formatActivity);

    res.json(
      ApiResponse.success(
        {
          activities,
          competitionId,
          pagination: {
            page,
            limit: pageLimit,
            totalItems: total,
            totalPages: Math.ceil(total / pageLimit) || 1,
          },
        },
        'Competition activities retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get activity statistics
 * @route   GET /api/v1/admin/activities/stats
 * @access  Private/Admin
 */
export const getActivityStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const [totalActivities, activitiesByType, recentActivityCount] =
      await Promise.all([
        Event.countDocuments({}),
        Event.aggregate([
          {
            $group: {
              _id: '$type',
              count: { $sum: 1 },
            },
          },
          {
            $sort: { count: -1 },
          },
        ]),
        Event.countDocuments({
          createdAt: {
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        }),
      ]);

    const stats = {
      total: totalActivities,
      last24Hours: recentActivityCount,
      byType: activitiesByType.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };

    res.json(
      ApiResponse.success(
        {
          stats,
        },
        'Activity statistics retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

