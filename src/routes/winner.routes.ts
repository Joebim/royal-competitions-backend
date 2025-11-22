import { Router } from 'express';
import {
  getWinners,
  getWinner,
  claimPrize,
} from '../controllers/winner.controller';
import { validate } from '../middleware/validation.middleware';
import { claimPrizeSchema } from '../validators/winner.validator';

const router = Router();

// Public routes
router.get('/', getWinners);
router.get('/:id', getWinner);
router.post('/:id/claim', validate(claimPrizeSchema), claimPrize);

export default router;

