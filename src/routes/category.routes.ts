import { Router } from 'express';
import {
  getCategories,
  getCategoryBySlug,
  createCategory,
} from '../controllers/category.controller';
import { validate } from '../middleware/validation.middleware';
import { createCategorySchema } from '../validators/category.validator';
import { optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/', getCategories);
router.get('/:slug', getCategoryBySlug);
router.post(
  '/',
  optionalAuth, // Optional auth - allows users to add categories
  validate(createCategorySchema),
  createCategory
);

export default router;

