import Joi from 'joi';
import { HomePageSectionType } from '../models/HomePageSection.model';

export const createHomePageSectionSchema = Joi.object({
  type: Joi.string()
    .valid(...Object.values(HomePageSectionType))
    .required()
    .messages({
      'any.required': 'Section type is required',
      'any.only': `Section type must be one of: ${Object.values(HomePageSectionType).join(', ')}`,
    }),
  order: Joi.number().integer().min(0).required().messages({
    'any.required': 'Order is required',
    'number.base': 'Order must be a number',
    'number.integer': 'Order must be an integer',
    'number.min': 'Order must be 0 or greater',
  }),
  heading: Joi.string().trim().max(200).allow('', null).optional().messages({
    'string.max': 'Heading cannot exceed 200 characters',
  }),
  subheading: Joi.string().trim().max(500).allow('', null).optional().messages({
    'string.max': 'Subheading cannot exceed 500 characters',
  }),
  isActive: Joi.boolean().optional().default(true),
});

export const updateHomePageSectionSchema = Joi.object({
  order: Joi.number().integer().min(0).optional().messages({
    'number.base': 'Order must be a number',
    'number.integer': 'Order must be an integer',
    'number.min': 'Order must be 0 or greater',
  }),
  heading: Joi.string().trim().max(200).allow('', null).optional().messages({
    'string.max': 'Heading cannot exceed 200 characters',
  }),
  subheading: Joi.string().trim().max(500).allow('', null).optional().messages({
    'string.max': 'Subheading cannot exceed 500 characters',
  }),
  isActive: Joi.boolean().optional(),
});

export const reorderSectionsSchema = Joi.object({
  sections: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().required().messages({
          'any.required': 'Section ID is required',
        }),
        order: Joi.number().integer().min(0).required().messages({
          'any.required': 'Order is required',
          'number.base': 'Order must be a number',
          'number.integer': 'Order must be an integer',
          'number.min': 'Order must be 0 or greater',
        }),
      })
    )
    .min(1)
    .required()
    .messages({
      'any.required': 'Sections array is required',
      'array.min': 'At least one section must be provided',
    }),
});

