import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';
import { UserRole } from '../models/User.model';

export const adminOnly = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== UserRole.ADMIN) {
    return next(new ApiError('Access denied. Admin only.', 403));
  }
  next();
};




