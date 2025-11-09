import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { User, UserRole } from '../models';
import { ApiError } from '../utils/apiError';

export const protect = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    // Get token from cookie first, then from header as fallback
    token = req.cookies.authToken;
    
    if (!token && req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new ApiError('Not authorized to access this route', 401);
    }

    // Verify token
    const decoded = verifyToken(token);

    // Get user from token
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new ApiError('User not found', 404);
    }

    if (!user.isActive) {
      throw new ApiError('Account is deactivated', 403);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const adminOnly = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user || (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPER_ADMIN)) {
    return next(new ApiError('Admin access required', 403));
  }
  next();
};

export const superAdminOnly = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== UserRole.SUPER_ADMIN) {
    return next(new ApiError('Super admin access required', 403));
  }
  next();
};




