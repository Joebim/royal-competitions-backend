import { Router } from 'express';
import {
  addOrUpdateCartItem,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from '../controllers/cart.controller';
import { protect } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  addCartItemSchema,
  updateCartItemSchema,
} from '../validators/cart.validator';

const router = Router();

router.use(protect);

router.get('/', getCart);
router.post('/items', validate(addCartItemSchema), addOrUpdateCartItem);
router.patch(
  '/items/:itemId',
  validate(updateCartItemSchema),
  updateCartItem
);
router.delete('/items/:itemId', removeCartItem);
router.delete('/', clearCart);

export default router;


