import Joi from 'joi';

const checkoutItemSchema = Joi.object({
  competitionId: Joi.string().required(),
  quantity: Joi.number().integer().min(1).max(20).required(),
  answer: Joi.string().trim().required(),
});

const addressSchema = Joi.object({
  line1: Joi.string().trim().required(),
  line2: Joi.string().trim().allow('', null),
  city: Joi.string().trim().required(),
  postalCode: Joi.string().trim().required(),
  country: Joi.string().trim().default('GB'),
});

const billingDetailsSchema = Joi.object({
  firstName: Joi.string().trim().max(100).required(),
  lastName: Joi.string().trim().max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().trim().max(20).optional(),
});

export const createPaymentIntentSchema = Joi.object({
  items: Joi.array().items(checkoutItemSchema).min(1).required(),
  billingDetails: billingDetailsSchema.optional(),
  billingAddress: addressSchema.optional(),
  orderId: Joi.string().optional(),
});

export const confirmCheckoutSchema = Joi.object({
  paymentIntentId: Joi.string().required(),
  orderId: Joi.string().optional(),
  billingDetails: billingDetailsSchema.optional(),
  billingAddress: addressSchema.optional(),
  shippingAddress: addressSchema.optional(),
});


