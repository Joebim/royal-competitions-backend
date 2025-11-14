import { config } from '../config/environment';
import logger from '../utils/logger';

interface TrackEventData {
  event: string;
  customer_properties: {
    $email?: string;
    $phone_number?: string;
    $first_name?: string;
    $last_name?: string;
  };
  properties: {
    [key: string]: any;
  };
}

interface ProfileData {
  email?: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  [key: string]: any;
}

interface KlaviyoProfileResponse {
  data?: Array<{
    id: string;
    type: string;
    attributes?: {
      email?: string;
      phone_number?: string;
      [key: string]: any;
    };
  }>;
}

class KlaviyoService {
  private publicKey: string;
  private privateKey: string;
  private trackUrl = 'https://a.klaviyo.com/api/track';
  private profilesUrl = 'https://a.klaviyo.com/api/profiles';

  constructor() {
    this.publicKey = config.klaviyo.publicKey;
    this.privateKey = config.klaviyo.privateKey;
  }

  /**
   * Track an event in Klaviyo
   */
  async trackEvent(data: TrackEventData): Promise<void> {
    try {
      if (!this.publicKey) {
        logger.warn('Klaviyo public key not configured, skipping event tracking');
        return;
      }

      const payload = {
        token: this.publicKey,
        event: data.event,
        customer_properties: data.customer_properties,
        properties: data.properties,
        time: Math.floor(Date.now() / 1000), // Unix timestamp
      };

      const response = await fetch(this.trackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Klaviyo API error: ${response.status} ${errorText}`);
      }

      logger.info(`Klaviyo event tracked: ${data.event}`);
    } catch (error: any) {
      logger.error('Error tracking Klaviyo event:', error.message || error);
      // Don't throw - we don't want to fail the main operation if Klaviyo fails
    }
  }

  /**
   * Track ticket purchased event
   */
  async trackTicketPurchased(
    email: string,
    phone: string | undefined,
    competitionId: string,
    competitionTitle: string,
    ticketNumbers: number[],
    amountPence: number,
    firstName?: string,
    lastName?: string
  ): Promise<void> {
    await this.trackEvent({
      event: 'Ticket Purchased',
      customer_properties: {
        $email: email,
        $phone_number: phone,
        $first_name: firstName,
        $last_name: lastName,
      },
      properties: {
        competitionId,
        competitionTitle,
        ticketNumbers,
        amountPence,
        amountGBP: (amountPence / 100).toFixed(2),
        ticketCount: ticketNumbers.length,
      },
    });
  }

  /**
   * Track winner notification event
   */
  async trackWinnerNotification(
    email: string,
    phone: string | undefined,
    competitionId: string,
    competitionTitle: string,
    prize: string,
    ticketNumber: number,
    claimCode: string,
    firstName?: string,
    lastName?: string
  ): Promise<void> {
    await this.trackEvent({
      event: 'Winner Notification',
      customer_properties: {
        $email: email,
        $phone_number: phone,
        $first_name: firstName,
        $last_name: lastName,
      },
      properties: {
        competitionId,
        competitionTitle,
        prize,
        ticketNumber,
        claimCode,
      },
    });
  }

  /**
   * Update or create a profile in Klaviyo
   */
  async updateProfile(data: ProfileData): Promise<void> {
    try {
      if (!this.privateKey) {
        logger.warn('Klaviyo private key not configured, skipping profile update');
        return;
      }

      const headers = {
        'Authorization': `Klaviyo-API-Key ${this.privateKey}`,
        'revision': '2024-02-15',
        'Content-Type': 'application/json',
      };

      // Find or create profile by email
      if (data.email) {
        const profileId = await this.findProfileByEmail(data.email);
        
        if (profileId) {
          // Update existing profile
          const response = await fetch(`${this.profilesUrl}/${profileId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ data: { type: 'profile', attributes: data } }),
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Klaviyo API error: ${response.status} ${errorText}`);
          }
        } else {
          // Create new profile
          const response = await fetch(this.profilesUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              data: {
                type: 'profile',
                attributes: data,
              },
            }),
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Klaviyo API error: ${response.status} ${errorText}`);
          }
        }
      }
    } catch (error: any) {
      logger.error('Error updating Klaviyo profile:', error.message || error);
      // Don't throw - we don't want to fail the main operation if Klaviyo fails
    }
  }

  /**
   * Find profile by email
   */
  private async findProfileByEmail(email: string): Promise<string | null> {
    try {
      const headers = {
        'Authorization': `Klaviyo-API-Key ${this.privateKey}`,
        'revision': '2024-02-15',
        'Content-Type': 'application/json',
      };

      const response = await fetch(
        `${this.profilesUrl}?filter=equals(email,"${email}")`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Klaviyo API error: ${response.status}`);
      }

      const responseData = (await response.json()) as KlaviyoProfileResponse;

      if (responseData?.data && responseData.data.length > 0) {
        return responseData.data[0].id;
      }

      return null;
    } catch (error: any) {
      logger.error('Error finding Klaviyo profile:', error.message || error);
      return null;
    }
  }
}

const klaviyoService = new KlaviyoService();
export default klaviyoService;

