import { SquareClient, SquareEnvironment } from 'square';
import { config } from '../config/environment';
import logger from '../utils/logger';
import { ApiError } from '../utils/apiError';
import { v4 as uuidv4 } from 'uuid';

interface CreatePaymentData {
  sourceId: string; // nonce/token from frontend
  amount: number; // Amount in decimal (e.g., 3.99)
  currency?: string;
  orderId?: string;
  userId?: string;
  competitionId?: string;
  customerId?: string;
  idempotencyKey?: string;
}

/**
 * Initialize Square client
 */
export const squareClient = new SquareClient({
  token: config.square.accessToken,
  environment:
    config.square.environment === 'production'
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox,
});

export const LOCATION_ID = config.square.locationId;

class SquareService {
  /**
   * Create Square payment
   */
  async createPayment(data: CreatePaymentData): Promise<any> {
    try {
      // Convert amount to smallest currency unit (cents/pence)
      const amountInCents = Math.round(data.amount * 100);

      const requestBody = {
        sourceId: data.sourceId,
        idempotencyKey: data.idempotencyKey || uuidv4(),
        amountMoney: {
          amount: BigInt(amountInCents),
          currency: (data.currency || 'GBP').toUpperCase() as any,
        },
        locationId: LOCATION_ID,
        autocomplete: true,
        note: `Competition Entry - Order ${data.orderId || ''}`,
        ...(data.customerId && { customerId: data.customerId }),
      };

      const response = await squareClient.payments.create(requestBody);

      if (response.payment) {
        logger.info(
          `Square payment created: ${response.payment.id} for order ${data.orderId}`
        );
        return response.payment;
      } else {
        throw new Error('Payment creation failed - no payment in response');
      }
    } catch (error: any) {
      logger.error('Square create payment error:', error);
      const errorMessage =
        error.errors?.map((e: any) => e.detail || e.message).join(', ') ||
        error.message ||
        'Failed to create Square payment';
      throw new ApiError(errorMessage, 500);
    }
  }

  /**
   * Get Square payment details
   */
  async getPayment(paymentId: string): Promise<any> {
    try {
      const response = await squareClient.payments.get({
        paymentId: paymentId,
      });

      if (response.payment) {
        return response.payment;
      } else {
        throw new Error('Payment not found');
      }
    } catch (error: any) {
      logger.error('Square get payment error:', error);
      const errorMessage =
        error.errors?.map((e: any) => e.detail || e.message).join(', ') ||
        error.message ||
        'Failed to get Square payment';
      throw new ApiError(errorMessage, 500);
    }
  }

  /**
   * Cancel Square payment
   * Note: Square payments can only be cancelled if they are in APPROVED status
   */
  async cancelPayment(paymentId: string): Promise<any> {
    try {
      const response = await squareClient.payments.cancel({
        paymentId: paymentId,
      });

      logger.info(`Square payment cancelled: ${paymentId}`);
      return response;
    } catch (error: any) {
      logger.error('Square cancel payment error:', error);
      const errorMessage =
        error.errors?.map((e: any) => e.detail || e.message).join(', ') ||
        error.message ||
        'Failed to cancel Square payment';
      throw new ApiError(errorMessage, 500);
    }
  }

  /**
   * Refund Square payment
   */
  async createRefund(
    paymentId: string,
    amount?: number,
    currency: string = 'GBP',
    reason?: string
  ): Promise<any> {
    try {
      // If amount is not provided, get the payment to refund the full amount
      let refundAmount = amount;
      if (!refundAmount) {
        const payment = await this.getPayment(paymentId);
        if (payment.amountMoney) {
          refundAmount = Number(payment.amountMoney.amount) / 100;
        } else {
          throw new ApiError(
            'Amount is required for refund. Payment amount could not be determined.',
            400
          );
        }
      }

      // Convert amount to smallest currency unit
      const amountInCents = Math.round(refundAmount * 100);

      const requestBody = {
        idempotencyKey: uuidv4(),
        amountMoney: {
          amount: BigInt(amountInCents),
          currency: currency.toUpperCase() as any,
        },
        paymentId: paymentId,
        ...(reason && { reason }),
      };

      const response = await squareClient.refunds.refundPayment(requestBody);

      if (response.refund) {
        logger.info(`Square refund created: ${response.refund.id}`);
        return response.refund;
      } else {
        throw new Error('Refund creation failed - no refund in response');
      }
    } catch (error: any) {
      logger.error('Square create refund error:', error);
      const errorMessage =
        error.errors?.map((e: any) => e.detail || e.message).join(', ') ||
        error.message ||
        'Failed to create Square refund';
      throw new ApiError(errorMessage, 500);
    }
  }

  /**
   * Verify webhook signature
   * Square webhook signature verification
   */
  async verifyWebhookSignature(
    headers: Record<string, string>,
    body: string,
    webhookUrl: string
  ): Promise<boolean> {
    try {
      // Square webhook signature verification
      // The signature is in the X-Square-Signature header
      const signature =
        headers['x-square-signature'] || headers['X-Square-Signature'];

      if (!signature) {
        logger.warn('Square webhook signature missing');
        return false;
      }

      // Square uses HMAC-SHA256 for webhook signatures
      // The signature is a base64-encoded HMAC-SHA256 hash of the webhook URL + body
      const crypto = require('crypto');
      const webhookSecret = config.square.webhookSecret;

      if (!webhookSecret) {
        logger.warn('Square webhook secret not configured');
        // In development, you might want to skip verification
        return config.nodeEnv === 'development';
      }

      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(webhookUrl + body);
      const calculatedSignature = hmac.digest('base64');

      const isValid = signature === calculatedSignature;

      if (!isValid) {
        logger.warn('Square webhook signature verification failed');
      }

      return isValid;
    } catch (error: any) {
      logger.error('Square webhook verification error:', error);
      return false;
    }
  }
}

export default new SquareService();
