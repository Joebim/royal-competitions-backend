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
import { holdTickets, getCompetitionEntryList, getCompetitionTicketList } from '../controllers/ticket.controller';
import { getCompetitionDraws } from '../controllers/draw.controller';
import { getCompetitionWinners } from '../controllers/winner.controller';
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
router.get('/:id/entry-list', getCompetitionEntryList);
router.get('/:id/draws', getCompetitionDraws);
router.get('/:id/winners', getCompetitionWinners);
router.get('/:id', getCompetition);

// Protected routes - ticket reservation
router.post('/:id/hold', protect, holdTickets);

// Public routes - ticket list (no authentication required)
router.get('/:id/tickets/list', getCompetitionTicketList);

// Public route for entry list (legacy support)
router.post(
  '/:id/entries/validate-answer',
  validate(validateCompetitionAnswerSchema),
  validateCompetitionAnswer
);

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




