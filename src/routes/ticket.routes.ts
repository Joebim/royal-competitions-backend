import { Router } from 'express';
import {
  getUserTickets,
} from '../controllers/ticket.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

// Protected routes
router.use(protect);
router.get('/users/:id/tickets', getUserTickets);

export default router;

