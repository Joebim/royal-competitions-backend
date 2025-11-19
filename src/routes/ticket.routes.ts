import { Router } from 'express';
import {
  getUserTickets,
  holdTickets,
  unreserveTickets,
} from '../controllers/ticket.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

// Public routes (for holding tickets - may be called before login)
router.post('/competitions/:id/hold', protect, holdTickets);
router.delete('/competitions/:id/hold', protect, unreserveTickets);

// Protected routes
router.use(protect);
router.get('/users/:id/tickets', getUserTickets);

export default router;

