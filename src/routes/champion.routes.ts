import { Router } from 'express';
import {
  getChampions,
  getChampion,
  createChampion,
  updateChampion,
  deleteChampion,
  getFeaturedChampions,
} from '../controllers/champion.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  createChampionSchema,
  updateChampionSchema,
} from '../validators/champion.validator';

const router = Router();

// Public routes
router.get('/', getChampions);
router.get('/featured', getFeaturedChampions);
router.get('/:id', getChampion);

// Protected routes (Admin only)
router.post(
  '/',
  protect,
  adminOnly,
  upload.single('image'),
  validate(createChampionSchema),
  createChampion
);
router.put(
  '/:id',
  protect,
  adminOnly,
  upload.single('image'),
  validate(updateChampionSchema),
  updateChampion
);
router.delete('/:id', protect, adminOnly, deleteChampion);

export default router;
