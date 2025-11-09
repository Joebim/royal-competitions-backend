import { Request, Response, NextFunction } from 'express';
import { ObjectSchema } from 'joi';
import { ApiError } from '../utils/apiError';

export const validate = (schema: ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.reduce<Record<string, string[]>>(
        (acc, detail) => {
          const path = detail.path.join('.') || 'body';
          if (!acc[path]) {
            acc[path] = [];
          }
          acc[path].push(detail.message.replace(/["]/g, ''));
          return acc;
        },
        {}
      );
      throw new ApiError('Validation failed', 422, true, errors);
    }

    req.body = value;
    next();
  };
};




