import Joi from 'joi';

export const createChampionSchema = Joi.object({
  drawId: Joi.string().required().messages({
    'any.required': 'Draw ID is required',
  }),
  winnerName: Joi.string().trim().max(100).optional(),
  winnerLocation: Joi.string().trim().max(100).optional(),
  testimonial: Joi.string().trim().max(1000).required().messages({
    'any.required': 'Testimonial is required',
    'string.max': 'Testimonial cannot exceed 1000 characters',
  }),
  prizeValue: Joi.string().trim().optional(),
  featured: Joi.boolean().optional(),
});

export const updateChampionSchema = Joi.object({
  winnerName: Joi.string().trim().max(100).optional(),
  winnerLocation: Joi.string().trim().max(100).optional(),
  prizeName: Joi.string().trim().max(200).optional(),
  prizeValue: Joi.string().trim().optional(),
  testimonial: Joi.string().trim().max(1000).optional(),
  featured: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
});
