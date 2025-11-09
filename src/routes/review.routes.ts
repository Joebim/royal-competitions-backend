import { Router } from 'express';
import {
  createReview,
  getReviews,
} from '../controllers/review.controller';
import { validate } from '../middleware/validation.middleware';
import { createReviewSchema } from '../validators/review.validator';

const router = Router();

router.get('/', getReviews);
router.post('/', validate(createReviewSchema), createReview);

export default router;

