import { Request, Response, NextFunction } from 'express';
import { ObjectSchema } from 'joi';
import { ApiError } from '../utils/apiError';

/**
 * Parse JSON strings in FormData fields that should be objects/arrays
 * This is needed because FormData sends everything as strings
 */
const parseFormDataJsonFields = (body: any): any => {
  const parsed = { ...body };

  // Fields that should be parsed as JSON if they're strings
  const jsonFields = [
    'question',
    'specifications',
    'features',
    'included',
    'tags',
    'freeEntryDetails', // NEW: complex object for free entry/postal details
  ];

  jsonFields.forEach((field) => {
    if (
      parsed[field] &&
      typeof parsed[field] === 'string' &&
      parsed[field].trim()
    ) {
      try {
        const parsedValue = JSON.parse(parsed[field]);
        parsed[field] = parsedValue;
      } catch (e) {
        // If parsing fails, leave as is (will be validated by schema)
        // This allows for comma-separated strings for arrays
      }
    }
  });

  return parsed;
};

export const validate = (schema: ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    // Parse JSON strings in FormData before validation
    const parsedBody = parseFormDataJsonFields(req.body);

    const { error, value } = schema.validate(parsedBody, {
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
