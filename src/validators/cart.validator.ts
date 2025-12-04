import Joi from 'joi';

export const addCartItemSchema = Joi.object({
  competitionId: Joi.string().required(),
  quantity: Joi.number().integer().min(1).max(20).required(),
  ticketType: Joi.string().valid('lucky_draw', 'number_picker').optional(),
  ticketNumbers: Joi.array()
    .items(Joi.number().integer().min(1))
    .optional()
    .custom((value, helpers) => {
      // If ticketNumbers provided, validate length matches quantity
      const quantity = helpers.state.ancestors[0]?.quantity;
      if (value && quantity && value.length !== quantity) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'any.invalid':
        'Ticket numbers array length must match quantity',
    }),
  ticketsValid: Joi.boolean().optional(),
});

export const updateCartItemSchema = Joi.object({
  quantity: Joi.number().integer().min(1).max(20).required(),
  ticketType: Joi.string().valid('lucky_draw', 'number_picker').optional(),
  ticketNumbers: Joi.array()
    .items(Joi.number().integer().min(1))
    .optional()
    .allow(null)
    .custom((value, helpers) => {
      // If ticketNumbers provided, validate length matches quantity
      const quantity = helpers.state.ancestors[0]?.quantity;
      if (value && quantity && value.length !== quantity) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'any.invalid':
        'Ticket numbers array length must match quantity',
    }),
  ticketsValid: Joi.boolean().optional(),
});

export const syncCartSchema = Joi.object({
  localCartItems: Joi.array()
    .items(
      Joi.object({
        competitionId: Joi.string().required(),
        quantity: Joi.number().integer().min(1).max(20).required(),
        ticketNumbers: Joi.array()
          .items(Joi.number().integer().min(1))
          .optional()
          .allow(null),
        ticketsValid: Joi.boolean().optional(),
      })
    )
    .required(),
});


