import { Router } from 'express';
import {
  confirmCheckoutOrder,
  createCheckoutPaymentIntent,
} from '../controllers/checkout.controller';
import { protect } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  confirmCheckoutSchema,
  createPaymentIntentSchema,
} from '../validators/checkout.validator';

const router = Router();

router.use(protect);

router.post(
  '/payment-intent',
  validate(createPaymentIntentSchema),
  createCheckoutPaymentIntent
);
router.post('/confirm', validate(confirmCheckoutSchema), confirmCheckoutOrder);

export default router;


