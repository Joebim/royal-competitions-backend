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
  drawTime: Joi.date().optional(),
  notes: Joi.string().trim().max(1000).allow('', null).optional(),
  evidenceUrl: Joi.string().uri().trim().allow('', null).optional(),
  liveUrl: Joi.string().uri().trim().allow('', null).optional(),
  urlType: Joi.string()
    .valid('youtube', 'vimeo', 'twitch', 'custom', 'other')
    .allow('', null)
    .optional(),
});
