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

// Protected routes
router.use(protect);

// Customer routes
router.get('/', getMyOrders);
router.get('/my-orders', getMyOrders);
router.get('/:id', getOrderById);

// Admin routes
router.get('/admin/all', adminOnly, getAllOrdersForAdmin);
router.get('/admin/users/:userId', adminOnly, getUserOrdersForAdmin);

export default router;




