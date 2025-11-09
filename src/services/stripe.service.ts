import stripe from '../config/stripe';
import { config } from '../config/environment';
import logger from '../utils/logger';
import { ApiError } from '../utils/apiError';

interface CreatePaymentIntentData {
  amount: number;
  currency?: string;
  customerId?: string;
  metadata?: Record<string, any>;
}

class StripeService {
  /**
   * Create payment intent
   */
  async createPaymentIntent(data: CreatePaymentIntentData): Promise<any> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(data.amount * 100), // Convert to pence
        currency: data.currency || 'gbp',
        customer: data.customerId,
        metadata: data.metadata || {},
        automatic_payment_methods: {
          enabled: true,
        },
      });

      logger.info(`Payment intent created: ${paymentIntent.id}`);
      return paymentIntent;
    } catch (error) {
      logger.error('Stripe create payment intent error:', error);
      throw new ApiError('Failed to create payment intent', 500);
    }
  }

  /**
   * Confirm payment intent
   */
  async confirmPaymentIntent(paymentIntentId: string): Promise<any> {
    try {
      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      logger.error('Stripe confirm payment error:', error);
      throw new ApiError('Failed to confirm payment', 500);
    }
  }

  /**
   * Get payment intent
   */
  async getPaymentIntent(paymentIntentId: string): Promise<any> {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      logger.error('Stripe get payment intent error:', error);
      throw new ApiError('Failed to get payment intent', 500);
    }
  }

  /**
   * Cancel payment intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<any> {
    try {
      const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
      logger.info(`Payment intent cancelled: ${paymentIntentId}`);
      return paymentIntent;
    } catch (error) {
      logger.error('Stripe cancel payment error:', error);
      throw new ApiError('Failed to cancel payment', 500);
    }
  }

  /**
   * Create customer
   */
  async createCustomer(data: {
    email: string;
    name?: string;
    metadata?: Record<string, any>;
  }): Promise<any> {
    try {
      const customer = await stripe.customers.create({
        email: data.email,
        name: data.name,
        metadata: data.metadata || {},
      });

      logger.info(`Stripe customer created: ${customer.id}`);
      return customer;
    } catch (error) {
      logger.error('Stripe create customer error:', error);
      throw new ApiError('Failed to create customer', 500);
    }
  }

  /**
   * Get customer
   */
  async getCustomer(customerId: string): Promise<any> {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      return customer;
    } catch (error) {
      logger.error('Stripe get customer error:', error);
      throw new ApiError('Failed to get customer', 500);
    }
  }

  /**
   * Create refund
   */
  async createRefund(data: {
    paymentIntentId: string;
    amount?: number;
    reason?: string;
  }): Promise<any> {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: data.paymentIntentId,
        amount: data.amount ? Math.round(data.amount * 100) : undefined,
        reason: data.reason as any,
      });

      logger.info(`Refund created: ${refund.id}`);
      return refund;
    } catch (error) {
      logger.error('Stripe create refund error:', error);
      throw new ApiError('Failed to create refund', 500);
    }
  }

  /**
   * Construct webhook event
   */
  constructWebhookEvent(payload: string | Buffer, signature: string): any {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        config.stripe.webhookSecret
      );
      return event;
    } catch (error) {
      logger.error('Stripe webhook error:', error);
      throw new ApiError('Webhook signature verification failed', 400);
    }
  }

  /**
   * Get balance
   */
  async getBalance(): Promise<any> {
    try {
      const balance = await stripe.balance.retrieve();
      return balance;
    } catch (error) {
      logger.error('Stripe get balance error:', error);
      throw new ApiError('Failed to get balance', 500);
    }
  }
}

export default new StripeService();




