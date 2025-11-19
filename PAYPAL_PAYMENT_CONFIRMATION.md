# PayPal Payment Confirmation Guide

This document explains how to confirm/capture PayPal payments in your application.

## Table of Contents

1. [Payment Flow Overview](#payment-flow-overview)
2. [Confirmation Methods](#confirmation-methods)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [Error Handling](#error-handling)
6. [Testing](#testing)

---

## Payment Flow Overview

PayPal payment confirmation follows this flow:

1. **Create Order** → Backend creates PayPal order, returns `paypalOrderId` and `approvalUrl`
2. **User Approves** → User approves payment on PayPal (redirect or buttons)
3. **Capture Payment** → Backend captures the approved payment
4. **Issue Tickets** → Backend processes order, issues tickets, updates status

---

## Confirmation Methods

There are two ways to confirm PayPal payments:

### Method 1: Redirect Flow (Traditional)

1. User clicks "Pay with PayPal"
2. Redirect to PayPal approval URL
3. User approves on PayPal
4. PayPal redirects back with `token` and `PayerID`
5. Frontend calls backend to capture payment

### Method 2: PayPal Buttons (Recommended)

1. User clicks PayPal button on your site
2. PayPal popup/modal opens
3. User approves in popup
4. Frontend receives approval callback
5. Frontend calls backend to capture payment

---

## Backend Implementation

### Endpoint: Capture Payment

**Route:** `POST /api/v1/payments/capture`

**Request Body Options:**

```typescript
// Option 1: With orderId (most common)
{
  "orderId": "507f1f77bcf86cd799439011"
}

// Option 2: With paypalOrderId
{
  "paypalOrderId": "5O190127TN364715T"
}

// Option 3: With token (from redirect)
{
  "token": "EC-xxx"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Payment captured successfully",
  "data": {
    "orderId": "507f1f77bcf86cd799439011",
    "status": "completed",
    "captureId": "4BV87412HX762430N",
    "paypalOrderId": "5O190127TN364715T"
  }
}
```

### Endpoint: Confirm Payment (Alias)

**Route:** `POST /api/v1/payments/confirm`

Same as capture endpoint, but with clearer naming for frontend.

### Implementation Details

The capture endpoint:

1. **Finds the order** using orderId, paypalOrderId, or token
2. **Checks if already paid** (idempotency)
3. **Captures payment** via PayPal API
4. **Processes order** (issues tickets, updates status)
5. **Returns success** with order details

---

## Frontend Implementation

### Method 1: Redirect Flow

```typescript
// Step 1: Create order
const createOrder = async () => {
  const response = await fetch('/api/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });

  const { paypalOrderId, approvalUrl } = await response.json();

  // Step 2: Redirect to PayPal
  window.location.href = approvalUrl;
};

// Step 3: Handle return from PayPal (on success page)
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const payerId = urlParams.get('PayerID');
  const orderId = urlParams.get('orderId');

  if (token && orderId) {
    confirmPayment(orderId, token);
  }
}, []);

// Step 4: Confirm payment
const confirmPayment = async (orderId: string, token: string) => {
  try {
    const response = await fetch('/api/v1/payments/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, token }),
    });

    const result = await response.json();

    if (result.success) {
      // Payment successful - redirect to success page
      window.location.href = `/payment/success?orderId=${orderId}`;
    } else {
      // Handle error
      console.error('Payment failed:', result.message);
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
  }
};
```

### Method 2: PayPal Buttons (Recommended)

```typescript
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';

function PaymentComponent({ orderId, amount }: { orderId: string; amount: number }) {
  const [{ isPending }] = usePayPalScriptReducer();

  const handleApprove = async (data: any, actions: any) => {
    try {
      // Capture the payment
      const order = await actions.order.capture();

      // Call backend to confirm and process
      const response = await fetch('/api/v1/payments/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderId,
          paypalOrderId: data.orderID,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Payment successful
        window.location.href = `/payment/success?orderId=${orderId}`;
      } else {
        throw new Error(result.message || 'Payment confirmation failed');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
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
              reference_id: orderId,
            },
          ],
        });
      }}
      onApprove={handleApprove}
      onError={(err) => {
        console.error('PayPal error:', err);
        alert('An error occurred with PayPal. Please try again.');
      }}
      onCancel={() => {
        window.location.href = `/payment/cancel?orderId=${orderId}`;
      }}
    />
  );
}
```

### Method 3: Using PayPal Order ID from Backend

```typescript
// If backend creates PayPal order first
const createOrderAndPay = async () => {
  // Step 1: Create order
  const orderResponse = await fetch('/api/v1/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });

  const { paypalOrderId } = await orderResponse.json();

  // Step 2: Use PayPal Buttons with existing order
  return (
    <PayPalButtons
      createOrder={() => paypalOrderId} // Use existing order ID
      onApprove={async (data, actions) => {
        const order = await actions.order.capture();

        // Confirm with backend
        await fetch('/api/v1/payments/capture', {
          method: 'POST',
          body: JSON.stringify({
            paypalOrderId: data.orderID,
          }),
        });
      }}
    />
  );
};
```

---

## Error Handling

### Common Errors

1. **"Order not found"**
   - Verify orderId is correct
   - Check order exists in database

2. **"PayPal order ID not found"**
   - Order was created but PayPal order wasn't saved
   - Recreate PayPal order

3. **"Payment already completed"**
   - Order is already paid (idempotency check)
   - Return success, don't process again

4. **"Payment capture failed"**
   - PayPal order not approved
   - User cancelled payment
   - Insufficient funds

### Error Response Format

```json
{
  "success": false,
  "message": "Payment capture failed",
  "error": {
    "statusCode": 400,
    "message": "Payment capture failed with status: DENIED"
  }
}
```

### Frontend Error Handling

```typescript
const confirmPayment = async (orderId: string) => {
  try {
    const response = await fetch('/api/v1/payments/capture', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Payment failed');
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    // Handle different error types
    if (error.message.includes('already paid')) {
      // Payment already completed - show success
      return { success: true, alreadyPaid: true };
    } else if (error.message.includes('not found')) {
      // Order doesn't exist
      alert('Order not found. Please contact support.');
    } else {
      // Other errors
      alert('Payment failed. Please try again.');
    }
    throw error;
  }
};
```

---

## Testing

### Test Payment Confirmation

1. **Create test order:**

```bash
POST /api/v1/orders
{
  "competitionId": "...",
  "qty": 1,
  "ticketsReserved": [1],
  "billingDetails": { ... }
}
```

2. **Get paypalOrderId from response**

3. **Confirm payment:**

```bash
POST /api/v1/payments/capture
{
  "orderId": "order_id_from_step_1"
}
```

4. **Verify:**
   - Order status is `completed`
   - Payment status is `paid`
   - Tickets are issued
   - Competition ticketsSold incremented

### Test Scenarios

1. **Successful confirmation**
   - Payment captured
   - Order processed
   - Tickets issued

2. **Already paid (idempotency)**
   - Returns success without processing
   - No duplicate tickets

3. **Invalid order ID**
   - Returns 404 error
   - No processing

4. **Payment not approved**
   - Returns error
   - Order remains pending

---

## Complete Example

### Backend Route

```typescript
// src/routes/payment.routes.ts
import { Router } from 'express';
import {
  capturePayment,
  confirmPayment,
  handleWebhook,
} from '../controllers/payment.controller';

const router = Router();

router.post('/capture', capturePayment);
router.post('/confirm', confirmPayment); // Alias for clarity
router.post('/webhook', handleWebhook);

export default router;
```

### Frontend Complete Flow

```typescript
// PaymentPage.tsx
import { useState } from 'react';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { useRouter } from 'next/router';

export default function PaymentPage() {
  const router = useRouter();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // Step 1: Create order
  const createOrder = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitionId: router.query.competitionId,
          qty: 1,
          ticketsReserved: [1],
          billingDetails: {
            email: 'user@example.com',
            firstName: 'John',
            lastName: 'Doe',
          },
        }),
      });

      const result = await response.json();
      setOrderId(result.data.order.id);
      setAmount(result.data.order.amountPence);
    } catch (error) {
      console.error('Error creating order:', error);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle PayPal approval
  const handleApprove = async (data: any, actions: any) => {
    try {
      // Capture payment
      const order = await actions.order.capture();

      // Confirm with backend
      const response = await fetch('/api/v1/payments/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderId,
          paypalOrderId: data.orderID,
        }),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/payment/success?orderId=${orderId}`);
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    }
  };

  return (
    <div>
      {!orderId ? (
        <button onClick={createOrder} disabled={loading}>
          {loading ? 'Creating Order...' : 'Create Order'}
        </button>
      ) : (
        <PayPalButtons
          createOrder={(data, actions) => {
            return actions.order.create({
              purchase_units: [
                {
                  amount: {
                    value: (amount / 100).toFixed(2),
                    currency_code: 'GBP',
                  },
                  reference_id: orderId,
                },
              ],
            });
          }}
          onApprove={handleApprove}
          onError={(err) => {
            console.error('PayPal error:', err);
            alert('An error occurred. Please try again.');
          }}
          onCancel={() => {
            router.push(`/payment/cancel?orderId=${orderId}`);
          }}
        />
      )}
    </div>
  );
}
```

---

## Best Practices

1. **Always confirm on backend** - Never trust frontend-only confirmation
2. **Handle idempotency** - Check if already paid before processing
3. **Use webhooks** - PayPal webhooks provide reliable payment status
4. **Log everything** - Log all payment attempts for debugging
5. **Error recovery** - Provide clear error messages and retry options
6. **Test thoroughly** - Test all scenarios in sandbox before production

---

## Webhook Confirmation

PayPal also sends webhooks for payment events. The webhook handler automatically processes payments:

```typescript
// Webhook automatically handles:
// - PAYMENT.CAPTURE.COMPLETED → Process payment
// - PAYMENT.CAPTURE.DENIED → Mark as failed
// - PAYMENT.CAPTURE.REFUNDED → Process refund
```

**Note:** Webhooks are the most reliable method. The capture endpoint is for immediate confirmation, but webhooks ensure payment is processed even if the frontend fails.

---

## Summary

- **Create Order** → Get `paypalOrderId` and `approvalUrl`
- **User Approves** → On PayPal (redirect or buttons)
- **Capture Payment** → Call `/api/v1/payments/capture` with `orderId`
- **Process Order** → Backend issues tickets, updates status
- **Webhook Backup** → PayPal webhook ensures payment is processed

---

**Last Updated**: 2024
**Version**: 1.0.0
