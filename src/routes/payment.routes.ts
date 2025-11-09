import { Router } from 'express';
import { createPaymentIntent, handleWebhook } from '../controllers/payment.controller';

const router = Router();

// Webhook route (no auth required)
router.post('/webhook', handleWebhook);

// Protected routes
router.post('/create-intent', createPaymentIntent);

export default router;




