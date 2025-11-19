# Stripe to PayPal Migration Guide

This document provides a comprehensive guide for migrating from Stripe to PayPal payment processing in both the backend and frontend.

## Table of Contents

1. [Backend Migration](#backend-migration)
2. [Frontend Migration](#frontend-migration)
3. [Environment Variables](#environment-variables)
4. [API Changes](#api-changes)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

---

## Backend Migration

### Step 1: Install Dependencies

Install the PayPal SDK:

```bash
npm install @paypal/checkout-server-sdk
```

The PayPal service uses the official PayPal SDK for all API interactions.

### Step 2: Update Environment Variables

Add PayPal credentials to your `.env` file:

```env
# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com  # Use https://api-m.paypal.com for production
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id
```

**Note**:

- Sandbox URL: `https://api-m.sandbox.paypal.com`
- Production URL: `https://api-m.paypal.com`

### Step 3: Update Order Controller

Replace Stripe service with PayPal service in `src/controllers/order.controller.ts`:

**Before:**

```typescript
import stripeService from '../services/stripe.service';

// Create payment intent
const paymentIntent = await stripeService.createPaymentIntent({
  amount: amountPence,
  currency: 'gbp',
  metadata: {
    orderId: orderId,
    competitionId: competitionId,
    userId: req.user?._id?.toString() || 'guest',
  },
});

order.stripePaymentIntent = paymentIntent.id;
```

**After:**

```typescript
import paypalService from '../services/paypal.service';

// Create PayPal order
const paypalOrder = await paypalService.createOrder({
  amount: amountPence,
  currency: 'GBP',
  orderId: orderId,
  competitionId: competitionId,
  userId: req.user?._id?.toString() || 'guest',
  returnUrl: `${config.frontendUrl}/payment/success?orderId=${orderId}`,
  cancelUrl: `${config.frontendUrl}/payment/cancel?orderId=${orderId}`,
});

order.paypalOrderId = paypalOrder.id;
```

**Update Response:**

```typescript
res.status(201).json(
  ApiResponse.success(
    {
      order: formatOrderResponse(order),
      paypalOrderId: paypalOrder.id,
      approvalUrl: paypalOrder.links.find((link: any) => link.rel === 'approve')
        ?.href,
    },
    'Order created successfully'
  )
);
```

### Step 4: Update Payment Controller

Replace the entire `src/controllers/payment.controller.ts`:

**Key Changes:**

1. **Create Payment Intent → Create PayPal Order:**

```typescript
// Before
const paymentIntent = await stripeService.createPaymentIntent({...});

// After
const paypalOrder = await paypalService.createOrder({
  amount: order.amountPence,
  returnUrl: `${config.frontendUrl}/payment/success?orderId=${orderId}`,
  cancelUrl: `${config.frontendUrl}/payment/cancel?orderId=${orderId}`,
});
```

2. **Webhook Handler:**

```typescript
// Before - Stripe webhook
export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const event = stripeService.constructWebhookEvent(req.body, sig);

  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object);
      break;
  }
};

// After - PayPal webhook
export const handleWebhook = async (req: Request, res: Response) => {
  const verified = await paypalService.verifyWebhookSignature(
    req.headers as any,
    JSON.stringify(req.body),
    config.paypal.webhookId
  );

  if (!verified) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const event = req.body;

  switch (event.event_type) {
    case 'PAYMENT.CAPTURE.COMPLETED':
      await handlePaymentSuccess(event.resource);
      break;
    case 'PAYMENT.CAPTURE.DENIED':
      await handlePaymentFailure(event.resource);
      break;
  }
};
```

3. **Payment Success Handler:**

```typescript
// Before
export async function handlePaymentSuccess(paymentIntent: any) {
  const orderId = paymentIntent.metadata.orderId;
  // ...
}

// After
export async function handlePaymentSuccess(capture: any) {
  // Find order by PayPal order ID
  const paypalOrderId = capture.supplementary_data?.related_ids?.order_id;
  const order = await Order.findOne({ paypalOrderId });

  if (!order) {
    logger.error(`Order not found for PayPal order ${paypalOrderId}`);
    return;
  }

  // Rest of the logic remains the same
  order.status = OrderStatus.COMPLETED;
  order.paymentStatus = OrderPaymentStatus.PAID;
  order.paymentReference = capture.id;
  // ...
}
```

### Step 5: Update Checkout Controller

In `src/controllers/checkout.controller.ts`, replace Stripe calls with PayPal:

```typescript
import paypalService from '../services/paypal.service';

// Replace all stripeService calls with paypalService
const paypalOrder = await paypalService.createOrder({
  amount: order.amountPence,
  currency: 'GBP',
  orderId: String(order._id),
  returnUrl: `${config.frontendUrl}/checkout/success`,
  cancelUrl: `${config.frontendUrl}/checkout/cancel`,
});

order.paypalOrderId = paypalOrder.id;
// Return orderID to frontend
// paypalOrder.id is the orderID
```

### Step 6: Update App Routes

In `src/app.ts`, update webhook route:

```typescript
// Before
import { handleWebhook as stripeWebhookHandler } from './controllers/payment.controller';

app.post(
  '/api/v1/payments/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler
);

// After
import { handleWebhook as paypalWebhookHandler } from './controllers/payment.controller';

app.post('/api/v1/payments/webhook', express.json(), paypalWebhookHandler);
```

**Note**: PayPal webhooks use JSON, not raw body like Stripe.

### Step 8: Update Order Model

The Order model has been updated to include `paypalOrderId`. The `stripePaymentIntent` field is kept for backward compatibility but is deprecated.

**Changes made:**

- Added `paypalOrderId?: string` field
- Added index on `paypalOrderId` for faster lookups
- `stripePaymentIntent` marked as deprecated but kept for migration period

---

## Frontend Migration

See the complete frontend integration guide: **[PAYPAL_FRONTEND_INTEGRATION.md](./PAYPAL_FRONTEND_INTEGRATION.md)**

### Quick Summary:

### Step 1: Remove Stripe Dependencies

```bash
npm uninstall @stripe/stripe-js @stripe/react-stripe-js
```

### Step 2: Install PayPal SDK

```bash
npm install @paypal/react-paypal-js
```

### Step 3: Update Payment Component

**Before (Stripe):**

```typescript
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function PaymentForm({ clientSecret }: { clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement)!,
      },
    });

    if (error) {
      console.error(error);
    } else if (paymentIntent?.status === 'succeeded') {
      // Redirect to success page
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit">Pay</button>
    </form>
  );
}
```

**After (PayPal):**

```typescript
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

function PaymentForm({ orderId, amount }: { orderId: string; amount: number }) {
  const handleApprove = async (data: any, actions: any) => {
    // Capture the payment
    const order = await actions.order.capture();

    // Call your backend to verify and process
    const response = await fetch(`/api/v1/payments/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: data.orderID,
        captureId: order.purchase_units[0].payments.captures[0].id,
      }),
    });

    if (response.ok) {
      // Redirect to success page
      window.location.href = `/payment/success?orderId=${orderId}`;
    }
  };

  return (
    <PayPalButtons
      createOrder={(data, actions) => {
        return actions.order.create({
          purchase_units: [
            {
              amount: {
                value: (amount / 100).toFixed(2), // Convert pence to pounds
                currency_code: 'GBP',
              },
            },
          ],
        });
      }}
      onApprove={handleApprove}
      onError={(err) => {
        console.error('PayPal error:', err);
      }}
      onCancel={() => {
        window.location.href = `/payment/cancel?orderId=${orderId}`;
      }}
    />
  );
}
```

### Step 4: Update Order Creation Flow

**Before:**

```typescript
// Create order
const orderResponse = await fetch('/api/v1/orders', {
  method: 'POST',
  body: JSON.stringify(orderData),
});

const { clientSecret } = await orderResponse.json();

// Use clientSecret with Stripe
```

**After:**

```typescript
// Create order
const orderResponse = await fetch('/api/v1/orders', {
  method: 'POST',
  body: JSON.stringify(orderData),
});

const { paypalOrderId, approvalUrl } = await orderResponse.json();

// Option 1: Use approvalUrl to redirect
window.location.href = approvalUrl;

// Option 2: Use PayPal Buttons component (recommended)
// Pass orderId to PaymentForm component
```

### Step 5: Update Environment Variables

Remove Stripe keys and add PayPal client ID:

```env
# Remove
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Add
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id
```

### Step 6: Wrap App with PayPal Provider

```typescript
import { PayPalScriptProvider } from '@paypal/react-paypal-js';

function App() {
  return (
    <PayPalScriptProvider
      options={{
        'client-id': process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
        currency: 'GBP',
        intent: 'capture',
      }}
    >
      {/* Your app */}
    </PayPalScriptProvider>
  );
}
```

### Step 7: Update Payment Success/Cancel Pages

**Success Page:**

```typescript
// Before - Stripe handles this via webhook
// After - Need to verify payment on page load

useEffect(() => {
  const verifyPayment = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const payerId = urlParams.get('PayerID');

    if (token && payerId) {
      // Call backend to capture payment
      await fetch('/api/v1/payments/capture', {
        method: 'POST',
        body: JSON.stringify({ token, payerId }),
      });
    }
  };

  verifyPayment();
}, []);
```

---

## Environment Variables

### Backend (.env)

```env
# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com  # or https://api-m.paypal.com for production
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id

# Optional: Keep Stripe for backward compatibility during migration
# STRIPE_SECRET_KEY=...
# STRIPE_PUBLISHABLE_KEY=...
# STRIPE_WEBHOOK_SECRET=...
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id

# Remove Stripe
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
```

---

## API Changes

### Order Creation Response

**Before (Stripe):**

```json
{
  "success": true,
  "data": {
    "order": { ... },
    "clientSecret": "pi_xxx_secret_xxx"
  }
}
```

**After (PayPal):**

```json
{
  "success": true,
  "data": {
    "order": { ... },
    "paypalOrderId": "5O190127TN364715T",
    "approvalUrl": "https://www.sandbox.paypal.com/checkoutnow?token=..."
  }
}
```

### Payment Webhook Events

**Before (Stripe):**

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

**After (PayPal):**

- `PAYMENT.CAPTURE.COMPLETED`
- `PAYMENT.CAPTURE.DENIED`
- `PAYMENT.CAPTURE.REFUNDED`

### New Endpoints

**Capture Payment:**

```
POST /api/v1/payments/capture
Body: {
  "orderId": "5O190127TN364715T",
  "token": "EC-xxx",
  "payerId": "xxx"
}
```

---

## Testing

### PayPal Sandbox

1. Create a PayPal Developer account: https://developer.paypal.com
2. Create a sandbox app to get Client ID and Secret
3. Create test accounts (buyer and seller)
4. Use sandbox URLs for testing

### Test Cards (Not Applicable)

PayPal doesn't use test cards. Instead:

- Use sandbox test accounts
- PayPal provides test credentials in the dashboard

### Webhook Testing

1. Use PayPal's webhook simulator: https://developer.paypal.com/dashboard/webhooks
2. Or use ngrok to forward webhooks to localhost:
   ```bash
   ngrok http 5000
   # Add ngrok URL to PayPal webhook settings
   ```

### Test Flow

1. Create order → Get `paypalOrderId` and `approvalUrl`
2. Redirect user to `approvalUrl` or show PayPal buttons
3. User approves payment in PayPal
4. PayPal redirects to return URL
5. Backend webhook receives `PAYMENT.CAPTURE.COMPLETED`
6. Order status updated to `PAID`
7. Tickets issued

---

## Troubleshooting

### Common Issues

1. **"Invalid webhook signature"**
   - Verify `PAYPAL_WEBHOOK_ID` matches your webhook ID in PayPal dashboard
   - Check webhook URL is correct

2. **"Failed to create PayPal order"**
   - Verify Client ID and Secret are correct
   - Check base URL (sandbox vs production)
   - Ensure amount is in correct format (e.g., "3.65" not 365)

3. **Payment not capturing**
   - Verify return URL is accessible
   - Check webhook is receiving events
   - Verify order exists in database

4. **CORS Issues**
   - Add PayPal domains to allowed origins
   - Check frontend URL matches return URL

### Debugging

Enable detailed logging:

```typescript
logger.info('PayPal order created:', paypalOrder);
logger.info('Webhook received:', event);
```

Check PayPal dashboard:

- Transaction logs
- Webhook delivery status
- API logs

---

## Migration Checklist

### Backend

- [ ] Install PayPal service
- [ ] Update environment variables
- [ ] Update Order model
- [ ] Update Order controller
- [ ] Update Payment controller
- [ ] Update Checkout controller
- [ ] Update webhook route
- [ ] Test order creation
- [ ] Test payment capture
- [ ] Test webhooks
- [ ] Update documentation

### Frontend

- [ ] Remove Stripe dependencies
- [ ] Install PayPal SDK
- [ ] Update payment component
- [ ] Update order creation flow
- [ ] Update success/cancel pages
- [ ] Update environment variables
- [ ] Test payment flow
- [ ] Test error handling

### Deployment

- [ ] Update production environment variables
- [ ] Configure PayPal webhook in production
- [ ] Test end-to-end in production
- [ ] Monitor for errors
- [ ] Update API documentation

---

## Additional Resources

- [PayPal Developer Documentation](https://developer.paypal.com/docs)
- [PayPal Orders API](https://developer.paypal.com/docs/api/orders/v2/)
- [PayPal Webhooks](https://developer.paypal.com/docs/api-basics/notifications/webhooks/)
- [PayPal React SDK](https://github.com/paypal/react-paypal-js)

---

**Last Updated**: 2024
**Version**: 1.0.0
