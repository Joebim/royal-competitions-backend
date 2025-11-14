import Joi from 'joi';

export const registerSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  phone: Joi.string()
    .replace(/\s+/g, '') // Remove all spaces
    .replace(/-/g, '') // Remove dashes
    .pattern(/^(\+44|0)[1-9]\d{9}$/)
    .messages({
      'string.pattern.base': 'Phone number must be a valid UK number (e.g., +447123456789 or 07123456789)',
    }),
  password: Joi.string().min(8).required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
  subscribedToNewsletter: Joi.boolean(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(8).required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
});

export const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(50),
  lastName: Joi.string().min(2).max(50),
  phone: Joi.string()
    .replace(/\s+/g, '') // Remove all spaces
    .replace(/-/g, '') // Remove dashes
    .pattern(/^(\+44|0)[1-9]\d{9}$/)
    .messages({
      'string.pattern.base': 'Phone number must be a valid UK number (e.g., +447123456789 or 07123456789)',
    }),
  subscribedToNewsletter: Joi.boolean(),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required(),
});

export const verifyEmailSchema = Joi.object({
  token: Joi.string().optional(), // Optional for query params in GET requests
});

export const resendVerificationSchema = Joi.object({
  email: Joi.string().email().required(),
});




