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
} from '../validators/user.validator';

const router = Router();

router.use(protect);

router.get('/me/entries', getMyEntries);
router.get('/me/orders', getMyOrders);

router.use(adminOnly);
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




