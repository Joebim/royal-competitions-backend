import Joi from 'joi';

export const createDrawSchema = Joi.object({
  competitionId: Joi.string().required().messages({
    'any.required': 'Competition ID is required',
  }),
  winnerId: Joi.string().required().messages({
    'any.required': 'Winner ID is required',
  }),
  winnerName: Joi.string().required().trim().messages({
    'any.required': 'Winner name is required',
  }),
  winnerLocation: Joi.string().required().trim().messages({
    'any.required': 'Winner location is required',
  }),
  totalTickets: Joi.number().integer().min(1).required().messages({
    'any.required': 'Total tickets is required',
    'number.min': 'Total tickets must be at least 1',
  }),
  winningTicketNumber: Joi.number().integer().min(1).required().messages({
    'any.required': 'Winning ticket number is required',
    'number.min': 'Winning ticket number must be at least 1',
  }),
  drawDate: Joi.date().optional(),
  imageUrl: Joi.string().uri().optional(),
  publicId: Joi.string().optional(),
});

export const updateDrawSchema = Joi.object({
  winnerName: Joi.string().trim().optional(),
  winnerLocation: Joi.string().trim().optional(),
  drawDate: Joi.date().optional(),
  totalTickets: Joi.number().integer().min(1).optional(),
  winningTicketNumber: Joi.number().integer().min(1).optional(),
  imageUrl: Joi.string().uri().optional(),
  publicId: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
});
