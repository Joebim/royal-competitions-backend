import { Router } from 'express';
import {
  createSquarePayment,
  confirmPayment,
  handleWebhook,
  fixOrderTickets,
} from '../controllers/payment.controller';
import { protect, adminOnly, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// Webhook route (no auth required - Square webhook)
router.post('/webhook', handleWebhook);

// Square payment routes - support both authenticated and guest checkout
router.post('/create-payment', optionalAuth, createSquarePayment); // Create Square payment
router.post('/confirm-payment', optionalAuth, confirmPayment); // Confirm payment

// Admin route to fix tickets for existing orders
router.post(
  '/fix-tickets/:orderId',
  protect,
  adminOnly,
  async (req, res, next) => {
    try {
      const result = await fixOrderTickets(req.params.orderId);
      res.json({
        success: true,
        message: 'Tickets fixed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
