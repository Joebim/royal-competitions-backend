import Joi from 'joi';

// Categories are now stored in the database and can be added dynamically
// Validation accepts any string - categories are managed via Category model

const specificationsSchema = Joi.array().items(
  Joi.object({
    label: Joi.string().trim().required(),
    value: Joi.string().trim().required(),
  })
);

const answerOptionsSchema = Joi.array()
  .items(Joi.string().trim().min(1))
  .min(2)
  .max(6);

const questionSchema = Joi.object({
  question: Joi.string().trim().required(),
  options: answerOptionsSchema.optional(),
  answerOptions: answerOptionsSchema.optional(),
  correctAnswer: Joi.string().trim().required(),
  explanation: Joi.string().allow('').optional(),
}).custom((value, helpers) => {
  if (!value.options && !value.answerOptions) {
    return helpers.error('any.custom', {
      message: 'Question options or answerOptions are required',
    });
  }
  return value;
});

const freeEntrySectionSchema = Joi.object({
  heading: Joi.string().trim().min(1).max(200).required(),
  // Body paragraphs – now allow empty strings and even an empty array
  // so you can use only lists if you want.
  body: Joi.array()
    .items(Joi.string().trim().allow(''))
    .min(0)
    .optional(),
  list: Joi.object({
    title: Joi.string().trim().max(200).optional(),
    items: Joi.array().items(Joi.string().trim().min(1)).optional(),
  }).optional(),
});

const freeEntryDetailsSchema = Joi.alternatives().try(
  Joi.object({
    intro: Joi.string().trim().max(4000).allow('', null).optional(),
    sections: Joi.array().items(freeEntrySectionSchema).min(1).required(),
  }),
  Joi.string().custom((value, helpers) => {
    try {
      const parsed = JSON.parse(value);
      // Re-validate parsed as object to reuse the same rules
      const { error, value: validated } = Joi.object({
        intro: Joi.string().trim().max(4000).allow('', null).optional(),
        sections: Joi.array().items(freeEntrySectionSchema).min(1).required(),
      }).validate(parsed, { abortEarly: false });

      if (error) {
        return helpers.error('any.custom', {
          message: error.details.map((d) => d.message.replace(/["]/g, '')).join('; '),
        });
      }

      return validated;
    } catch {
      return helpers.error('any.custom', {
        message: 'freeEntryDetails must be valid JSON',
      });
    }
  })
);

export const createCompetitionSchema = Joi.object({
  title: Joi.string().min(5).max(200).required(),
  shortDescription: Joi.string().max(280),
  description: Joi.string().min(20).max(5000).required(),
  prize: Joi.string().trim().required(),
  prizeValue: Joi.number().min(0),
  cashAlternative: Joi.number().min(0),
  cashAlternativeDetails: Joi.string().max(500),
  originalPrice: Joi.number().min(0),
  ticketPricePence: Joi.number().min(1).required(), // Price in pence (e.g., 100 = £1.00)
  ticketLimit: Joi.number().min(10).max(100000).allow(null), // null = unlimited
  ticketsSold: Joi.number().min(0),
  category: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Category is required',
    'string.min': 'Category must be at least 2 characters',
    'string.max': 'Category cannot exceed 100 characters',
    'any.required': 'Category is required',
  }),
  status: Joi.string().valid(
    'draft',
    'live',
    'closed',
    'drawn',
    'cancelled'
  ),
  drawMode: Joi.string().valid('automatic', 'admin_triggered', 'manual'),
  drawAt: Joi.date().required(), // When the draw should occur
  freeEntryEnabled: Joi.boolean(),
  noPurchasePostalAddress: Joi.string().allow(''),
  freeEntryDetails: freeEntryDetailsSchema.optional(),
  termsUrl: Joi.string().uri().allow(''),
  question: questionSchema.optional().allow(null), // Optional skill question
  startDate: Joi.date(),
  endDate: Joi.date().greater(Joi.ref('startDate')),
  featured: Joi.boolean(),
  isActive: Joi.boolean(),
  features: Joi.alternatives()
    .try(Joi.array().items(Joi.string()), Joi.string())
    .optional(),
  included: Joi.alternatives()
    .try(Joi.array().items(Joi.string()), Joi.string())
    .optional(),
  tags: Joi.alternatives()
    .try(Joi.array().items(Joi.string()), Joi.string())
    .optional(),
  specifications: Joi.alternatives()
    .try(specificationsSchema, Joi.string())
    .optional(),
  termsAndConditions: Joi.string().allow(''),
  slug: Joi.string(),
  nextTicketNumber: Joi.number().min(1),
});

export const updateCompetitionSchema = createCompetitionSchema.fork(
  Object.keys(createCompetitionSchema.describe().keys),
  (schema) => schema.optional()
);

export const validateCompetitionAnswerSchema = Joi.object({
  answer: Joi.string().trim().required(),
});




