import { Request, Response, NextFunction } from 'express';
import { Newsletter, User } from '../models';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import klaviyoService from '../services/klaviyo.service';
import logger from '../utils/logger';

/**
 * @desc    Subscribe to newsletter
 * @route   POST /api/v1/newsletter/subscribe
 * @access  Public
 */
export const subscribe = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, firstName, lastName, source = 'website', smsConsent, phone } = req.body;

    // Check if already subscribed
    let subscriber = await Newsletter.findOne({ email });

    if (subscriber && subscriber.status === 'subscribed') {
      res.json(ApiResponse.success(null, 'Already subscribed to newsletter'));
      return;
    }

    // Create or update database record
    if (subscriber) {
      subscriber.status = 'subscribed';
      subscriber.firstName = firstName;
      subscriber.lastName = lastName;
      subscriber.subscribedAt = new Date();
      await subscriber.save();
    } else {
      subscriber = await Newsletter.create({
        email,
        firstName,
        lastName,
        status: 'subscribed',
        source,
        subscribedAt: new Date(),
      });
    }

    // Klaviyo integration
    try {
      // Subscribe to email list
      await klaviyoService.subscribeToEmailList(email);

      // Subscribe to SMS list if consent given
      if (smsConsent && phone) {
        await klaviyoService.subscribeToSMSList(phone, email);
      }

      // Grant free entries if user exists
      const user = await User.findOne({ email });
      if (user) {
        await klaviyoService.grantFreeEntriesAndTrack(
          String(user._id),
          3,
          'newsletter_signup'
        );
      }

      // Track "Subscribed For Free Entries" event
      await klaviyoService.trackEvent(
        email,
        'Subscribed For Free Entries',
        {
          source: 'newsletter_signup',
          first_name: firstName,
          last_name: lastName,
        }
      );
    } catch (error: any) {
      logger.error('Error with Klaviyo subscription:', error);
      // Don't fail the subscription if Klaviyo fails
    }

    res.json(ApiResponse.success({ subscriber }, 'Successfully subscribed to newsletter'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Unsubscribe from newsletter
 * @route   POST /api/v1/newsletter/unsubscribe
 * @access  Public
 */
export const unsubscribe = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    const subscriber = await Newsletter.findOne({ email });
    if (!subscriber) {
      throw new ApiError('Email not found in newsletter list', 404);
    }

    // Update database
    subscriber.status = 'unsubscribed';
    subscriber.unsubscribedAt = new Date();
    await subscriber.save();

    res.json(ApiResponse.success(null, 'Successfully unsubscribed from newsletter'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get newsletter statistics
 * @route   GET /api/v1/newsletter/stats
 * @access  Private/Admin
 */
export const getStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const totalSubscribers = await Newsletter.countDocuments({ status: 'subscribed' });
    const totalUnsubscribed = await Newsletter.countDocuments({ status: 'unsubscribed' });
    const recentSubscribers = await Newsletter.find({ status: 'subscribed' })
      .sort({ subscribedAt: -1 })
      .limit(10);

    res.json(
      ApiResponse.success(
        {
          totalSubscribers,
          totalUnsubscribed,
          recentSubscribers,
        },
        'Newsletter statistics retrieved'
      )
    );
  } catch (error) {
    next(error);
  }
};




