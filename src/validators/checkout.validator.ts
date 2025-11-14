import Joi from 'joi';

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
  orderId: Joi.string().required(),
  billingDetails: billingDetailsSchema.optional(),
  shippingAddress: addressSchema.optional(),
  marketingOptIn: Joi.boolean().optional(),
});

export const confirmCheckoutSchema = Joi.object({
  paymentIntentId: Joi.string().required(),
  orderId: Joi.string().optional(),
  billingDetails: billingDetailsSchema.optional(),
  billingAddress: addressSchema.optional(),
  shippingAddress: addressSchema.optional(),
});


