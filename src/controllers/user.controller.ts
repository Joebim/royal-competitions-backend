import { Request, Response, NextFunction } from 'express';
import { Entry, Order, User } from '../models';
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

