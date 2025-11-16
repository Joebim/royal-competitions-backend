import Joi from 'joi';

const validSlugs = [
  'terms-and-conditions',
  'terms-of-use',
  'acceptable-use',
  'privacy-policy',
  'complaints-procedure',
  'how-it-works',
];

const validCategories = [
  'General',
  'Competitions',
  'Draws',
  'Payments',
  'Account',
  'Prizes',
  'Technical',
];

// Legal Page Validators
export const createLegalPageSchema = Joi.object({
  slug: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9-]+$/)
    .valid(...validSlugs)
    .required(),
  title: Joi.string().trim().min(1).max(200).required(),
  subtitle: Joi.string().trim().max(500).optional(),
  content: Joi.string().trim().min(1).required(),
  isActive: Joi.boolean().optional(),
});

export const updateLegalPageSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).optional(),
  subtitle: Joi.string().trim().max(500).allow(null, '').optional(),
  content: Joi.string().trim().min(1).optional(),
  isActive: Joi.boolean().optional(),
});

export const getLegalPageSchema = Joi.object({
  slug: Joi.string()
    .trim()
    .lowercase()
    .valid(...validSlugs)
    .required(),
});

// FAQ Validators
export const createFAQSchema = Joi.object({
  id: Joi.string()
    .trim()
    .pattern(/^faq-\d{3}$/)
    .required()
    .messages({
      'string.pattern.base': 'FAQ ID must be in format faq-XXX (e.g., faq-001)',
    }),
  question: Joi.string().trim().min(1).max(500).required(),
  answer: Joi.string().trim().min(1).max(5000).required(),
  category: Joi.string()
    .trim()
    .valid(...validCategories)
    .optional(),
  order: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
});

export const updateFAQSchema = Joi.object({
  question: Joi.string().trim().min(1).max(500).optional(),
  answer: Joi.string().trim().min(1).max(5000).optional(),
  category: Joi.string()
    .trim()
    .valid(...validCategories)
    .allow(null, '')
    .optional(),
  order: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
});

export const getFAQsSchema = Joi.object({
  category: Joi.string()
    .trim()
    .valid(...validCategories)
    .optional(),
});

export const getFAQByIdSchema = Joi.object({
  id: Joi.string()
    .trim()
    .pattern(/^faq-\d{3}$/)
    .required(),
});

// Hero Competition Validators
export const updateHeroCompetitionSchema = Joi.object({
  competitionId: Joi.string()
    .trim()
    .required()
    .messages({
      'string.empty': 'Competition ID is required',
      'any.required': 'Competition ID is required',
    }),
});

// About Page Validators
const companyDetailsSchema = Joi.object({
  companyName: Joi.string().trim().min(1).max(200).required(),
  tradingAs: Joi.string().trim().min(1).max(200).required(),
  companyNumber: Joi.string().trim().min(1).max(50).required(),
  location: Joi.string().trim().min(1).max(200).required(),
});

const featureSchema = Joi.object({
  icon: Joi.string().trim().min(1).max(100).required(),
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().min(1).max(500).required(),
});

export const createAboutPageSchema = Joi.object({
  hero: Joi.object({
    title: Joi.string().trim().min(1).max(200).required(),
    subtitle: Joi.string().trim().min(1).max(500).required(),
  }).required(),
  story: Joi.object({
    heading: Joi.string().trim().min(1).max(200).required(),
    paragraphs: Joi.array().items(Joi.string().trim().min(1)).min(1).required(),
  }).required(),
  companyDetails: companyDetailsSchema.required(),
  features: Joi.array().items(featureSchema).min(1).required(),
  isActive: Joi.boolean().optional(),
});

export const updateAboutPageSchema = Joi.object({
  hero: Joi.object({
    title: Joi.string().trim().min(1).max(200).optional(),
    subtitle: Joi.string().trim().min(1).max(500).optional(),
  }).optional(),
  story: Joi.object({
    heading: Joi.string().trim().min(1).max(200).optional(),
    paragraphs: Joi.array().items(Joi.string().trim().min(1)).min(1).optional(),
  }).optional(),
  companyDetails: companyDetailsSchema.optional(),
  features: Joi.array().items(featureSchema).min(1).optional(),
  isActive: Joi.boolean().optional(),
});

