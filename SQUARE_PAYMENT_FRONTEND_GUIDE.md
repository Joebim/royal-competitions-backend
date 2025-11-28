# Square Payment Integration - Frontend Implementation Guide

This guide provides complete instructions for integrating Square Payments into your React/TypeScript frontend application. Square supports Apple Pay, Google Pay, and card payments (Visa, Mastercard, Maestro) via the Square Web Payments SDK.

## Table of Contents

1. [Overview](#overview)
2. [Setup & Installation](#setup--installation)
3. [Square Web Payments SDK Integration](#square-web-payments-sdk-integration)
4. [Payment Flow](#payment-flow)
5. [API Endpoints](#api-endpoints)
6. [Code Examples](#code-examples)
7. [Error Handling](#error-handling)
8. [Testing](#testing)
9. [Production Checklist](#production-checklist)

---

## Overview

The backend has been migrated from PayPal to Square Payments. Square provides:

- **Card Payments**: Visa, Mastercard, Maestro
- **Digital Wallets**: Apple Pay, Google Pay
- **Secure Processing**: PCI-compliant payment handling
- **Web Payments SDK**: Client-side payment tokenization

### Key Differences from PayPal

- Uses `sourceId` (nonce) instead of PayPal order IDs
- Payment is created server-side after tokenization
- Supports multiple payment methods in one integration
- No redirect to external payment page

---

## Setup & Installation

### 1. Install Square Web SDK

```bash
npm install @square/web-sdk
```

### 2. Get Square Credentials

You'll need these from your Square Developer Dashboard:

- **Application ID**: For frontend (e.g., `sandbox-sq0idb-...`)
- **Location ID**: Your Square location ID
- **Environment**: `sandbox` or `production`

**Note**: The backend handles the access token - you only need the Application ID and Location ID for the frontend.

### 3. Environment Variables

Add to your `.env` file:

```env
REACT_APP_SQUARE_APPLICATION_ID=sandbox-sq0idb-XXXXXXXXXXXXXXXXXXXX
REACT_APP_SQUARE_LOCATION_ID=LXXXXXXXXXXXXXXXXX
REACT_APP_SQUARE_ENVIRONMENT=sandbox  # or 'production'
REACT_APP_API_URL=http://localhost:5000/api/v1
```

---

## Square Web Payments SDK Integration

### 1. Initialize Square Payments

Create a utility file `src/utils/square.ts`:

```typescript
import { loadScript } from '@square/web-sdk';

const APPLICATION_ID = process.env.REACT_APP_SQUARE_APPLICATION_ID!;
const LOCATION_ID = process.env.REACT_APP_SQUARE_LOCATION_ID!;
const ENVIRONMENT = process.env.REACT_APP_SQUARE_ENVIRONMENT || 'sandbox';

let payments: any = null;
let card: any = null;
let applePay: any = null;
let googlePay: any = null;

export async function initializeSquare(): Promise<void> {
  try {
    // Load Square SDK if not already loaded
    if (!window.Square) {
      const scriptUrl =
        ENVIRONMENT === 'production'
          ? 'https://web.squarecdn.com/v1/square.js'
          : 'https://sandbox.web.squarecdn.com/v1/square.js';

      await loadScript({ location: scriptUrl });
    }

    // Initialize Square Payments
    payments = window.Square.payments(APPLICATION_ID, LOCATION_ID);

    // Initialize Card payment method
    card = await payments.card({
      style: {
        '.input-container': {
          margin: '10px 0',
        },
        '.input-field': {
          fontSize: '16px',
          padding: '12px',
          border: '1px solid #ccc',
          borderRadius: '4px',
        },
        '.input-field.is-focus': {
          borderColor: '#0066cc',
        },
        '.input-field.is-error': {
          borderColor: '#dc3545',
        },
      },
    });

    // Initialize Apple Pay (if available)
    if (await payments.applePay()) {
      applePay = await payments.applePay({
        countryCode: 'GB',
        currencyCode: 'GBP',
      });
    }

    // Initialize Google Pay (if available)
    if (await payments.googlePay()) {
      googlePay = await payments.googlePay({
        countryCode: 'GB',
        currencyCode: 'GBP',
        environment: ENVIRONMENT === 'production' ? 'PRODUCTION' : 'TEST',
      });
    }
  } catch (error) {
    console.error('Failed to initialize Square:', error);
    throw error;
  }
}

export async function attachCardElement(containerId: string): Promise<void> {
  if (!card) {
    await initializeSquare();
  }
  await card.attach(`#${containerId}`);
}

export async function tokenizeCard(): Promise<string> {
  if (!card) {
    throw new Error('Card element not initialized');
  }

  const result = await card.tokenize();
  if (result.status !== 'OK') {
    const errors = result.errors?.map((e: any) => e.message).join(', ');
    throw new Error(`Card tokenization failed: ${errors}`);
  }

  return result.token;
}

export async function tokenizeApplePay(): Promise<string> {
  if (!applePay) {
    throw new Error('Apple Pay not available');
  }

  const result = await applePay.tokenize();
  if (result.status !== 'OK') {
    throw new Error('Apple Pay tokenization failed');
  }

  return result.token;
}

export async function tokenizeGooglePay(): Promise<string> {
  if (!googlePay) {
    throw new Error('Google Pay not available');
  }

  const result = await googlePay.tokenize();
  if (result.status !== 'OK') {
    throw new Error('Google Pay tokenization failed');
  }

  return result.token;
}

export function isApplePayAvailable(): boolean {
  return applePay !== null;
}

export function isGooglePayAvailable(): boolean {
  return googlePay !== null;
}
```

### 2. TypeScript Declarations

Add to `src/types/square.d.ts`:

```typescript
declare global {
  interface Window {
    Square: {
      payments: (applicationId: string, locationId: string) => any;
    };
  }
}

export {};
```

---

## Payment Flow

### Complete Payment Flow Diagram

```
1. User selects tickets → Create Order
2. User clicks "Pay Now" → Initialize Square SDK
3. User enters card details → Tokenize payment method
4. Frontend sends sourceId to backend → POST /api/v1/payments/create-payment
5. Backend creates Square payment → Returns paymentId and status
6. If status is COMPLETED → Payment successful
7. If status is PENDING → Call confirm-payment endpoint
8. Update UI → Show success/error message
```

### Step-by-Step Flow

1. **Create Order** (if not already created)
   - User selects tickets and creates an order
   - Backend returns `orderId`

2. **Initialize Payment**
   - Load Square SDK
   - Attach card element to DOM
   - Show payment form

3. **Tokenize Payment Method**
   - User enters card details or selects Apple Pay/Google Pay
   - Call `tokenize()` to get `sourceId` (nonce)

4. **Create Payment**
   - Send `sourceId` and `orderId` to backend
   - Backend creates Square payment
   - Returns `paymentId` and `status`

5. **Confirm Payment** (if needed)
   - If status is `PENDING`, call confirm endpoint
   - Poll or wait for webhook confirmation

6. **Handle Result**
   - Show success message
   - Redirect to order confirmation page

---

## API Endpoints

### 1. Create Square Payment

**Endpoint**: `POST /api/v1/payments/create-payment`

**Request Body**:
```typescript
{
  sourceId: string;        // Required: Payment nonce from Square SDK
  orderId?: string;        // Optional: Order ID to link payment
  amount?: number;          // Optional: Amount if no orderId
  idempotencyKey?: string;  // Optional: Unique key for idempotency
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    paymentId: string;      // Square payment ID
    status: string;          // 'COMPLETED' | 'PENDING' | 'FAILED'
    orderId: string | null;
  },
  message: "Square payment created"
}
```

**Example**:
```typescript
const response = await fetch(`${API_URL}/payments/create-payment`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`, // If authenticated
  },
  body: JSON.stringify({
    sourceId: token, // From Square SDK tokenize()
    orderId: orderId,
    idempotencyKey: crypto.randomUUID(),
  }),
});

const data = await response.json();
```

### 2. Confirm Payment

**Endpoint**: `POST /api/v1/payments/confirm-payment`

**Request Body**:
```typescript
{
  paymentId?: string;  // Optional: Square payment ID
  orderId?: string;    // Optional: Order ID
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    status: 'success',
    orderId: string,
    paymentId: string,
    data: { /* Square payment object */ }
  },
  message: "Payment confirmed successfully"
}
```

**Example**:
```typescript
const response = await fetch(`${API_URL}/payments/confirm-payment`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    paymentId: paymentId,
    orderId: orderId,
  }),
});
```

---

## Code Examples

### Complete Payment Component

```typescript
import React, { useState, useEffect } from 'react';
import {
  initializeSquare,
  attachCardElement,
  tokenizeCard,
  tokenizeApplePay,
  tokenizeGooglePay,
  isApplePayAvailable,
  isGooglePayAvailable,
} from '../utils/square';

interface PaymentFormProps {
  orderId: string;
  amount: number;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  orderId,
  amount,
  onSuccess,
  onError,
}) => {
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [applePayAvailable, setApplePayAvailable] = useState(false);
  const [googlePayAvailable, setGooglePayAvailable] = useState(false);

  useEffect(() => {
    async function setup() {
      try {
        await initializeSquare();
        await attachCardElement('card-container');
        setApplePayAvailable(isApplePayAvailable());
        setGooglePayAvailable(isGooglePayAvailable());
        setInitialized(true);
      } catch (error: any) {
        onError(`Failed to initialize payment: ${error.message}`);
      }
    }
    setup();
  }, []);

  const handlePayment = async (paymentMethod: 'card' | 'apple' | 'google') => {
    if (!initialized) {
      onError('Payment system not ready');
      return;
    }

    setLoading(true);
    try {
      // Tokenize payment method
      let sourceId: string;
      switch (paymentMethod) {
        case 'card':
          sourceId = await tokenizeCard();
          break;
        case 'apple':
          sourceId = await tokenizeApplePay();
          break;
        case 'google':
          sourceId = await tokenizeGooglePay();
          break;
        default:
          throw new Error('Invalid payment method');
      }

      // Create payment
      const response = await fetch(`${process.env.REACT_APP_API_URL}/payments/create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          sourceId,
          orderId,
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Payment failed');
      }

      // Check payment status
      if (data.data.status === 'COMPLETED') {
        onSuccess(data.data.paymentId);
      } else if (data.data.status === 'PENDING') {
        // Confirm payment
        await confirmPayment(data.data.paymentId, orderId);
        onSuccess(data.data.paymentId);
      } else {
        throw new Error(`Payment status: ${data.data.status}`);
      }
    } catch (error: any) {
      onError(error.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async (paymentId: string, orderId: string) => {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/payments/confirm-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        paymentId,
        orderId,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Payment confirmation failed');
    }
  };

  return (
    <div className="payment-form">
      <h2>Payment</h2>
      <p>Amount: £{amount.toFixed(2)}</p>

      {/* Card Payment */}
      <div>
        <h3>Card Payment</h3>
        <div id="card-container" style={{ margin: '20px 0' }}></div>
        <button
          onClick={() => handlePayment('card')}
          disabled={loading || !initialized}
        >
          {loading ? 'Processing...' : 'Pay with Card'}
        </button>
      </div>

      {/* Apple Pay */}
      {applePayAvailable && (
        <div style={{ margin: '20px 0' }}>
          <button
            onClick={() => handlePayment('apple')}
            disabled={loading || !initialized}
            className="apple-pay-button"
          >
            Pay with Apple Pay
          </button>
        </div>
      )}

      {/* Google Pay */}
      {googlePayAvailable && (
        <div style={{ margin: '20px 0' }}>
          <div id="google-pay-button"></div>
          <button
            onClick={() => handlePayment('google')}
            disabled={loading || !initialized}
            className="google-pay-button"
          >
            Pay with Google Pay
          </button>
        </div>
      )}
    </div>
  );
};

export default PaymentForm;
```

### Simplified Payment Hook

```typescript
import { useState } from 'react';
import { tokenizeCard } from '../utils/square';

export function useSquarePayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processPayment = async (orderId: string, sourceId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/payments/create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          sourceId,
          orderId,
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Payment failed');
      }

      return data.data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { processPayment, loading, error };
}
```

---

## Error Handling

### Common Errors

1. **Tokenization Failed**
   ```typescript
   try {
     const sourceId = await tokenizeCard();
   } catch (error) {
     // Handle invalid card details
     console.error('Card tokenization failed:', error);
   }
   ```

2. **Payment Creation Failed**
   ```typescript
   const response = await fetch(/* ... */);
   const data = await response.json();

   if (!data.success) {
     // Handle payment errors
     if (data.message.includes('insufficient funds')) {
       // Show specific error message
     } else if (data.message.includes('card declined')) {
       // Show card declined message
     }
   }
   ```

3. **Network Errors**
   ```typescript
   try {
     const response = await fetch(/* ... */);
   } catch (error) {
     // Handle network errors
     if (error instanceof TypeError) {
       // Network error
     }
   }
   ```

### Error Response Format

```typescript
{
  success: false,
  message: "Error message here",
  errors?: [
    {
      field: string,
      message: string
    }
  ]
}
```

---

## Testing

### Sandbox Testing

1. **Test Cards** (Square Sandbox):
   - Success: `4111 1111 1111 1111`
   - Decline: `4000 0000 0000 0002`
   - Insufficient Funds: `4000 0000 0000 9995`
   - CVV: Any 3 digits
   - Expiry: Any future date

2. **Test Apple Pay**:
   - Use Square Sandbox environment
   - Apple Pay will show test cards in sandbox

3. **Test Google Pay**:
   - Use Square Sandbox environment
   - Google Pay will show test cards in sandbox

### Testing Checklist

- [ ] Card payment with valid card
- [ ] Card payment with invalid card
- [ ] Card payment with declined card
- [ ] Apple Pay (if available)
- [ ] Google Pay (if available)
- [ ] Payment confirmation flow
- [ ] Error handling
- [ ] Loading states
- [ ] Success redirect

---

## Production Checklist

Before going live:

1. **Update Environment Variables**:
   ```env
   REACT_APP_SQUARE_APPLICATION_ID=prod-sq0idb-...
   REACT_APP_SQUARE_LOCATION_ID=L...
   REACT_APP_SQUARE_ENVIRONMENT=production
   ```

2. **Update Square SDK URL**:
   - Use production URL: `https://web.squarecdn.com/v1/square.js`

3. **Verify Credentials**:
   - Confirm Application ID is production
   - Confirm Location ID is correct
   - Test with real card (small amount)

4. **Security**:
   - Never expose access token in frontend
   - Always use HTTPS in production
   - Validate all inputs
   - Handle errors gracefully

5. **Monitoring**:
   - Set up error tracking
   - Monitor payment success rates
   - Log payment events

---

## Additional Resources

- [Square Web Payments SDK Documentation](https://developer.squareup.com/docs/web-payments/overview)
- [Square Payment API Reference](https://developer.squareup.com/reference/square/payments-api)
- [Square Sandbox Testing Guide](https://developer.squareup.com/docs/devtools/sandbox)

---

## Support

For issues or questions:
1. Check Square Developer Dashboard for payment logs
2. Review backend logs for payment processing errors
3. Contact backend team for API-related issues

---

**Last Updated**: 2025-01-24
**Version**: 1.0.0

