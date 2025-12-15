import Joi from 'joi';

export const createReviewSchema = Joi.object({
  title: Joi.string().max(120).required(),
  body: Joi.string().max(1000).required(),
  rating: Joi.number().min(1).max(5).required(),
  reviewer: Joi.string().max(80).required(),
  location: Joi.string().max(120).allow('', null),
});

export const createReviewForAdminSchema = Joi.object({
  title: Joi.string().max(120).required().messages({
    'any.required': 'Title is required',
    'string.max': 'Title cannot exceed 120 characters',
  }),
  body: Joi.string().max(1000).required().messages({
    'any.required': 'Body is required',
    'string.max': 'Review cannot exceed 1000 characters',
  }),
  rating: Joi.number().min(1).max(5).required().messages({
    'any.required': 'Rating is required',
    'number.min': 'Rating must be at least 1',
    'number.max': 'Rating cannot exceed 5',
  }),
  reviewer: Joi.string().max(80).required().messages({
    'any.required': 'Reviewer name is required',
    'string.max': 'Reviewer name cannot exceed 80 characters',
  }),
  location: Joi.string().max(120).allow('', null).optional(),
  verified: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
});

export const updateReviewSchema = Joi.object({
  title: Joi.string().max(120),
  body: Joi.string().max(1000),
  rating: Joi.number().min(1).max(5),
  reviewer: Joi.string().max(80),
  location: Joi.string().max(120).allow('', null),
  verified: Joi.boolean(),
  isActive: Joi.boolean(),
});

