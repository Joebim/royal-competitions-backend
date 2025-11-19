import checkoutNodeJssdk from '@paypal/checkout-server-sdk';
import { config } from '../config/environment';
import logger from '../utils/logger';
import { ApiError } from '../utils/apiError';

interface CreateOrderData {
  amount: number; // Amount in pence
  currency?: string;
  orderId?: string;
  userId?: string;
  competitionId?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

/**
 * Create PayPal client instance
 */
function paypalClient() {
  const environment =
    config.paypal.mode === 'live'
      ? new checkoutNodeJssdk.core.LiveEnvironment(
          config.paypal.clientId,
          config.paypal.clientSecret
        )
      : new checkoutNodeJssdk.core.SandboxEnvironment(
          config.paypal.clientId,
          config.paypal.clientSecret
        );

  return new checkoutNodeJssdk.core.PayPalHttpClient(environment);
}

class PayPalService {

  /**
   * Create PayPal order
   */
  async createOrder(data: CreateOrderData): Promise<any> {
    try {
      const client = paypalClient();
      
      // Convert pence to currency amount (e.g., 365 pence = 3.65 GBP)
      const amountValue = (data.amount / 100).toFixed(2);

      const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
      request.prefer('return=representation');
      
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: data.orderId || 'ORDER_REF',
            amount: {
              currency_code: data.currency?.toUpperCase() || 'GBP',
              value: amountValue,
            },
            description: `Competition Entry - Order ${data.orderId || ''}`,
          },
        ],
        application_context: {
          brand_name: 'Royal Competitions',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          ...(data.returnUrl && { return_url: data.returnUrl }),
          ...(data.cancelUrl && { cancel_url: data.cancelUrl }),
        },
      });

      const response = await client.execute(request);

      logger.info(`PayPal order created: ${response.result.id}`);
      return response.result;
    } catch (error: any) {
      logger.error('PayPal create order error:', error);
      throw new ApiError('Failed to create PayPal order', 500);
    }
  }

  /**
   * Capture PayPal order (complete payment)
   */
  async captureOrder(orderId: string): Promise<any> {
    try {
      const client = paypalClient();

      const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderId);
      request.prefer('return=representation');

      const response = await client.execute(request);

      logger.info(`PayPal order captured: ${orderId}`);
      return response.result;
    } catch (error: any) {
      logger.error('PayPal capture order error:', error);
      throw new ApiError('Failed to capture PayPal order', 500);
    }
  }

  /**
   * Get PayPal order details
   */
  async getOrder(orderId: string): Promise<any> {
    try {
      const client = paypalClient();

      const request = new checkoutNodeJssdk.orders.OrdersGetRequest(orderId);

      const response = await client.execute(request);

      return response.result;
    } catch (error: any) {
      logger.error('PayPal get order error:', error);
      throw new ApiError('Failed to get PayPal order', 500);
    }
  }

  /**
   * Refund PayPal payment
   */
  async createRefund(captureId: string, amount?: number, currency: string = 'GBP'): Promise<any> {
    try {
      const client = paypalClient();

      const request = new checkoutNodeJssdk.payments.CapturesRefundRequest(captureId);
      request.prefer('return=representation');

      if (amount) {
        request.requestBody({
          amount: {
            value: (amount / 100).toFixed(2),
            currency_code: currency.toUpperCase(),
          },
        });
      }

      const response = await client.execute(request);

      logger.info(`PayPal refund created: ${response.result.id}`);
      return response.result;
    } catch (error: any) {
      logger.error('PayPal create refund error:', error);
      throw new ApiError('Failed to create PayPal refund', 500);
    }
  }

  /**
   * Verify webhook signature
   * Note: PayPal SDK doesn't have webhook verification built-in
   * This uses the REST API directly for webhook verification
   */
  async verifyWebhookSignature(
    headers: Record<string, string>,
    body: string,
    webhookId: string
  ): Promise<boolean> {
    try {
      // For webhook verification, we still need to use REST API
      // as the SDK doesn't provide webhook verification methods
      const axios = require('axios');
      const baseUrl = config.paypal.baseUrl;
      
      // Get access token for webhook verification
      const auth = Buffer.from(`${config.paypal.clientId}:${config.paypal.clientSecret}`).toString('base64');
      const tokenResponse = await axios.post(
        `${baseUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const accessToken = tokenResponse.data.access_token;

      const response = await axios.post(
        `${baseUrl}/v1/notifications/verify-webhook-signature`,
        {
          auth_algo: headers['paypal-auth-algo'],
          cert_url: headers['paypal-cert-url'],
          transmission_id: headers['paypal-transmission-id'],
          transmission_sig: headers['paypal-transmission-sig'],
          transmission_time: headers['paypal-transmission-time'],
          webhook_id: webhookId,
          webhook_event: JSON.parse(body),
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.verification_status === 'SUCCESS';
    } catch (error: any) {
      logger.error('PayPal webhook verification error:', error);
      return false;
    }
  }
}

export default new PayPalService();

