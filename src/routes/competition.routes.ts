import { Router } from 'express';
import {
  createCompetition,
  deleteCompetition,
  getCompetition,
  getCompetitionProgress,
  getCompetitions,
  getFeaturedCompetitions,
  updateCompetition,
  updateCompetitionStatus,
  validateCompetitionAnswer,
} from '../controllers/competition.controller';
import { protect, adminOnly, superAdminOnly } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  createCompetitionSchema,
  updateCompetitionSchema,
  validateCompetitionAnswerSchema,
} from '../validators/competition.validator';

const router = Router();

// Public routes
router.get('/', getCompetitions);
router.get('/featured', getFeaturedCompetitions);
router.get('/:id/progress', getCompetitionProgress);
router.post(
  '/:id/entries/validate-answer',
  validate(validateCompetitionAnswerSchema),
  validateCompetitionAnswer
);
router.get('/:id', getCompetition);

// Admin routes (legacy support)
router.post(
  '/',
  protect,
  adminOnly,
  upload.array('images', 10),
  validate(createCompetitionSchema),
  createCompetition
);
router.put(
  '/:id',
  protect,
  adminOnly,
  upload.array('images', 10),
  validate(updateCompetitionSchema),
  updateCompetition
);
router.patch('/:id/status', protect, adminOnly, updateCompetitionStatus);
router.delete('/:id', protect, superAdminOnly, deleteCompetition);

export default router;




