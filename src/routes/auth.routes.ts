import { Router } from 'express';
import {
  register,
  login,
  logout,
  refreshToken,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  adminLogin,
  verifyAdmin,
} from '../controllers/auth.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from '../validators/auth.validator';

const router = Router();

// Public routes
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', refreshToken);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.get('/verify-email', verifyEmail); // GET for clickable links
router.post('/verify-email', validate(verifyEmailSchema), verifyEmail); // POST for API calls
router.post('/resend-verification', validate(resendVerificationSchema), resendVerificationEmail);

// Protected routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, validate(updateProfileSchema), updateProfile);
router.post('/change-password', protect, validate(changePasswordSchema), changePassword);
router.post('/logout', protect, logout);

// Admin routes
router.post('/admin/login', validate(loginSchema), adminLogin);
router.get('/admin/verify', protect, adminOnly, verifyAdmin);

export default router;




