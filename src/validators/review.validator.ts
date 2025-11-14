import Joi from 'joi';

export const createReviewSchema = Joi.object({
  title: Joi.string().max(120).required(),
  body: Joi.string().max(1000).required(),
  rating: Joi.number().min(1).max(5).required(),
  reviewer: Joi.string().max(80).required(),
  location: Joi.string().max(120).allow('', null),
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

