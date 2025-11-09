import { Router } from 'express';
import {
  getAllOrdersForAdmin,
  getMyOrders,
  getOrderById,
  getUserOrdersForAdmin,
} from '../controllers/order.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

// Customer routes
router.get('/', getMyOrders);
router.get('/my-orders', getMyOrders);

// Admin routes
router.get('/admin/all', adminOnly, getAllOrdersForAdmin);
router.get('/admin/users/:userId', adminOnly, getUserOrdersForAdmin);

router.get('/:id', getOrderById);

export default router;




