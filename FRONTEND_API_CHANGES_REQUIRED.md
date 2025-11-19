# Frontend API Changes Required - Stripe to PayPal Migration

## Overview
This document outlines **all the frontend API changes** required after migrating from Stripe to PayPal.

## Critical Changes Required

### 1. Order Creation Endpoint
**Endpoint:** `POST /api/v1/orders`

#### ❌ OLD (Stripe) Response:
```json
{
  "success": true,
  "data": {
    "order": { ... },
    "clientSecret": "pi_xxx_secret_xxx"  // Used with Stripe Elements
  }
}
```

#### ✅ NEW (PayPal) Response:
```json
{
  "success": true,
  "data": {
    "order": { ... },
    "paypalOrderId": "5O190127TN364715T",
    "orderID": "5O190127TN364715T"  // Use this with PayPal Buttons
  }
}
```

**Frontend Changes:**
- ❌ Remove: Stripe Elements integration
- ✅ Add: PayPal Buttons integration
- ✅ Use: `orderID` from response with PayPal Buttons

---

### 2. Checkout from Cart Endpoint
**Endpoint:** `POST /api/v1/checkout/cart`

#### ❌ OLD (Stripe) Response:
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "...",
        "clientSecret": "pi_xxx_secret_xxx"  // Used with Stripe Elements
      }
    ]
  }
}
```

#### ✅ NEW (PayPal) Response:
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "...",
        "paypalOrderId": "5O190127TN364715T",
        "orderID": "5O190127TN364715T"  // Use this with PayPal Buttons
      }
    ]
  }
}
```

**Frontend Changes:**
- ❌ Remove: Stripe payment form for each order
- ✅ Add: PayPal Buttons for each order
- ✅ Use: `orderID` from each order object

---

### 3. Payment Intent Creation (REMOVED)
**Endpoint:** `POST /api/v1/payments/create-intent` ❌ **REMOVED**

#### ❌ OLD Usage:
```javascript
// Frontend used to call this to create payment intent
const response = await fetch('/api/v1/payments/create-intent', {
  method: 'POST',
  body: JSON.stringify({ orderId })
});
const { clientSecret } = await response.json();
// Use clientSecret with Stripe Elements
```

**Frontend Changes:**
- ❌ Remove: All calls to `/api/v1/payments/create-intent`
- ✅ Replace: Use `/api/v1/payments/create-order` instead (see below)

---

### 4. New PayPal Payment Endpoints

#### A. Create PayPal Order
**Endpoint:** `POST /api/v1/payments/create-order`

**Request:**
```json
{
  "amount": 365,  // Amount in pence
  "orderId": "optional_internal_order_id"
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

**Frontend Usage:**
```javascript
// Option 1: Create order directly (if order doesn't exist yet)
const response = await fetch('/api/v1/payments/create-order', {
  method: 'POST',
  body: JSON.stringify({ amount: 365 })
});
const { orderID } = await response.json().data;

// Option 2: Link to existing order
const response = await fetch('/api/v1/payments/create-order', {
  method: 'POST',
  body: JSON.stringify({ 
    amount: 365,
    orderId: "your_internal_order_id"
  })
});
const { orderID } = await response.json().data;

// Use orderID with PayPal Buttons
```

---

#### B. Capture Payment
**Endpoint:** `POST /api/v1/payments/capture-order`

**Request:**
```json
{
  "orderID": "5O190127TN364715T",  // From PayPal Buttons onApprove
  "orderId": "optional_internal_order_id"  // Optional fallback
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

**Frontend Usage:**
```javascript
// Called after PayPal Buttons onApprove callback
const response = await fetch('/api/v1/payments/capture-order', {
  method: 'POST',
  body: JSON.stringify({ 
    orderID: data.orderID  // From PayPal onApprove
  })
});
```

---

#### C. Confirm Payment (Alias)
**Endpoint:** `POST /api/v1/payments/confirm`

**Note:** This is an alias for `/capture-order` - same request/response format.

---

### 5. Payment Confirmation Flow

#### ❌ OLD (Stripe) Flow:
```javascript
// 1. Create order
const order = await createOrder(...);

// 2. Create payment intent
const { clientSecret } = await createPaymentIntent({ orderId: order.id });

// 3. Use Stripe Elements with clientSecret
// 4. Stripe webhook handles confirmation automatically
```

#### ✅ NEW (PayPal) Flow:
```javascript
// Option 1: Order already created (recommended)
// 1. Create order via POST /api/v1/orders
const orderResponse = await createOrder(...);
const { orderID } = orderResponse.data;

// 2. Use PayPal Buttons with orderID
<PayPalButtons
  createOrder={() => orderID}  // Return orderID from step 1
  onApprove={async (data) => {
    // 3. Capture payment
    await fetch('/api/v1/payments/capture-order', {
      method: 'POST',
      body: JSON.stringify({ orderID: data.orderID })
    });
  }}
/>

// Option 2: Create PayPal order separately
// 1. Create PayPal order
const { orderID } = await fetch('/api/v1/payments/create-order', {
  method: 'POST',
  body: JSON.stringify({ amount: 365 })
});

// 2. Use PayPal Buttons
<PayPalButtons
  createOrder={() => orderID}
  onApprove={async (data) => {
    await fetch('/api/v1/payments/capture-order', {
      method: 'POST',
      body: JSON.stringify({ orderID: data.orderID })
    });
  }}
/>
```

---

## Complete Frontend Migration Checklist

### Payment Integration
- [ ] Remove Stripe SDK (`@stripe/stripe-js`, `@stripe/react-stripe-js`)
- [ ] Install PayPal SDK (`@paypal/react-paypal-js`)
- [ ] Remove all Stripe Elements components
- [ ] Add PayPal Buttons components
- [ ] Update payment flow to use PayPal Buttons

### API Calls
- [ ] Update `POST /api/v1/orders` response handling
  - Remove: `clientSecret` usage
  - Add: `orderID` usage
- [ ] Update `POST /api/v1/checkout/cart` response handling
  - Remove: `clientSecret` from each order
  - Add: `orderID` from each order
- [ ] Remove: All calls to `POST /api/v1/payments/create-intent`
- [ ] Add: Calls to `POST /api/v1/payments/create-order` (if needed)
- [ ] Add: Calls to `POST /api/v1/payments/capture-order` in PayPal onApprove

### Error Handling
- [ ] Update error messages for PayPal-specific errors
- [ ] Handle PayPal cancellation flow
- [ ] Update payment status checking logic

### UI/UX
- [ ] Replace Stripe payment form with PayPal Buttons
- [ ] Update loading states
- [ ] Update success/error messages
- [ ] Test PayPal sandbox flow

---

## Response Format Changes Summary

| Endpoint | Old Field | New Field | Action |
|----------|-----------|-----------|--------|
| `POST /api/v1/orders` | `clientSecret` | `orderID`, `paypalOrderId` | ✅ Use `orderID` |
| `POST /api/v1/checkout/cart` | `clientSecret` (per order) | `orderID`, `paypalOrderId` (per order) | ✅ Use `orderID` |
| `POST /api/v1/payments/create-intent` | ❌ **REMOVED** | N/A | ❌ Remove all calls |
| `POST /api/v1/payments/create-order` | N/A | `orderID`, `paypalOrderId` | ✅ New endpoint |
| `POST /api/v1/payments/capture-order` | N/A | `status`, `orderId`, `captureId` | ✅ New endpoint |

---

## Example Frontend Code Changes

### Before (Stripe):
```javascript
// Create order
const order = await createOrder({ ... });

// Create payment intent
const { clientSecret } = await createPaymentIntent({ orderId: order.id });

// Use Stripe Elements
<CardElement />
<button onClick={() => confirmPayment(clientSecret)}>
  Pay
</button>
```

### After (PayPal):
```javascript
// Create order
const order = await createOrder({ ... });
const { orderID } = order.data;

// Use PayPal Buttons
<PayPalButtons
  createOrder={() => orderID}
  onApprove={async (data) => {
    await capturePayment({ orderID: data.orderID });
  }}
  onError={(err) => {
    console.error('PayPal error:', err);
  }}
/>
```

---

## Important Notes

1. **No Breaking Changes to Other Endpoints**: All other endpoints remain the same (auth, competitions, tickets, etc.)

2. **Order Model Fields**: 
   - `stripePaymentIntent` field is deprecated but still exists in database
   - `paypalOrderId` is the new field to use

3. **Payment Status**: Payment status checking remains the same (`paymentStatus: 'paid'`)

4. **Webhooks**: PayPal webhooks are handled automatically on the backend - no frontend changes needed

5. **Testing**: Use PayPal sandbox mode for testing (set `PAYPAL_MODE=sandbox`)

---

## Quick Reference

**Create Order → Get PayPal OrderID → Use with PayPal Buttons → Capture on Approval**

See `PAYPAL_FRONTEND_INTEGRATION.md` for complete frontend implementation guide.

