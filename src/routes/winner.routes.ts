import { Router } from 'express';
import {
  getWinners,
  getWinner,
} from '../controllers/winner.controller';

const router = Router();

// Public routes
router.get('/', getWinners);
router.get('/:id', getWinner);

export default router;

