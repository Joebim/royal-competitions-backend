import Joi from 'joi';

export const subscribeSchema = Joi.object({
  email: Joi.string().email().required(),
  firstName: Joi.string().min(2).max(50),
  lastName: Joi.string().min(2).max(50),
  source: Joi.string().valid('website', 'checkout', 'admin'),
});

export const unsubscribeSchema = Joi.object({
  email: Joi.string().email().required(),
});




