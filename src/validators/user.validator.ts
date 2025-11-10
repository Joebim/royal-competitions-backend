import Joi from 'joi';
import { UserRole } from '../models/User.model';

const phoneRegex = /^(\+44|0)[1-9]\d{9}$/;

export const createAdminUserSchema = Joi.object({
  firstName: Joi.string().trim().max(50).required(),
  lastName: Joi.string().trim().max(50).required(),
  email: Joi.string().trim().lowercase().email().required(),
  phone: Joi.string().pattern(phoneRegex).optional(),
  password: Joi.string().min(8).required(),
  role: Joi.string()
    .valid(...Object.values(UserRole))
    .optional(),
  isVerified: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  subscribedToNewsletter: Joi.boolean().optional(),
});

export const updateAdminUserSchema = Joi.object({
  firstName: Joi.string().trim().max(50),
  lastName: Joi.string().trim().max(50),
  email: Joi.string().trim().lowercase().email(),
  phone: Joi.string().pattern(phoneRegex),
  role: Joi.string().valid(...Object.values(UserRole)),
  isVerified: Joi.boolean(),
  isActive: Joi.boolean(),
  subscribedToNewsletter: Joi.boolean(),
}).min(1);

export const resetAdminUserPasswordSchema = Joi.object({
  password: Joi.string().min(8).required(),
});

export const toggleAdminUserStatusSchema = Joi.object({
  isActive: Joi.boolean(),
});


