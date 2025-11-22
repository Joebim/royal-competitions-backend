import { Router } from 'express';
import {
  startEntry,
  submitEntry,
  getMyEntries,
  getCompetitionEntries,
} from '../controllers/entry.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// Protected routes - user entries
router.post('/start', protect, startEntry);
router.post('/submit', protect, submitEntry);
router.get('/competition/:competitionId', protect, getMyEntries);

// Admin routes
router.get('/admin/competition/:competitionId', protect, adminOnly, getCompetitionEntries);

export default router;

