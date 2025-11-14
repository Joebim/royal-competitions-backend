import { Router } from 'express';
import { handleWebhook } from '../controllers/payment.controller';

const router = Router();

// Webhook route (no auth required - Stripe webhook)
router.post('/webhook', handleWebhook);

export default router;




