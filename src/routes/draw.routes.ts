import { Router } from 'express';
import {
  getAllDraws,
  getDraw,
  verifyDraw,
} from '../controllers/draw.controller';

const router = Router();

// Public routes
router.get('/', getAllDraws); // Must be before /:id to avoid route conflict
router.get('/:id', getDraw);
router.get('/:id/verify', verifyDraw);

export default router;
