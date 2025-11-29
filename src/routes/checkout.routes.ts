import { Router } from 'express';
import {
  confirmCheckoutOrder,
  createCheckoutPaymentIntent,
} from '../controllers/checkout.controller';
import { optionalAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  confirmCheckoutSchema,
  createPaymentIntentSchema,
} from '../validators/checkout.validator';

const router = Router();

// Checkout routes - support both authenticated and guest checkout
router.post(
  '/payment-intent',
  optionalAuth,
  validate(createPaymentIntentSchema),
  createCheckoutPaymentIntent
);
router.post('/confirm', optionalAuth, validate(confirmCheckoutSchema), confirmCheckoutOrder);

export default router;


