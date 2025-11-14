import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../models';
import {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import {
  setAuthCookie,
  setRefreshCookie,
  clearAuthCookie,
  clearRefreshCookie,
} from '../utils/cookies';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import crypto from 'crypto';
import emailService from '../services/email.service';
import logger from '../utils/logger';

/**
 * @desc    Register new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      subscribedToNewsletter,
    } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ApiError('User already exists', 400);
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      subscribedToNewsletter,
    });

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');
    user.emailVerificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    // Send verification email
    try {
      await emailService.sendVerificationEmail(
        user.email,
        user.firstName,
        verificationToken
      );
      logger.info(`Verification email sent to ${user.email}`);
    } catch (emailError) {
      logger.error(`Failed to send verification email to ${user.email}:`, emailError);
      // Don't fail registration if email fails, but log the error
    }

    // Generate tokens
    const token = generateToken(String(user._id));
    const refreshToken = generateRefreshToken(String(user._id));

    // Set cookies
    setAuthCookie(res, token);
    setRefreshCookie(res, refreshToken);

    // Remove password from response
    const userResponse = user.toObject();
    const { password: _, ...userWithoutPassword } = userResponse;

    res
      .status(201)
      .json(
        ApiResponse.success(
          { user: userWithoutPassword },
          'Registration successful. Please check your email to verify your account.'
        )
      );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new ApiError('Invalid credentials', 401);
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new ApiError('Invalid credentials', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ApiError('Account is deactivated', 403);
    }

    // Generate tokens
    const token = generateToken(String(user._id));
    const refreshToken = generateRefreshToken(String(user._id));

    // Set cookies
    setAuthCookie(res, token);
    setRefreshCookie(res, refreshToken);

    // Remove password from response
    const userResponse = user.toObject();
    const { password: _, ...userWithoutPassword } = userResponse;

    res.json(
      ApiResponse.success(
        {
          user: userWithoutPassword,
          isAdmin:
            user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN,
          isSuperAdmin: user.role === UserRole.SUPER_ADMIN,
        },
        'Login successful'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user
 * @route   GET /api/v1/auth/profile
 * @access  Private
 */
export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }
    const user = await User.findById(req.user._id);
    res.json(ApiResponse.success({ user }, 'Profile retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update profile
 * @route   PUT /api/v1/auth/profile
 * @access  Private
 */
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const updates: Record<string, any> = {};

    if (req.body.firstName) updates.firstName = req.body.firstName;
    if (req.body.lastName) updates.lastName = req.body.lastName;
    if (req.body.phone !== undefined) updates.phone = req.body.phone;
    if (req.body.subscribedToNewsletter !== undefined) {
      updates.subscribedToNewsletter = req.body.subscribedToNewsletter;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    res.json(
      ApiResponse.success({ user }, 'Profile updated successfully')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change password
 * @route   POST /api/v1/auth/change-password
 * @access  Private
 */
export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new ApiError('Current password is incorrect', 400);
    }

    user.password = newPassword;
    await user.save();

    res.json(ApiResponse.success(null, 'Password updated successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify email
 * @route   GET/POST /api/v1/auth/verify-email
 * @access  Public
 */
export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Support both GET (query param) and POST (body) for flexibility
    const token = req.query.token || req.body.token;

    if (!token) {
      throw new ApiError('Verification token is required', 400);
    }

    const hashedToken = crypto.createHash('sha256').update(token as string).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpire: { $gt: new Date() },
    });

    if (!user) {
      throw new ApiError('Invalid or expired verification token', 400);
    }

    // Check if already verified
    if (user.isVerified) {
      res.json(
        ApiResponse.success(null, 'Email is already verified')
      );
      return;
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    res.json(ApiResponse.success(null, 'Email verified successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Forgot password
 * @route   POST /api/v1/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      throw new ApiError('User not found', 404);
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.passwordResetExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(
        user.email,
        user.firstName,
        resetToken
      );
      logger.info(`Password reset email sent to ${user.email}`);
    } catch (emailError) {
      logger.error(`Failed to send password reset email to ${user.email}:`, emailError);
      // Don't fail the request if email fails, but log the error
    }

    res.json(ApiResponse.success(null, 'Password reset email sent'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password
 * @route   POST /api/v1/auth/reset-password
 * @access  Public
 */
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, password } = req.body;

    // Hash token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpire: { $gt: Date.now() },
    });

    if (!user) {
      throw new ApiError('Invalid or expired reset token', 400);
    }

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpire = undefined;
    await user.save();

    res.json(ApiResponse.success(null, 'Password reset successful'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
export const logout = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Clear cookies
    clearAuthCookie(res);
    clearRefreshCookie(res);

    res.json(ApiResponse.success(null, 'Logout successful'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Refresh access token
 * @route   POST /api/v1/auth/refresh
 * @access  Public
 */
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new ApiError('Refresh token not provided', 401);
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Get user
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new ApiError('User not found', 404);
    }

    if (!user.isActive) {
      throw new ApiError('Account is deactivated', 403);
    }

    // Generate new tokens
    const newToken = generateToken(String(user._id));
    const newRefreshToken = generateRefreshToken(String(user._id));

    // Set new cookies
    setAuthCookie(res, newToken);
    setRefreshCookie(res, newRefreshToken);

    res.json(ApiResponse.success(null, 'Token refreshed successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/auth/admin/login:
 *   post:
 *     summary: Admin login (for admin panel)
 *     description: Login endpoint specifically for admin users. Only users with admin or super_admin roles can use this endpoint.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@royalcompetitions.co.uk
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       200:
 *         description: Admin login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Admin login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     isAdmin:
 *                       type: boolean
 *                       example: true
 *                     isSuperAdmin:
 *                       type: boolean
 *                       example: true
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account deactivated or not an admin user
 */
/**
 * @desc    Admin login (for admin panel)
 * @route   POST /api/v1/auth/admin/login
 * @access  Public
 */
export const adminLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new ApiError('Invalid credentials', 401);
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new ApiError('Invalid credentials', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ApiError('Account is deactivated', 403);
    }

    // Check if user is admin or super admin
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      throw new ApiError('Access denied. Admin access required.', 403);
    }

    // Generate tokens
    const token = generateToken(String(user._id));
    const refreshToken = generateRefreshToken(String(user._id));

    // Set cookies
    setAuthCookie(res, token);
    setRefreshCookie(res, refreshToken);

    // Remove password from response
    const userResponse = user.toObject();
    const { password: _, ...userWithoutPassword } = userResponse;

    res.json(
      ApiResponse.success(
        {
          user: userWithoutPassword,
          isAdmin: true,
          isSuperAdmin: user.role === UserRole.SUPER_ADMIN,
        },
        'Admin login successful'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/auth/admin/verify:
 *   get:
 *     summary: Verify admin status
 *     description: Verify that the current user has admin access and return their admin status.
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Admin access verified
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Admin access verified
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                           enum: [user, admin, super_admin]
 *                     isAdmin:
 *                       type: boolean
 *                       example: true
 *                     isSuperAdmin:
 *                       type: boolean
 *                       example: true
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not an admin user
 */
/**
 * @desc    Resend verification email
 * @route   POST /api/v1/auth/resend-verification
 * @access  Public
 */
export const resendVerificationEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ApiError('Email is required', 400);
    }

    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if user exists or not for security
      res.json(
        ApiResponse.success(
          null,
          'If an account exists with this email, a verification email has been sent.'
        )
      );
      return;
    }

    // Check if already verified
    if (user.isVerified) {
      res.json(
        ApiResponse.success(null, 'Email is already verified')
      );
      return;
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');
    user.emailVerificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    // Send verification email
    try {
      await emailService.sendVerificationEmail(
        user.email,
        user.firstName,
        verificationToken
      );
      logger.info(`Verification email resent to ${user.email}`);
    } catch (emailError) {
      logger.error(`Failed to send verification email to ${user.email}:`, emailError);
      throw new ApiError('Failed to send verification email', 500);
    }

    res.json(
      ApiResponse.success(
        null,
        'If an account exists with this email, a verification email has been sent.'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify admin status
 * @route   GET /api/v1/auth/admin/verify
 * @access  Private (Admin only)
 */
export const verifyAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const isAdmin =
      req.user.role === UserRole.ADMIN ||
      req.user.role === UserRole.SUPER_ADMIN;
    const isSuperAdmin = req.user.role === UserRole.SUPER_ADMIN;

    if (!isAdmin) {
      throw new ApiError('Admin access required', 403);
    }

    res.json(
      ApiResponse.success(
        {
          user: {
            _id: req.user._id,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            email: req.user.email,
            role: req.user.role,
          },
          isAdmin: true,
          isSuperAdmin,
        },
        'Admin access verified'
      )
    );
  } catch (error) {
    next(error);
  }
};
