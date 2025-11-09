import Joi from 'joi';

const categoryOptions = [
  'Luxury Cars',
  'Tech & Gadgets',
  'Holidays',
  'Cash Prizes',
  'Home & Garden',
  'Fashion & Watches',
  'Experiences',
  'Other',
];

const answerOptionsSchema = Joi.array()
  .items(Joi.string().trim().min(1))
  .min(2)
  .max(6);

const questionSchema = Joi.object({
  question: Joi.string().trim().required(),
  options: answerOptionsSchema,
  answerOptions: answerOptionsSchema,
  correctAnswer: Joi.string().trim().required(),
  explanation: Joi.string().allow('').optional(),
}).custom((value, helpers) => {
  if (!value.options && !value.answerOptions) {
    return helpers.error('any.custom', {
      message: 'Question options are required',
    });
  }
  return value;
});

const specificationsSchema = Joi.array().items(
  Joi.object({
    label: Joi.string().trim().required(),
    value: Joi.string().trim().required(),
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
  ticketPrice: Joi.number().min(0.1).required(),
  maxTickets: Joi.number().min(10).max(100000).required(),
  soldTickets: Joi.number().min(0),
  question: questionSchema.required(),
  category: Joi.string().valid(...categoryOptions).required(),
  status: Joi.string().valid(
    'draft',
    'active',
    'drawing',
    'completed',
    'cancelled'
  ),
  drawDate: Joi.date().required(),
  startDate: Joi.date(),
  endDate: Joi.date().greater(Joi.ref('startDate')),
  featured: Joi.boolean(),
  isActive: Joi.boolean(),
  isGuaranteedDraw: Joi.boolean(),
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
});

export const updateCompetitionSchema = createCompetitionSchema.fork(
  Object.keys(createCompetitionSchema.describe().keys),
  (schema) => schema.optional()
);

export const validateCompetitionAnswerSchema = Joi.object({
  answer: Joi.string().trim().required(),
});




