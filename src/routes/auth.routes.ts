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
import { authLimiter } from '../middleware/rateLimiter.middleware';
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
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', refreshToken);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);
router.get('/verify-email', verifyEmail); // GET for clickable links
router.post('/verify-email', validate(verifyEmailSchema), verifyEmail); // POST for API calls
router.post('/resend-verification', authLimiter, validate(resendVerificationSchema), resendVerificationEmail);

// Protected routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, validate(updateProfileSchema), updateProfile);
router.post('/change-password', protect, validate(changePasswordSchema), changePassword);
router.post('/logout', protect, logout);

// Admin routes
router.post('/admin/login', authLimiter, validate(loginSchema), adminLogin);
router.get('/admin/verify', protect, adminOnly, verifyAdmin);

export default router;




