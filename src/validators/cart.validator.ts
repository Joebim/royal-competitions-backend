import Joi from 'joi';

export const addCartItemSchema = Joi.object({
  competitionId: Joi.string().required(),
  quantity: Joi.number().integer().min(1).max(20).required(),
});

export const updateCartItemSchema = Joi.object({
  quantity: Joi.number().integer().min(1).max(20).required(),
});


