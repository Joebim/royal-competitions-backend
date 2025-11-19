import { Router } from 'express';
import {
  createPayPalOrder,
  capturePayment,
  confirmPayment,
  handleWebhook,
  fixOrderTickets,
} from '../controllers/payment.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// Webhook route (no auth required - PayPal webhook)
router.post('/webhook', handleWebhook);

// PayPal payment routes
router.post('/create-order', createPayPalOrder); // Create PayPal order
router.post('/capture-order', capturePayment); // Capture payment after approval
router.post('/confirm', confirmPayment); // Alias for capture

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
