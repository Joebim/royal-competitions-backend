import { Router } from 'express';
import {
  getAllOrdersForAdmin,
  getMyOrders,
  getOrderById,
  getUserOrdersForAdmin,
  createOrder,
} from '../controllers/order.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// All order routes require authentication
router.use(protect);

// Create order - requires authentication
router.post('/', createOrder);

// Get order by ID - requires authentication
router.get('/:id', getOrderById);

// Customer routes (authenticated only)
router.get('/', getMyOrders);
router.get('/my-orders', getMyOrders);

// Admin routes
router.get('/admin/all', adminOnly, getAllOrdersForAdmin);
router.get('/admin/users/:userId', adminOnly, getUserOrdersForAdmin);

export default router;




