import { Router } from 'express';
import {
  getDraws,
  getDraw,
  createDraw,
  updateDraw,
  deleteDraw,
  getRecentDraws,
} from '../controllers/draw.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { createDrawSchema, updateDrawSchema } from '../validators/draw.validator';

const router = Router();

// Public routes
router.get('/', getDraws);
router.get('/recent', getRecentDraws);
router.get('/:id', getDraw);

// Protected routes (Admin only)
router.post('/', protect, adminOnly, validate(createDrawSchema), createDraw);
router.put('/:id', protect, adminOnly, validate(updateDrawSchema), updateDraw);
router.delete('/:id', protect, adminOnly, deleteDraw);

export default router;
