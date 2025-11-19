import { Router } from 'express';
import {
  getMyEntries,
  getUsers,
  getUserById,
  createUserByAdmin,
  deleteUserByAdmin,
  resetUserPasswordByAdmin,
  toggleUserStatus,
  updateUser,
  getMyProfile,
  getUserProfileWithStats,
  getMyTickets,
  getMyOrdersGrouped,
  updateMyProfile,
} from '../controllers/user.controller';
import {
  getMyOrders,
  getUserOrdersForAdmin,
} from '../controllers/order.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  createAdminUserSchema,
  resetAdminUserPasswordSchema,
  toggleAdminUserStatusSchema,
  updateAdminUserSchema,
  updateMyProfileSchema,
} from '../validators/user.validator';

const router = Router();

// User profile routes (protected, not admin-only)
router.get('/me', protect, getMyProfile);
router.get('/me/profile', protect, getUserProfileWithStats);
router.get('/me/tickets', protect, getMyTickets);
router.get('/me/orders/grouped', protect, getMyOrdersGrouped);
router.get('/me/entries', protect, getMyEntries);
router.get('/me/orders', protect, getMyOrders);
router.put('/me', protect, validate(updateMyProfileSchema), updateMyProfile);
router.patch('/me', protect, validate(updateMyProfileSchema), updateMyProfile);

// Admin routes (protected + admin-only)
router.use(protect, adminOnly);
router.post('/', validate(createAdminUserSchema), createUserByAdmin);
router.get('/', getUsers);
router.get('/:userId/orders', getUserOrdersForAdmin);
router.post(
  '/:id/reset-password',
  validate(resetAdminUserPasswordSchema),
  resetUserPasswordByAdmin
);
router.patch(
  '/:id/status',
  validate(toggleAdminUserStatusSchema),
  toggleUserStatus
);
router.get('/:id', getUserById);
router.put('/:id', validate(updateAdminUserSchema), updateUser);
router.patch('/:id', validate(updateAdminUserSchema), updateUser);
router.delete('/:id', deleteUserByAdmin);

export default router;




