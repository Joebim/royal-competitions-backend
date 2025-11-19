# PayPal Integration Quick Reference

## Backend Files Created/Modified

### New Files
- `src/services/paypal.service.ts` - PayPal service implementation
- `src/controllers/payment.controller.paypal.example.ts` - Example PayPal payment controller

### Modified Files
- `src/config/environment.ts` - Added PayPal configuration
- `src/models/Order.model.ts` - Added `paypalOrderId` field
- `env.example` - Added PayPal environment variables

## Key Changes Summary

### 1. Order Model
- Added `paypalOrderId?: string` field
- `stripePaymentIntent` kept for backward compatibility (deprecated)

### 2. Environment Variables
```env
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com  # or https://api-m.paypal.com for production
PAYPAL_WEBHOOK_ID=your_webhook_id
```

### 3. Service Methods
- `createOrder()` - Creates PayPal order
- `captureOrder()` - Captures payment
- `getOrder()` - Gets order details
- `createRefund()` - Creates refund
- `verifyWebhookSignature()` - Verifies webhook

### 4. API Response Changes

**Order Creation:**
```json
{
  "paypalOrderId": "5O190127TN364715T",
  "approvalUrl": "https://www.sandbox.paypal.com/checkoutnow?token=..."
}
```

**Instead of:**
```json
{
  "clientSecret": "pi_xxx_secret_xxx"
}
```

## Frontend Changes

### Remove
- `@stripe/stripe-js`
- `@stripe/react-stripe-js`

### Install
- `@paypal/react-paypal-js`

### Key Code Changes

**Before (Stripe):**
```typescript
const { clientSecret } = await orderResponse.json();
// Use with Stripe Elements
```

**After (PayPal):**
```typescript
const { paypalOrderId, approvalUrl } = await orderResponse.json();
// Redirect to approvalUrl or use PayPal Buttons
```

## Webhook Events

| Stripe Event | PayPal Event |
|-------------|--------------|
| `payment_intent.succeeded` | `PAYMENT.CAPTURE.COMPLETED` |
| `payment_intent.payment_failed` | `PAYMENT.CAPTURE.DENIED` |
| `charge.refunded` | `PAYMENT.CAPTURE.REFUNDED` |

## Testing

### Sandbox URLs
- API: `https://api-m.sandbox.paypal.com`
- Checkout: `https://www.sandbox.paypal.com`

### Production URLs
- API: `https://api-m.paypal.com`
- Checkout: `https://www.paypal.com`

## Common Issues

1. **"Invalid webhook signature"**
   - Check `PAYPAL_WEBHOOK_ID` matches dashboard
   - Verify webhook URL is correct

2. **"Failed to create order"**
   - Verify Client ID/Secret
   - Check base URL (sandbox vs production)
   - Ensure amount format is correct (e.g., "3.65" not 365)

3. **Payment not capturing**
   - Verify return URL is accessible
   - Check webhook delivery in PayPal dashboard

## Next Steps

1. Replace `payment.controller.ts` with `payment.controller.paypal.example.ts`
2. Update `order.controller.ts` to use PayPal service
3. Update `checkout.controller.ts` to use PayPal service
4. Update frontend payment components
5. Configure PayPal webhook in dashboard
6. Test in sandbox
7. Deploy to production

