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

/**
 * Optional authentication middleware
 * Sets req.user if token is provided, but doesn't throw error if no token
 * Useful for routes that support both authenticated and guest access
 */
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    // Get token from cookie first, then from header as fallback
    token = req.cookies.authToken;
    
    if (!token && req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // If no token, continue without setting req.user (guest access)
    if (!token) {
      return next();
    }

    // Verify token
    const decoded = verifyToken(token);

    // Get user from token
    const user = await User.findById(decoded.id);
    if (!user) {
      // If user not found, continue without setting req.user (guest access)
      return next();
    }

    if (!user.isActive) {
      // If user is deactivated, continue without setting req.user (guest access)
      return next();
    }

    // Set user if token is valid and user is active
    req.user = user;
    next();
  } catch (error) {
    // If token is invalid, continue without setting req.user (guest access)
    next();
  }
};




