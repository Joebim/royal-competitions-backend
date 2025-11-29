import { Router } from 'express';
import {
  getAllOrdersForAdmin,
  getMyOrders,
  getOrderById,
  getUserOrdersForAdmin,
  createOrder,
} from '../controllers/order.controller';
import { protect, adminOnly, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// Create order - supports both authenticated and guest checkout
// Uses optionalAuth to set userId if user is logged in
router.post('/', optionalAuth, createOrder);

// Get order by ID - supports both authenticated and guest checkout
// Guest orders (no userId) can be accessed by anyone with the order ID
router.get('/:id', optionalAuth, getOrderById);

// Protected routes (require authentication)
router.use(protect);

// Customer routes (authenticated only)
router.get('/', getMyOrders);
router.get('/my-orders', getMyOrders);

// Admin routes
router.get('/admin/all', adminOnly, getAllOrdersForAdmin);
router.get('/admin/users/:userId', adminOnly, getUserOrdersForAdmin);

export default router;




