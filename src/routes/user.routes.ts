import { Router } from 'express';
import {
  getMyEntries,
  getUsers,
  getUserById,
  updateUser,
} from '../controllers/user.controller';
import {
  getMyOrders,
  getUserOrdersForAdmin,
} from '../controllers/order.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.get('/me/entries', getMyEntries);
router.get('/me/orders', getMyOrders);

router.use(adminOnly);
router.get('/', getUsers);
router.get('/:userId/orders', getUserOrdersForAdmin);
router.get('/:id', getUserById);
router.patch('/:id', updateUser);

export default router;




