import Joi from 'joi';

export const updateWinnerSchema = Joi.object({
  notified: Joi.boolean().optional(),
  notifiedAt: Joi.date().optional(),
  claimed: Joi.boolean().optional(),
  claimedAt: Joi.date().optional(),
  verified: Joi.boolean().optional(),
  verifiedAt: Joi.date().optional(),
  publicAnnouncement: Joi.string().trim().max(500).allow('', null).optional(),
  prizeValue: Joi.number().min(0).optional(),
  proofImageUrl: Joi.string().uri().trim().allow('', null).optional(),
  drawVideoUrl: Joi.string().uri().trim().allow('', null).optional(),
  testimonial: Joi.object({
    text: Joi.string().trim().max(1000).required(),
    rating: Joi.number().min(1).max(5).optional(),
    approved: Joi.boolean().optional(),
  })
    .allow(null)
    .optional(),
});
