# PayPal Frontend Integration Guide

Complete guide for integrating PayPal payments in your React/Next.js frontend.

## Table of Contents

1. [Installation](#installation)
2. [Setup](#setup)
3. [Basic Implementation](#basic-implementation)
4. [Complete Payment Flow](#complete-payment-flow)
5. [Error Handling](#error-handling)
6. [Advanced Features](#advanced-features)
7. [Testing](#testing)

---

## Installation

### Step 1: Install PayPal React SDK

```bash
npm install @paypal/react-paypal-js
```

### Step 2: Install Axios (if not already installed)

```bash
npm install axios
```

---

## Setup

### Step 1: Get PayPal Client ID

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard)
2. Create or select your app
3. Copy the **Client ID** (not the secret - that's backend only)

### Step 2: Add to Environment Variables

Create or update `.env.local`:

```env
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id_here
```

**Note:** The `NEXT_PUBLIC_` prefix makes it available in the browser.

---

## Basic Implementation

### Step 1: Wrap Your App with PayPal Provider

```typescript
// app.tsx or _app.tsx
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
      {/* Your app components */}
      <YourApp />
    </PayPalScriptProvider>
  );
}

export default App;
```

### Step 2: Create Payment Button Component

```typescript
// components/PayPalButton.tsx
import { PayPalButtons } from '@paypal/react-paypal-js';
import axios from 'axios';

interface PayPalButtonProps {
  amount: number; // Amount in pence (e.g., 365 = £3.65)
  onSuccess?: (orderId: string) => void;
  onError?: (error: any) => void;
}

export function PayPalButton({ amount, onSuccess, onError }: PayPalButtonProps) {
  const handleCreateOrder = async () => {
    try {
      const response = await axios.post('/api/v1/payments/create-order', {
        amount, // Send amount in pence
      });

      // Return the PayPal orderID
      return response.data.data.orderID;
    } catch (error: any) {
      console.error('Error creating PayPal order:', error);
      onError?.(error);
      throw error;
    }
  };

  const handleApprove = async (data: any) => {
    try {
      // Capture the payment on backend
      const response = await axios.post('/api/v1/payments/capture-order', {
        orderID: data.orderID,
      });

      if (response.data.success) {
        onSuccess?.(data.orderID);
      } else {
        throw new Error(response.data.message || 'Payment failed');
      }
    } catch (error: any) {
      console.error('Error capturing payment:', error);
      onError?.(error);
    }
  };

  return (
    <PayPalButtons
      createOrder={handleCreateOrder}
      onApprove={handleApprove}
      onError={(err) => {
        console.error('PayPal error:', err);
        onError?.(err);
      }}
      onCancel={() => {
        console.log('Payment cancelled');
      }}
    />
  );
}
```

### Step 3: Use the Button

```typescript
// pages/checkout.tsx or components/Checkout.tsx
import { PayPalButton } from '../components/PayPalButton';
import { useRouter } from 'next/router';

export default function CheckoutPage() {
  const router = useRouter();
  const amount = 365; // £3.65 in pence

  const handlePaymentSuccess = (orderId: string) => {
    // Redirect to success page
    router.push(`/payment/success?orderId=${orderId}`);
  };

  const handlePaymentError = (error: any) => {
    alert('Payment failed. Please try again.');
    console.error('Payment error:', error);
  };

  return (
    <div>
      <h1>Complete Your Payment</h1>
      <p>Amount: £{(amount / 100).toFixed(2)}</p>

      <PayPalButton
        amount={amount}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />
    </div>
  );
}
```

---

## Complete Payment Flow

### Full Example with Order Creation

```typescript
// components/CompetitionCheckout.tsx
import { useState } from 'react';
import { PayPalButtons } from '@paypal/react-paypal-js';
import axios from 'axios';
import { useRouter } from 'next/router';

interface CompetitionCheckoutProps {
  competitionId: string;
  ticketPrice: number; // In pence
  quantity: number;
  ticketsReserved: number[];
}

export function CompetitionCheckout({
  competitionId,
  ticketPrice,
  quantity,
  ticketsReserved,
}: CompetitionCheckoutProps) {
  const router = useRouter();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalAmount = ticketPrice * quantity;

  // Step 1: Create order in your backend
  const createOrder = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/v1/orders', {
        competitionId,
        qty: quantity,
        ticketsReserved,
        billingDetails: {
          email: 'user@example.com', // Get from form
          firstName: 'John',
          lastName: 'Doe',
        },
      });

      const order = response.data.data.order;
      setOrderId(order.id);

      return order;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create order');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Create PayPal order
  const handleCreatePayPalOrder = async () => {
    // Ensure we have an order first
    if (!orderId) {
      await createOrder();
    }

    try {
      const response = await axios.post('/api/v1/payments/create-order', {
        amount: totalAmount,
        orderId: orderId,
      });

      // Return PayPal orderID for buttons
      return response.data.data.orderID;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create PayPal order');
      throw err;
    }
  };

  // Step 3: Capture payment after approval
  const handleApprove = async (data: any) => {
    try {
      setLoading(true);

      const response = await axios.post('/api/v1/payments/capture-order', {
        orderID: data.orderID,
        orderId: orderId, // Your internal order ID
      });

      if (response.data.success) {
        // Payment successful
        router.push(`/payment/success?orderId=${orderId}`);
      } else {
        throw new Error(response.data.message || 'Payment capture failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Payment failed');
      console.error('Payment error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <button onClick={() => setError(null)}>Try Again</button>
      </div>
    );
  }

  return (
    <div className="checkout">
      <h2>Complete Payment</h2>
      <p>
        Total: £{(totalAmount / 100).toFixed(2)} ({quantity} ticket{quantity > 1 ? 's' : ''})
      </p>

      {loading && <p>Processing...</p>}

      <PayPalButtons
        createOrder={handleCreatePayPalOrder}
        onApprove={handleApprove}
        onError={(err) => {
          console.error('PayPal error:', err);
          setError('An error occurred with PayPal. Please try again.');
        }}
        onCancel={() => {
          router.push(`/payment/cancel?orderId=${orderId}`);
        }}
      />
    </div>
  );
}
```

---

## Error Handling

### Comprehensive Error Handling

```typescript
// utils/paypalErrorHandler.ts
export function handlePayPalError(error: any): string {
  if (error.response) {
    // Backend error
    const status = error.response.status;
    const message = error.response.data?.message || 'Payment failed';

    switch (status) {
      case 400:
        return 'Invalid payment request. Please check your details.';
      case 401:
        return 'Authentication failed. Please log in again.';
      case 404:
        return 'Order not found. Please try creating a new order.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return message;
    }
  } else if (error.request) {
    // Network error
    return 'Network error. Please check your connection.';
  } else {
    // PayPal SDK error
    return error.message || 'An unexpected error occurred.';
  }
}

// Usage in component
const handleError = (error: any) => {
  const userMessage = handlePayPalError(error);
  setError(userMessage);
  // Optionally log to error tracking service
  console.error('PayPal error:', error);
};
```

---

## Advanced Features

### 1. Loading States

```typescript
import { usePayPalScriptReducer } from '@paypal/react-paypal-js';

function PaymentComponent() {
  const [{ isPending }] = usePayPalScriptReducer();

  if (isPending) {
    return <div>Loading PayPal...</div>;
  }

  return <PayPalButtons {...props} />;
}
```

### 2. Custom Styling

```typescript
<PayPalButtons
  style={{
    layout: 'vertical', // or 'horizontal'
    color: 'blue', // 'blue', 'gold', 'silver', 'white', 'black'
    shape: 'rect', // 'rect' or 'pill'
    label: 'paypal', // 'paypal', 'checkout', 'pay', 'buynow'
  }}
  createOrder={handleCreateOrder}
  onApprove={handleApprove}
/>
```

### 3. Disable Buttons

```typescript
const [disabled, setDisabled] = useState(false);

<PayPalButtons
  disabled={disabled || loading}
  createOrder={handleCreateOrder}
  onApprove={handleApprove}
/>
```

### 4. Multiple Payment Methods

```typescript
<PayPalButtons
  fundingSource="paypal" // or "venmo", "paylater", etc.
  createOrder={handleCreateOrder}
  onApprove={handleApprove}
/>
```

---

## Testing

### Test in Sandbox

1. Use sandbox Client ID in development
2. Use PayPal sandbox test accounts
3. Test cards are not needed (PayPal handles this)

### Test Scenarios

1. **Successful Payment**
   - Complete full flow
   - Verify order status updates
   - Check tickets are issued

2. **Cancelled Payment**
   - Click cancel on PayPal
   - Verify redirect to cancel page
   - Check order remains pending

3. **Error Handling**
   - Simulate network error
   - Verify error message displays
   - Check retry works

### PayPal Sandbox Test Accounts

Create test accounts in PayPal Developer Dashboard:

- Buyer account (for testing payments)
- Seller account (your business account)

---

## API Endpoints Reference

### Create PayPal Order

```typescript
POST /api/v1/payments/create-order
Body: {
  amount: number, // In pence
  orderId?: string // Optional - your internal order ID
}
Response: {
  success: true,
  data: {
    orderID: string // PayPal order ID
  }
}
```

### Capture Payment

```typescript
POST /api/v1/payments/capture-order
Body: {
  orderID: string, // PayPal order ID
  orderId?: string // Optional - your internal order ID
}
Response: {
  success: true,
  data: {
    status: 'success',
    orderId: string,
    captureId: string
  }
}
```

---

## Complete TypeScript Types

```typescript
// types/paypal.ts
export interface PayPalOrderResponse {
  success: boolean;
  data: {
    orderID: string;
    paypalOrderId?: string;
  };
  message: string;
}

export interface PayPalCaptureResponse {
  success: boolean;
  data: {
    status: 'success';
    orderId: string | null;
    captureId: string;
    paypalOrderId: string;
    data: any;
  };
  message: string;
}

export interface PayPalButtonProps {
  amount: number;
  orderId?: string;
  onSuccess?: (orderId: string) => void;
  onError?: (error: any) => void;
  disabled?: boolean;
}
```

---

## Best Practices

1. **Always create order first** - Create your internal order before PayPal order
2. **Handle errors gracefully** - Show user-friendly error messages
3. **Use loading states** - Show loading indicators during processing
4. **Verify on backend** - Never trust frontend-only confirmation
5. **Test thoroughly** - Test all scenarios in sandbox
6. **Log errors** - Log errors for debugging
7. **Handle edge cases** - Network failures, timeouts, etc.

---

## Troubleshooting

### Common Issues

1. **"PayPal buttons not showing"**
   - Check Client ID is correct
   - Verify PayPalScriptProvider wraps your app
   - Check browser console for errors

2. **"Order creation failed"**
   - Verify backend endpoint is accessible
   - Check amount format (should be in pence)
   - Verify CORS is configured

3. **"Payment capture failed"**
   - Check orderID is correct
   - Verify order was approved on PayPal
   - Check backend logs

4. **"Network error"**
   - Check internet connection
   - Verify API endpoints are correct
   - Check CORS configuration

---

## Example: Full Checkout Page

```typescript
// pages/checkout/[competitionId].tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { PayPalButtons } from '@paypal/react-paypal-js';
import axios from 'axios';

export default function CheckoutPage() {
  const router = useRouter();
  const { competitionId } = router.query;

  const [competition, setCompetition] = useState<any>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch competition details
    if (competitionId) {
      fetch(`/api/v1/competitions/${competitionId}`)
        .then(res => res.json())
        .then(data => setCompetition(data.data.competition));
    }
  }, [competitionId]);

  const handleCreateOrder = async () => {
    setLoading(true);
    try {
      // Create internal order
      const orderResponse = await axios.post('/api/v1/orders', {
        competitionId,
        qty: 1,
        ticketsReserved: [1],
        billingDetails: {
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
      });

      const order = orderResponse.data.data.order;
      setOrderId(order.id);

      // Create PayPal order
      const paypalResponse = await axios.post('/api/v1/payments/create-order', {
        amount: order.amountPence,
        orderId: order.id,
      });

      return paypalResponse.data.data.orderID;
    } catch (error) {
      console.error('Error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (data: any) => {
    try {
      setLoading(true);

      await axios.post('/api/v1/payments/capture-order', {
        orderID: data.orderID,
        orderId: orderId,
      });

      router.push(`/payment/success?orderId=${orderId}`);
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!competition) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Checkout</h1>
      <p>{competition.title}</p>
      <p>Price: £{(competition.ticketPricePence / 100).toFixed(2)}</p>

      {loading && <p>Processing payment...</p>}

      <PayPalButtons
        createOrder={handleCreateOrder}
        onApprove={handleApprove}
        onError={(err) => {
          console.error('PayPal error:', err);
          alert('An error occurred. Please try again.');
        }}
      />
    </div>
  );
}
```

---

## Summary

1. **Install** `@paypal/react-paypal-js`
2. **Wrap app** with `PayPalScriptProvider`
3. **Create order** on backend, get `orderID`
4. **Use PayPalButtons** with `createOrder` and `onApprove`
5. **Capture payment** on backend after approval
6. **Handle errors** gracefully

---

**Last Updated**: 2024
**Version**: 1.0.0
