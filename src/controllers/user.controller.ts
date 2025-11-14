import { Request, Response, NextFunction } from 'express';
import { Entry, Order, User, Ticket, TicketStatus, Winner } from '../models';
import { OrderStatus, OrderPaymentStatus } from '../models/Order.model';
import { UserRole } from '../models/User.model';
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

export const getMyEntries = async (
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

    const [entries, total] = await Promise.all([
      Entry.find({ userId: req.user._id })
        .populate('competitionId', 'title slug drawDate status ticketPrice')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit),
      Entry.countDocuments({ userId: req.user._id }),
    ]);

    res.json(
      ApiResponse.success(
        {
          entries: entries.map((entry) => ({
            id: entry._id,
            competitionId: entry.competitionId?._id || entry.competitionId,
            competitionTitle:
              (entry.competitionId as any)?.title || undefined,
            ticketNumber: entry.ticketNumber,
            answer: entry.answer,
            isCorrect: entry.isCorrect,
            createdAt: entry.createdAt,
          })),
        },
        'Entries retrieved successfully',
        buildPaginationMeta(page, pageLimit, total)
      )
    );
  } catch (error) {
    next(error);
  }
};

const sanitizeUser = (user: any) => {
  if (!user) {
    return user;
  }

  const plainUser = typeof user.toObject === 'function' ? user.toObject() : user;
  const { password, __v, ...rest } = plainUser;
  return rest;
};

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 25;
    const { skip, limit: pageLimit } = getPagination(page, limit);

    const filters: Record<string, any> = {};
    if (req.query.role) filters.role = req.query.role;
    if (req.query.status === 'active') filters.isActive = true;
    if (req.query.status === 'inactive') filters.isActive = false;

    if (req.query.search) {
      const search = new RegExp(String(req.query.search), 'i');
      filters.$or = [
        { firstName: search },
        { lastName: search },
        { email: search },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit)
        .select('-password'),
      User.countDocuments(filters),
    ]);

    res.json(
      ApiResponse.success(
        { users },
        'Users retrieved successfully',
        buildPaginationMeta(page, pageLimit, total)
      )
    );
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    res.json(ApiResponse.success({ user }, 'User retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const allowedFields = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'role',
      'isVerified',
      'isActive',
      'subscribedToNewsletter',
    ] as const;

    const updates: Record<string, any> = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (updates.role) {
      if (!Object.values(UserRole).includes(updates.role)) {
        throw new ApiError('Invalid role supplied', 422);
      }
    }

    if (updates.email) {
      updates.email = String(updates.email).toLowerCase();
    }

    if (Object.keys(updates).length === 0) {
      throw new ApiError('No updates provided', 400);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    res.json(
      ApiResponse.success(
        { user: sanitizeUser(user) },
        'User updated successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

export const getUserOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      throw new ApiError('Not authorized', 401);
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const { skip, limit: pageLimit } = getPagination(page, limit);

    const [orders, total] = await Promise.all([
      Order.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit),
      Order.countDocuments({ userId }),
    ]);

    res.json(
      ApiResponse.success(
        { orders },
        'Orders retrieved successfully',
        buildPaginationMeta(page, pageLimit, total)
      )
    );
  } catch (error) {
    next(error);
  }
};

export const createUserByAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const payload = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: String(req.body.email).toLowerCase(),
      phone: req.body.phone,
      password: req.body.password,
      role: req.body.role || UserRole.USER,
      isVerified: req.body.isVerified ?? false,
      isActive: req.body.isActive ?? true,
      subscribedToNewsletter: req.body.subscribedToNewsletter ?? false,
    };

    const user = await User.create(payload);

    res.status(201).json(
      ApiResponse.success(
        { user: sanitizeUser(user) },
        'User created successfully'
      )
    );
  } catch (error: any) {
    if (error?.code === 11000) {
      next(new ApiError('A user with this email already exists', 409));
      return;
    }
    next(error);
  }
};

export const deleteUserByAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user?._id?.toString();

    if (currentUserId && currentUserId === targetUserId) {
      throw new ApiError('You cannot delete your own account', 400);
    }

    const user = await User.findByIdAndDelete(targetUserId);

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    res.json(ApiResponse.success(null, 'User deleted successfully'));
  } catch (error) {
    next(error);
  }
};

export const resetUserPasswordByAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await User.findById(req.params.id).select('+password');

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpire = undefined;

    await user.save();

    res.json(
      ApiResponse.success(
        { user: sanitizeUser(user) },
        'User password reset successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

export const toggleUserStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    if (req.body.isActive === undefined) {
      user.isActive = !user.isActive;
    } else {
      user.isActive = Boolean(req.body.isActive);
    }

    await user.save();

    res.json(
      ApiResponse.success(
        {
          user: sanitizeUser(user),
          status: user.isActive ? 'active' : 'inactive',
        },
        'User status updated successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get user profile with statistics
 * GET /api/v1/users/me/profile
 */
export const getUserProfileWithStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const userId = req.user._id;

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError('User not found', 404);
    }

    // Get statistics in parallel
    const [
      totalEntries,
      totalSpentResult,
      wins,
      activeTickets,
      competitionsEntered,
    ] = await Promise.all([
      // Total entries (tickets)
      Ticket.countDocuments({
        userId,
        status: { $in: [TicketStatus.ACTIVE, TicketStatus.WINNER] },
      }),
      // Total spent (from paid orders)
      Order.aggregate([
        {
          $match: {
            userId,
            paymentStatus: OrderPaymentStatus.PAID,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amountPence' },
          },
        },
      ]),
      // Wins (from Winner model)
      Winner.countDocuments({ userId }),
      // Active entries (tickets in live competitions)
      Ticket.countDocuments({
        userId,
        status: TicketStatus.ACTIVE,
      }),
      // Competitions entered (distinct competition IDs)
      Ticket.distinct('competitionId', {
        userId,
        status: { $in: [TicketStatus.ACTIVE, TicketStatus.WINNER] },
      }),
    ]);

    const totalSpentPence = totalSpentResult[0]?.total || 0;
    const totalSpent = totalSpentPence / 100;

    res.json(
      ApiResponse.success(
        {
          user: sanitizeUser(user),
          stats: {
            totalEntries,
            totalSpent: parseFloat(totalSpent.toFixed(2)),
            wins,
            activeEntries: activeTickets,
            competitionsEntered: competitionsEntered.length,
          },
        },
        'Profile with statistics retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's tickets
 * GET /api/v1/users/me/tickets
 */
export const getMyTickets = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const userId = req.user._id;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const { skip, limit: pageLimit } = getPagination(page, limit);

    const query: any = {
      userId,
      status: { $in: [TicketStatus.ACTIVE, TicketStatus.WINNER] },
    };

    if (req.query.competitionId) {
      query.competitionId = req.query.competitionId;
    }

    const [tickets, total] = await Promise.all([
      Ticket.find(query)
        .populate('competitionId', 'title prize images drawAt status')
        .populate('orderId', 'orderNumber paymentStatus')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),
      Ticket.countDocuments(query),
    ]);

    // Group by competition
    const ticketsByCompetition = tickets.reduce((acc: any, ticket: any) => {
      const compId = ticket.competitionId?._id?.toString() || 'unknown';
      if (!acc[compId]) {
        acc[compId] = {
          competition: ticket.competitionId || null,
          tickets: [],
        };
      }
      acc[compId].tickets.push({
        id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        orderNumber: ticket.orderId?.orderNumber,
        paymentStatus: ticket.orderId?.paymentStatus,
        createdAt: ticket.createdAt,
      });
      return acc;
    }, {});

    res.json(
      ApiResponse.success(
        {
          tickets: Object.values(ticketsByCompetition),
        },
        'Tickets retrieved successfully',
        buildPaginationMeta(page, pageLimit, total)
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's orders grouped by status
 * GET /api/v1/users/me/orders/grouped
 */
export const getMyOrdersGrouped = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const userId = req.user._id;

    // Get all orders
    const orders = await Order.find({ userId })
      .populate('competitionId', 'title prize images')
      .sort({ createdAt: -1 })
      .lean();

    // Group orders
    const grouped = {
      pending: {
        paid: [] as any[],
        unpaid: [] as any[],
      },
      completed: {
        paid: [] as any[],
        unpaid: [] as any[],
      },
      failed: [] as any[],
      refunded: [] as any[],
    };

    orders.forEach((order: any) => {
      const orderFormatted = {
        id: order._id,
        orderNumber: order.orderNumber,
        competitionId: order.competitionId?._id || order.competitionId,
        competition: order.competitionId,
        amountPence: order.amountPence,
        amountGBP: (order.amountPence / 100).toFixed(2),
        quantity: order.quantity,
        status: order.status,
        paymentStatus: order.paymentStatus,
        ticketsReserved: order.ticketsReserved,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      };

      if (order.status === OrderStatus.PENDING) {
        if (order.paymentStatus === OrderPaymentStatus.PAID) {
          grouped.pending.paid.push(orderFormatted);
        } else {
          grouped.pending.unpaid.push(orderFormatted);
        }
      } else if (order.status === OrderStatus.COMPLETED) {
        if (order.paymentStatus === OrderPaymentStatus.PAID) {
          grouped.completed.paid.push(orderFormatted);
        } else {
          grouped.completed.unpaid.push(orderFormatted);
        }
      } else if (order.status === OrderStatus.FAILED) {
        grouped.failed.push(orderFormatted);
      } else if (order.status === OrderStatus.REFUNDED) {
        grouped.refunded.push(orderFormatted);
      }
    });

    res.json(
      ApiResponse.success(
        {
          orders: grouped,
          summary: {
            total: orders.length,
            pending: {
              total: grouped.pending.paid.length + grouped.pending.unpaid.length,
              paid: grouped.pending.paid.length,
              unpaid: grouped.pending.unpaid.length,
            },
            completed: {
              total: grouped.completed.paid.length + grouped.completed.unpaid.length,
              paid: grouped.completed.paid.length,
              unpaid: grouped.completed.unpaid.length,
            },
            failed: grouped.failed.length,
            refunded: grouped.refunded.length,
          },
        },
        'Orders retrieved and grouped successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

