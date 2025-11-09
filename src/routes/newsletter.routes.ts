import { Router } from 'express';
import { subscribe, unsubscribe, getStats } from '../controllers/newsletter.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { subscribeSchema, unsubscribeSchema } from '../validators/newsletter.validator';

const router = Router();

// Public routes
router.post('/subscribe', validate(subscribeSchema), subscribe);
router.post('/unsubscribe', validate(unsubscribeSchema), unsubscribe);

// Admin routes
router.get('/stats', protect, adminOnly, getStats);

export default router;




