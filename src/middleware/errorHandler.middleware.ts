import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';
import logger from '../utils/logger';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error(err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    error = new ApiError('Resource not found', 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    error = new ApiError('Duplicate field value entered', 409);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const fieldErrors = Object.values(err.errors).reduce(
      (acc: Record<string, string[]>, val: any) => {
        const path = val.path || val.properties?.path || 'unknown';
        if (!acc[path]) {
          acc[path] = [];
        }
        acc[path].push(val.message);
        return acc;
      },
      {}
    );
    error = new ApiError('Validation failed', 422, true, fieldErrors);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new ApiError('Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    error = new ApiError('Token expired', 401);
  }

  const statusCode = (error as ApiError).statusCode || 500;
  const responsePayload: Record<string, any> = {
    success: false,
    message: (error as ApiError).message || 'Something went wrong',
  };

  if ((error as ApiError).errors) {
    responsePayload.errors = (error as ApiError).errors;
  }

  if (process.env.NODE_ENV === 'development') {
    responsePayload.stack = err.stack;
  }

  res.status(statusCode).json(responsePayload);
};




