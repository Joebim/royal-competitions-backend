import { Router } from 'express';
import {
  getWinners,
  getWinner,
  claimPrize,
  getMyWinners,
} from '../controllers/winner.controller';
import { protect } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { claimPrizeSchema } from '../validators/winner.validator';

const router = Router();

// Public routes
router.get('/', getWinners);
router.get('/:id', getWinner);
router.post('/:id/claim', validate(claimPrizeSchema), claimPrize);

// Protected user routes
router.get('/my/list', protect, getMyWinners);

export default router;
