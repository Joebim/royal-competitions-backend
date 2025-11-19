# Frontend PayPal Migration Guide

Complete step-by-step guide for updating your frontend to use PayPal instead of Stripe.

## Table of Contents

1. [Overview](#overview)
2. [What Changed](#what-changed)
3. [Installation](#installation)
4. [API Endpoint Changes](#api-endpoint-changes)
5. [Code Migration Examples](#code-migration-examples)
6. [Complete Payment Flow](#complete-payment-flow)
7. [Error Handling](#error-handling)
8. [Migration Checklist](#migration-checklist)

---

## Overview

The backend has been migrated from Stripe to PayPal. This guide shows you exactly what to change in your frontend code.

### Key Changes Summary

| Component | Before (Stripe) | After (PayPal) |
|-----------|----------------|----------------|
| SDK | `@stripe/stripe-js` | `@paypal/react-paypal-js` |
| Payment UI | Stripe Elements | PayPal Buttons |
| Order Response | `clientSecret` | `orderID` |
| Payment Intent | `/create-intent` | `/create-order` |
| Payment Confirmation | Automatic (webhook) | `/capture-order` |

---

## What Changed

### 1. Order Creation Response

**Endpoint:** `POST /api/v1/orders`

#### Before (Stripe):
```json
{
  "success": true,
  "data": {
    "order": { ... },
    "clientSecret": "pi_xxx_secret_xxx"
  }
}
```

#### After (PayPal):
```json
{
  "success": true,
  "data": {
    "order": { ... },
    "paypalOrderId": "5O190127TN364715T",
    "orderID": "5O190127TN364715T"
  }
}
```

**Change:** Use `orderID` instead of `clientSecret`

---

### 2. Checkout from Cart Response

**Endpoint:** `POST /api/v1/checkout/cart`

#### Before (Stripe):
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "order_id",
        "competitionId": "...",
        "clientSecret": "pi_xxx_secret_xxx"
      }
    ]
  }
}
```

#### After (PayPal):
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "order_id",
        "competitionId": "...",
        "paypalOrderId": "5O190127TN364715T",
        "orderID": "5O190127TN364715T"
      }
    ]
  }
}
```

**Change:** Use `orderID` from each order object

---

### 3. Payment Intent Endpoint (REMOVED)

**Endpoint:** `POST /api/v1/payments/create-intent` ❌ **NO LONGER EXISTS**

**Action:** Remove all calls to this endpoint

---

### 4. New PayPal Endpoints

#### A. Create PayPal Order
**Endpoint:** `POST /api/v1/payments/create-order`

**Request:**
```json
{
  "amount": 365,  // Amount in pence (optional if orderId provided)
  "orderId": "internal_order_id"  // Optional - links to existing order
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderID": "5O190127TN364715T",
    "paypalOrderId": "5O190127TN364715T"
  }
}
```

**When to use:**
- If you need to create a PayPal order separately from order creation
- If order was created without PayPal order ID

---

#### B. Capture Payment
**Endpoint:** `POST /api/v1/payments/capture-order`

**Request:**
```json
{
  "orderID": "5O190127TN364715T",  // From PayPal Buttons onApprove
  "orderId": "internal_order_id"   // Optional - our internal order ID
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "success",
    "orderId": "internal_order_id",
    "captureId": "capture_id",
    "paypalOrderId": "5O190127TN364715T"
  }
}
```

**When to use:**
- Called in PayPal Buttons `onApprove` callback
- Required to complete the payment

---

#### C. Confirm Payment
**Endpoint:** `POST /api/v1/payments/confirm`

**Note:** This is an alias for `/capture-order` - same request/response format.

---

## Installation

### Step 1: Remove Stripe Dependencies

```bash
npm uninstall @stripe/stripe-js @stripe/react-stripe-js
```

### Step 2: Install PayPal SDK

```bash
npm install @paypal/react-paypal-js
```

### Step 3: Get PayPal Client ID

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard)
2. Create or select your app
3. Copy the **Client ID** (Sandbox for testing, Live for production)

### Step 4: Add Environment Variable

```env
# .env.local or .env
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id_here
```

**Important:** Use `NEXT_PUBLIC_` prefix to make it available in the browser.

---

## API Endpoint Changes

### Endpoint Comparison Table

| Old Endpoint (Stripe) | New Endpoint (PayPal) | Status |
|----------------------|---------------------|--------|
| `POST /api/v1/payments/create-intent` | `POST /api/v1/payments/create-order` | ✅ Replaced |
| `POST /api/v1/payments/webhook` | `POST /api/v1/payments/webhook` | ✅ Updated (PayPal webhook) |
| N/A | `POST /api/v1/payments/capture-order` | ✅ New |
| N/A | `POST /api/v1/payments/confirm` | ✅ New (alias) |

### Unchanged Endpoints

These endpoints remain the same:
- `POST /api/v1/orders` - Still works, but response changed
- `POST /api/v1/checkout/cart` - Still works, but response changed
- `GET /api/v1/orders/:id` - No changes
- All other endpoints - No changes

---

## Code Migration Examples

### Example 1: Order Creation Flow

#### Before (Stripe):
```typescript
// 1. Create order
const createOrder = async (orderData: any) => {
  const response = await fetch('/api/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(orderData),
  });
  const result = await response.json();
  return result.data;
};

// 2. Get clientSecret
const { order, clientSecret } = await createOrder({
  competitionId: '...',
  qty: 2,
  ticketsReserved: [1, 2],
  billingDetails: { ... },
  shippingAddress: { ... },
});

// 3. Use with Stripe Elements
<Elements stripe={stripePromise}>
  <CheckoutForm clientSecret={clientSecret} />
</Elements>
```

#### After (PayPal):
```typescript
// 1. Create order (same as before)
const createOrder = async (orderData: any) => {
  const response = await fetch('/api/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(orderData),
  });
  const result = await response.json();
  return result.data;
};

// 2. Get orderID (instead of clientSecret)
const { order, orderID } = await createOrder({
  competitionId: '...',
  qty: 2,
  ticketsReserved: [1, 2],
  billingDetails: { ... },
  shippingAddress: { ... },
});

// 3. Use with PayPal Buttons
<PayPalButtons
  createOrder={() => orderID}
  onApprove={async (data) => {
    await capturePayment(data.orderID, order.id);
  }}
  onError={(err) => {
    console.error('PayPal error:', err);
  }}
/>
```

---

### Example 2: Cart Checkout Flow

#### Before (Stripe):
```typescript
// Checkout from cart
const checkoutResponse = await fetch('/api/v1/checkout/cart', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    billingDetails: { ... },
    shippingAddress: { ... },
  }),
});

const { orders } = await checkoutResponse.json().data;

// Render Stripe Elements for each order
orders.forEach((order: any) => {
  renderStripeForm(order.clientSecret);
});
```

#### After (PayPal):
```typescript
// Checkout from cart (same endpoint)
const checkoutResponse = await fetch('/api/v1/checkout/cart', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    billingDetails: { ... },
    shippingAddress: { ... },
  }),
});

const { orders } = await checkoutResponse.json().data;

// Render PayPal Buttons for each order
orders.forEach((order: any) => {
  renderPayPalButtons(order.orderID, order.id);
});

// Helper function
const renderPayPalButtons = (orderID: string, internalOrderId: string) => {
  return (
    <PayPalButtons
      createOrder={() => orderID}
      onApprove={async (data) => {
        await capturePayment(data.orderID, internalOrderId);
      }}
    />
  );
};
```

---

### Example 3: Payment Capture Function

#### New Function (Required):
```typescript
// Capture PayPal payment
const capturePayment = async (
  paypalOrderID: string,
  internalOrderId?: string
) => {
  try {
    const response = await fetch('/api/v1/payments/capture-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        orderID: paypalOrderID,
        orderId: internalOrderId, // Optional
      }),
    });

    const result = await response.json();

    if (result.success) {
      // Payment successful
      console.log('Payment captured:', result.data);
      // Redirect to success page or show success message
      return result.data;
    } else {
      throw new Error(result.message || 'Payment capture failed');
    }
  } catch (error) {
    console.error('Capture payment error:', error);
    throw error;
  }
};
```

---

## Complete Payment Flow

### Flow Diagram

```
User clicks "Pay"
    ↓
Create Order (POST /api/v1/orders)
    ↓
Get orderID from response
    ↓
Render PayPal Buttons with orderID
    ↓
User approves payment in PayPal
    ↓
onApprove callback fires
    ↓
Capture Payment (POST /api/v1/payments/capture-order)
    ↓
Payment Complete ✅
```

### Complete Implementation Example

```typescript
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';

// Component
const PaymentPage = () => {
  const [orderID, setOrderID] = useState<string | null>(null);
  const [internalOrderId, setInternalOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Create order
  const handleCreateOrder = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          competitionId: '6919aa951f3d63a8102600fa',
          qty: 12,
          ticketsReserved: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
          billingDetails: {
            firstName: 'Joseph',
            lastName: 'Akinwole',
            email: 'joseph.akinwole.me@gmail.com',
          },
          shippingAddress: {
            line1: '20, River Jordan Street, Ayobo, Lagos.',
            line2: 'Futa South Gate',
            city: 'Lagos',
            postalCode: '100001',
            country: 'NG',
          },
          marketingOptIn: true,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setOrderID(result.data.orderID);
        setInternalOrderId(result.data.order.id);
      } else {
        throw new Error(result.message || 'Failed to create order');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Capture payment
  const handleCapturePayment = async (paypalOrderID: string) => {
    try {
      const response = await fetch('/api/v1/payments/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderID: paypalOrderID,
          orderId: internalOrderId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Payment successful!
        console.log('Payment captured:', result.data);
        // Redirect to success page
        window.location.href = `/payment/success?orderId=${result.data.orderId}`;
      } else {
        throw new Error(result.message || 'Payment capture failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to capture payment');
      throw err;
    }
  };

  return (
    <PayPalScriptProvider
      options={{
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
        currency: 'GBP',
      }}
    >
      <div>
        {!orderID ? (
          <button onClick={handleCreateOrder} disabled={loading}>
            {loading ? 'Creating Order...' : 'Create Order & Pay'}
          </button>
        ) : (
          <PayPalButtons
            createOrder={() => orderID}
            onApprove={async (data) => {
              try {
                await handleCapturePayment(data.orderID);
              } catch (error) {
                console.error('Payment error:', error);
              }
            }}
            onError={(err) => {
              setError('PayPal error: ' + err.message);
            }}
            onCancel={() => {
              setError('Payment cancelled by user');
            }}
          />
        )}

        {error && <div className="error">{error}</div>}
      </div>
    </PayPalScriptProvider>
  );
};
```

---

## Error Handling

### Common Errors and Solutions

#### 1. "Failed to create PayPal order"
**Cause:** PayPal service error or invalid amount
**Solution:** Check amount is in pence, verify PayPal credentials

#### 2. "PayPal orderID is required"
**Cause:** Missing orderID in capture request
**Solution:** Ensure you're passing `orderID` from PayPal Buttons `onApprove`

#### 3. "Order not found"
**Cause:** Internal order ID doesn't exist
**Solution:** Verify order was created successfully before payment

#### 4. "Payment capture failed"
**Cause:** PayPal order already captured or invalid
**Solution:** Check if payment was already processed (idempotency)

### Error Handling Example

```typescript
const handlePayment = async () => {
  try {
    // Create order
    const orderResult = await createOrder(...);
    
    if (!orderResult.orderID) {
      throw new Error('Failed to get PayPal order ID');
    }

    // Use PayPal Buttons
    return orderResult.orderID;
  } catch (error: any) {
    if (error.message.includes('PayPal')) {
      // PayPal-specific error
      showError('Payment service error. Please try again.');
    } else if (error.message.includes('Order')) {
      // Order-related error
      showError('Order creation failed. Please check your details.');
    } else {
      // Generic error
      showError('An error occurred. Please try again.');
    }
    throw error;
  }
};
```

---

## Migration Checklist

### Phase 1: Preparation
- [ ] Remove Stripe dependencies (`@stripe/stripe-js`, `@stripe/react-stripe-js`)
- [ ] Install PayPal SDK (`@paypal/react-paypal-js`)
- [ ] Get PayPal Client ID from PayPal Developer Dashboard
- [ ] Add `NEXT_PUBLIC_PAYPAL_CLIENT_ID` to environment variables
- [ ] Test PayPal sandbox credentials

### Phase 2: Code Updates
- [ ] Update order creation response handling (use `orderID` instead of `clientSecret`)
- [ ] Update cart checkout response handling (use `orderID` from each order)
- [ ] Remove all calls to `/api/v1/payments/create-intent`
- [ ] Add PayPal Buttons component setup
- [ ] Implement payment capture function
- [ ] Update payment success/cancel handlers

### Phase 3: Component Updates
- [ ] Replace Stripe Elements with PayPal Buttons
- [ ] Update payment form components
- [ ] Update checkout page
- [ ] Update order confirmation page
- [ ] Update error messages and UI

### Phase 4: Testing
- [ ] Test order creation flow
- [ ] Test cart checkout flow
- [ ] Test payment approval flow
- [ ] Test payment cancellation flow
- [ ] Test error handling
- [ ] Test with PayPal sandbox
- [ ] Verify webhook handling (backend handles this)

### Phase 5: Production
- [ ] Switch to PayPal Live credentials
- [ ] Update `NEXT_PUBLIC_PAYPAL_CLIENT_ID` to production value
- [ ] Test with real PayPal account
- [ ] Monitor payment success rates
- [ ] Set up PayPal webhook URL in PayPal dashboard

---

## Quick Reference

### API Endpoints

| Endpoint | Method | Purpose | Request Body |
|----------|--------|---------|--------------|
| `/api/v1/orders` | POST | Create order | Order data |
| `/api/v1/checkout/cart` | POST | Checkout from cart | Billing/shipping |
| `/api/v1/payments/create-order` | POST | Create PayPal order | `{ amount, orderId? }` |
| `/api/v1/payments/capture-order` | POST | Capture payment | `{ orderID, orderId? }` |
| `/api/v1/payments/confirm` | POST | Confirm payment (alias) | `{ orderID, orderId? }` |

### Response Fields

| Field | Type | Description | Usage |
|-------|------|-------------|-------|
| `orderID` | string | PayPal order ID | Use with PayPal Buttons |
| `paypalOrderId` | string | Same as orderID | Alias for consistency |
| `order.id` | string | Internal order ID | Optional for capture |

### PayPal Buttons Props

```typescript
<PayPalButtons
  createOrder={() => orderID}  // Required: Return PayPal orderID
  onApprove={async (data) => {
    // Required: Capture payment
    await capturePayment(data.orderID);
  }}
  onError={(err) => {
    // Optional: Handle errors
  }}
  onCancel={() => {
    // Optional: Handle cancellation
  }}
/>
```

---

## Common Patterns

### Pattern 1: Order Already Created

```typescript
// Order was created earlier, now just need to pay
const { orderID } = existingOrder;

<PayPalButtons
  createOrder={() => orderID}
  onApprove={async (data) => {
    await capturePayment(data.orderID, existingOrder.id);
  }}
/>
```

### Pattern 2: Create Order and Pay in One Flow

```typescript
// Create order, then immediately show PayPal Buttons
const handleCheckout = async () => {
  const order = await createOrder(...);
  setOrderID(order.orderID);
  setInternalOrderId(order.id);
};

{orderID && (
  <PayPalButtons
    createOrder={() => orderID}
    onApprove={async (data) => {
      await capturePayment(data.orderID, internalOrderId);
    }}
  />
)}
```

### Pattern 3: Multiple Orders from Cart

```typescript
// Handle multiple orders from cart checkout
const { orders } = await checkoutFromCart(...);

orders.map((order: any) => (
  <div key={order.id}>
    <h3>{order.competitionTitle}</h3>
    <PayPalButtons
      createOrder={() => order.orderID}
      onApprove={async (data) => {
        await capturePayment(data.orderID, order.id);
      }}
    />
  </div>
));
```

---

## Testing

### Sandbox Testing

1. Use PayPal sandbox credentials
2. Set `PAYPAL_MODE=sandbox` in backend
3. Use sandbox test accounts from PayPal Developer Dashboard
4. Test all payment scenarios:
   - Successful payment
   - Payment cancellation
   - Payment failure
   - Network errors

### Test Accounts

Create test accounts in PayPal Developer Dashboard:
- Personal account (buyer)
- Business account (seller)

### Testing Checklist

- [ ] Order creation works
- [ ] PayPal Buttons render correctly
- [ ] Payment approval works
- [ ] Payment capture works
- [ ] Success page shows after payment
- [ ] Error handling works
- [ ] Cancellation handling works
- [ ] Multiple orders from cart work

---

## Support

If you encounter issues:

1. Check browser console for errors
2. Verify PayPal Client ID is correct
3. Check backend logs for PayPal API errors
4. Verify environment variables are set
5. Test with PayPal sandbox first

---

## Next Steps

After migration:

1. Test thoroughly in sandbox
2. Update production environment variables
3. Switch to PayPal Live mode
4. Monitor payment success rates
5. Set up PayPal webhook in PayPal dashboard

For complete PayPal frontend integration details, see `PAYPAL_FRONTEND_INTEGRATION.md`.

