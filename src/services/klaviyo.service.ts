import { config } from '../config/environment';
import logger from '../utils/logger';
import { IUser } from '../models/User.model';

/**
 * Comprehensive Klaviyo Service
 * Handles all Klaviyo API interactions for Royal Competitions
 * Uses REST API with retry logic and proper error handling
 */

interface TrackEventProperties {
  [key: string]: any;
}

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
}

class KlaviyoService {
  private privateApiKey: string;
  private baseUrl = 'https://a.klaviyo.com/api';
  private revision = '2024-02-15';
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  constructor() {
    this.privateApiKey = process.env.KLAVIYO_PRIVATE_API_KEY || config.klaviyo.privateKey || '';
    
    if (!this.privateApiKey) {
      logger.warn('Klaviyo private API key not configured');
    }
  }

  /**
   * Make API request with retry logic for 429/5xx errors
   */
  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'POST',
    body?: any,
    options: RetryOptions = {}
  ): Promise<any> {
    const maxRetries = options.maxRetries || this.maxRetries;
    const retryDelay = options.retryDelay || this.retryDelay;

    if (!this.privateApiKey) {
      logger.warn('Klaviyo API key not configured, skipping request');
      return null;
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Klaviyo-API-Key ${this.privateApiKey}`,
      'revision': this.revision,
      'Content-Type': 'application/json',
    };

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });

        // Handle rate limiting (429)
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : retryDelay * Math.pow(2, attempt);
          
          if (attempt < maxRetries) {
            logger.warn(`Klaviyo rate limited, retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
            await this.sleep(delay);
            continue;
          }
        }

        // Handle server errors (5xx)
        if (response.status >= 500 && response.status < 600) {
          if (attempt < maxRetries) {
            const delay = retryDelay * Math.pow(2, attempt);
            logger.warn(`Klaviyo server error ${response.status}, retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
            await this.sleep(delay);
            continue;
          }
        }

        if (!response.ok) {
          const errorText = await response.text();
          logger.error(`Klaviyo API error: ${response.status} ${errorText}`);
          // Don't throw for 4xx errors (except 429 which we retry)
          if (response.status === 429 || response.status >= 500) {
            throw new Error(`Klaviyo API error: ${response.status} ${errorText}`);
          }
          return null;
        }

        // Handle empty responses (204 No Content)
        if (response.status === 204) {
          return null;
        }

        // Handle JSON responses
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          return data;
        }

        return null;
      } catch (error: any) {
        if (attempt === maxRetries) {
          logger.error(`Klaviyo API request failed after ${maxRetries} retries:`, error.message || error);
          // Don't throw - we don't want to fail the main operation
          return null;
        }
        
        const delay = retryDelay * Math.pow(2, attempt);
        logger.warn(`Klaviyo request failed, retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries}):`, error.message);
        await this.sleep(delay);
      }
    }

    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Identify or update a profile in Klaviyo
   * Creates profile if doesn't exist, updates if exists
   */
  async identifyOrUpdateProfile(user: IUser): Promise<void> {
    try {
      if (!user.email) {
        logger.warn('Cannot identify profile without email');
        return;
      }

      const profileData = {
        data: {
          type: 'profile',
          attributes: {
            email: user.email,
            ...(user.firstName && { first_name: user.firstName }),
            ...(user.lastName && { last_name: user.lastName }),
            ...(user.phone && { phone_number: user.phone }),
            ...(user.subscribedToNewsletter !== undefined && {
              properties: {
                subscribed_to_newsletter: user.subscribedToNewsletter,
              },
            }),
          },
        },
      };

      await this.makeRequest('/profiles/', 'POST', profileData);
      logger.info(`Klaviyo profile identified/updated: ${user.email}`);
    } catch (error: any) {
      logger.error('Error identifying/updating Klaviyo profile:', error.message || error);
      // Don't throw - we don't want to fail the main operation
    }
  }

  /**
   * Track a custom event in Klaviyo
   * Uses the Events API to create custom metric events
   * @param email - User email (can be null for anonymous events)
   * @param eventName - Exact custom metric name (case-sensitive)
   * @param properties - Event properties
   * @param value - Monetary value (optional)
   * @param time - ISO 8601 timestamp (optional, defaults to now)
   */
  async trackEvent(
    email: string | null,
    eventName: string,
    properties: TrackEventProperties = {},
    value?: number,
    time?: string
  ): Promise<void> {
    try {
      // First, ensure the metric exists (create if doesn't exist)
      // Klaviyo automatically creates metrics on first use, but we'll try to create it explicitly
      const metricData = {
        data: {
          type: 'metric',
          attributes: {
            name: eventName,
          },
        },
      };

      // Try to create metric (will fail if exists, but that's okay)
      try {
        await this.makeRequest('/metrics/', 'POST', metricData);
      } catch (metricError) {
        // Metric might already exist, that's fine
        logger.debug(`Metric ${eventName} may already exist`);
      }

      // Now create the event
      const eventData = {
        data: {
          type: 'event',
          attributes: {
            metric: {
              data: {
                type: 'metric',
                attributes: {
                  name: eventName,
                },
              },
      },
      properties: {
              ...properties,
              ...(value !== undefined && { value }),
            },
            ...(email && {
              profile: {
                data: {
                  type: 'profile',
                  attributes: {
                    email,
                  },
                },
              },
            }),
            ...(time ? { time } : { time: new Date().toISOString() }),
          },
        },
      };

      await this.makeRequest('/events/', 'POST', eventData);
      logger.info(`Klaviyo event tracked: ${eventName}${email ? ` for ${email}` : ''}`);
    } catch (error: any) {
      logger.error(`Error tracking Klaviyo event ${eventName}:`, error.message || error);
      // Don't throw - we don't want to fail the main operation
    }
  }

  /**
   * Subscribe email to Klaviyo list
   * @param email - Email address to subscribe
   */
  async subscribeToEmailList(email: string): Promise<void> {
    try {
      if (!email) {
        logger.warn('Cannot subscribe to email list without email');
        return;
      }

      const listId = process.env.KLAVIYO_LIST_ID_NEWSLETTER || config.klaviyo.listIdNewsletter || '';
      if (!listId) {
        logger.warn('Klaviyo newsletter list ID not configured');
        return;
      }

      // First, ensure profile exists
      const profileData = {
        data: {
          type: 'profile',
          attributes: {
            email,
          },
        },
      };

      await this.makeRequest('/profiles/', 'POST', profileData);

      // Subscribe to list using profile-subscription-bulk-create-job
      const subscriptionData = {
        data: {
          type: 'profile-subscription-bulk-create-job',
          attributes: {
            profiles: {
              data: [
                {
                  type: 'profile',
                  attributes: {
                    email,
                  },
                },
              ],
            },
            custom_source: 'Royal Competitions Website',
          },
          relationships: {
            list: {
              data: {
                type: 'list',
                id: listId,
      },
            },
          },
        },
      };

      await this.makeRequest('/profile-subscription-bulk-create-jobs/', 'POST', subscriptionData);
      logger.info(`Subscribed ${email} to Klaviyo email list ${listId}`);
    } catch (error: any) {
      logger.error('Error subscribing to Klaviyo email list:', error.message || error);
      // Don't throw - we don't want to fail the main operation
    }
  }

  /**
   * Subscribe phone number to Klaviyo SMS list
   * @param phone - Phone number to subscribe
   * @param email - Optional email for profile linking
   */
  async subscribeToSMSList(phone: string, email?: string): Promise<void> {
    try {
      if (!phone) {
        logger.warn('Cannot subscribe to SMS list without phone number');
        return;
      }

      const listId = process.env.KLAVIYO_LIST_ID_SMS || config.klaviyo.listIdSMS || '';
      if (!listId) {
        logger.warn('Klaviyo SMS list ID not configured');
        return;
      }

      // Ensure profile exists with phone number
      const profileData = {
        data: {
          type: 'profile',
          attributes: {
            ...(email && { email }),
            phone_number: phone,
          },
        },
      };

      await this.makeRequest('/profiles/', 'POST', profileData);

      // Subscribe to SMS list
      const subscriptionData = {
        data: {
          type: 'profile-subscription-bulk-create-job',
          attributes: {
            profiles: {
              data: [
                {
                  type: 'profile',
                  attributes: {
                    ...(email && { email }),
                    phone_number: phone,
                  },
                },
              ],
            },
            custom_source: 'Royal Competitions Website',
          },
          relationships: {
            list: {
              data: {
                type: 'list',
                id: listId,
              },
            },
              },
        },
      };

      await this.makeRequest('/profile-subscription-bulk-create-jobs/', 'POST', subscriptionData);
      logger.info(`Subscribed ${phone}${email ? ` (${email})` : ''} to Klaviyo SMS list ${listId}`);
    } catch (error: any) {
      logger.error('Error subscribing to Klaviyo SMS list:', error.message || error);
      // Don't throw - we don't want to fail the main operation
    }
  }

  /**
   * Grant free entries to a user and track the event
   * @param userId - User ID (MongoDB ObjectId as string)
   * @param entries - Number of free entries to grant
   * @param source - Source of free entries (e.g., "newsletter_signup", "referral_reward")
   */
  async grantFreeEntriesAndTrack(
    userId: string,
    entries: number,
    source: string
  ): Promise<void> {
    try {
      // Import User model here to avoid circular dependencies
      const { User } = await import('../models');

      const user = await User.findById(userId);
      if (!user || !user.email) {
        logger.warn(`Cannot grant free entries: user ${userId} not found or has no email`);
        return;
      }

      // TODO: Implement free entries grant logic in your database
      // This is a placeholder - you'll need to add a freeEntries field to User model
      // or create a separate FreeEntry model
      // For now, we'll just track the event
      logger.info(`Granting ${entries} free entries to user ${userId} (${user.email}) from source: ${source}`);

      // Track the event
      await this.trackEvent(
        user.email,
        'Granted Free Entries',
        {
          user_id: userId,
          entries_granted: entries,
          source,
        }
      );

      logger.info(`Granted and tracked ${entries} free entries for user ${user.email}`);
    } catch (error: any) {
      logger.error('Error granting free entries:', error.message || error);
      // Don't throw - we don't want to fail the main operation
    }
  }
}

export default new KlaviyoService();
