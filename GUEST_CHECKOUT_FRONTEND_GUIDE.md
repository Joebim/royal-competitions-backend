# Guest Checkout - Frontend Implementation Guide

## Overview

The checkout system now supports **both authenticated and guest checkout**. Users can complete purchases without creating an account or logging in. If a user is logged in, their account information is used; if not, the checkout proceeds as a guest order.

---

## Key Changes

### ✅ Authentication is Optional

All checkout endpoints now accept requests **with or without authentication**:

- **With Auth Token**: User's account is linked to the order
- **Without Auth Token**: Order is created as a guest order (no userId)

### ✅ Guest Orders

- Guest orders have `userId: null` or `undefined`
- Guest orders can be accessed by anyone with the order ID
- Guest orders can be linked to a user account if they log in during checkout

---

## Updated Endpoints

### 1. **Create Order**

**Endpoint:** `POST /api/v1/orders`

**Authentication:** Optional (✅ Works without auth token)

**Request:**
```javascript
// With authentication (optional)
const response = await fetch('/api/v1/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Optional: Include auth token if user is logged in
    ...(authToken && { Authorization: `Bearer ${authToken}` }),
  },
  credentials: 'include', // Include cookies if using cookie-based auth
  body: JSON.stringify({
    competitionId: 'competition_id',
    qty: 5,
    ticketsReserved: [1, 2, 3, 4, 5], // Optional
    ticketsValid: true, // Optional
    billingDetails: {
      email: 'customer@example.com',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
    },
    shippingAddress: {
      line1: '123 Main St',
      city: 'London',
      postalCode: 'SW1A 1AA',
      country: 'GB',
    },
    marketingOptIn: false,
  }),
});
```

**Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": "order_id",
    "orderNumber": "ORD-123456",
    "competitionId": "competition_id",
    "userId": null, // null for guest orders, user ID if authenticated
    "amount": 9.95,
    "quantity": 5,
    "status": "pending",
    "paymentStatus": "pending",
    "ticketsReserved": [1, 2, 3, 4, 5]
  }
}
```

**Notes:**
- ✅ Works without authentication
- If user is logged in, `userId` will be set automatically
- If user is not logged in, `userId` will be `null`

---

### 2. **View Order Confirmation Page**

**Endpoint:** `GET /api/v1/orders/:id`

**Authentication:** Optional (✅ Works without auth token)

**Request:**
```javascript
// With or without authentication
const response = await fetch(`/api/v1/orders/${orderId}`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    // Optional: Include auth token if user is logged in
    ...(authToken && { Authorization: `Bearer ${authToken}` }),
  },
  credentials: 'include',
});
```

**Response:**
```json
{
  "success": true,
  "message": "Order status retrieved successfully",
  "data": {
    "order": {
      "id": "order_id",
      "orderNumber": "ORD-123456",
      "competitionId": "competition_id",
      "userId": null, // null for guest orders
      "amount": 9.95,
      "quantity": 5,
      "status": "pending",
      "paymentStatus": "pending",
      "ticketsReserved": [1, 2, 3, 4, 5],
      "tickets": [] // Empty until payment is completed
    }
  }
}
```

**Notes:**
- ✅ Works without authentication
- Guest orders (no userId) can be accessed by anyone with the order ID
- Authenticated users can only access their own orders (unless admin)

---

### 3. **Process Payment**

**Endpoint:** `POST /api/v1/payments/create-payment`

**Authentication:** Optional (✅ Works without auth token)

**Request:**
```javascript
// With or without authentication
const response = await fetch('/api/v1/payments/create-payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Optional: Include auth token if user is logged in
    ...(authToken && { Authorization: `Bearer ${authToken}` }),
  },
  credentials: 'include',
  body: JSON.stringify({
    sourceId: 'square_payment_nonce', // From Square Web Payments SDK
    orderId: 'order_id', // Optional if amount is provided
    amount: 9.95, // Optional if orderId is provided
    idempotencyKey: 'unique_key', // Optional, auto-generated if not provided
  }),
});
```

**Response:**
```json
{
  "success": true,
  "message": "Square payment created",
  "data": {
    "paymentId": "square_payment_id",
    "status": "COMPLETED",
    "orderId": "order_id"
  }
}
```

**Notes:**
- ✅ Works without authentication
- If order has no userId (guest order), anyone can pay for it
- If user is authenticated and order has userId, they must match

---

### 4. **Confirm Payment**

**Endpoint:** `POST /api/v1/payments/confirm-payment`

**Authentication:** Optional (✅ Works without auth token)

**Request:**
```javascript
// With or without authentication
const response = await fetch('/api/v1/payments/confirm-payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Optional: Include auth token if user is logged in
    ...(authToken && { Authorization: `Bearer ${authToken}` }),
  },
  credentials: 'include',
  body: JSON.stringify({
    paymentId: 'square_payment_id', // Optional if orderId is provided
    orderId: 'order_id', // Optional if paymentId is provided
  }),
});
```

**Response:**
```json
{
  "success": true,
  "message": "Payment confirmed successfully",
  "data": {
    "status": "success",
    "orderId": "order_id",
    "paymentId": "square_payment_id",
    "data": { /* Square payment details */ }
  }
}
```

**Notes:**
- ✅ Works without authentication
- If user is authenticated during confirmation, guest order can be linked to their account
- Guest orders remain accessible by order ID

---

### 5. **Finalize Order (Checkout Confirm)**

**Endpoint:** `POST /api/v1/checkout/confirm`

**Authentication:** Optional (✅ Works without auth token)

**Request:**
```javascript
// With or without authentication
const response = await fetch('/api/v1/checkout/confirm', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Optional: Include auth token if user is logged in
    ...(authToken && { Authorization: `Bearer ${authToken}` }),
  },
  credentials: 'include',
  body: JSON.stringify({
    orderId: 'order_id',
    paymentId: 'square_payment_id', // Optional
  }),
});
```

**Response:**
```json
{
  "success": true,
  "message": "Order status retrieved successfully",
  "data": {
    "order": {
      "id": "order_id",
      "competitionId": "competition_id",
      "competitionTitle": "Competition Title",
      "amount": 9.95,
      "quantity": 5,
      "status": "completed",
      "paymentStatus": "paid",
      "ticketsReserved": [1, 2, 3, 4, 5],
      "tickets": [
        {
          "id": "ticket_id",
          "ticketNumber": 1,
          "status": "active"
        }
      ],
      "squarePaymentId": "square_payment_id"
    }
  }
}
```

**Notes:**
- ✅ Works without authentication
- Converts reserved tickets to purchased tickets
- Guest orders work seamlessly

---

## Frontend Implementation

### React Hook Example

```typescript
import { useState } from 'react';

interface CheckoutState {
  orderId: string | null;
  loading: boolean;
  error: string | null;
}

export const useGuestCheckout = () => {
  const [state, setState] = useState<CheckoutState>({
    orderId: null,
    loading: false,
    error: null,
  });

  const createOrder = async (orderData: any) => {
    setState({ ...state, loading: true, error: null });
    
    try {
      const authToken = localStorage.getItem('authToken'); // Optional
      
      const response = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        credentials: 'include',
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const data = await response.json();
      setState({
        orderId: data.data.id,
        loading: false,
        error: null,
      });
      
      return data.data;
    } catch (error: any) {
      setState({
        ...state,
        loading: false,
        error: error.message,
      });
      throw error;
    }
  };

  const processPayment = async (orderId: string, sourceId: string) => {
    setState({ ...state, loading: true, error: null });
    
    try {
      const authToken = localStorage.getItem('authToken'); // Optional
      
      const response = await fetch('/api/v1/payments/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        credentials: 'include',
        body: JSON.stringify({
          sourceId,
          orderId,
        }),
      });

      if (!response.ok) {
        throw new Error('Payment failed');
      }

      const data = await response.json();
      setState({
        ...state,
        loading: false,
        error: null,
      });
      
      return data.data;
    } catch (error: any) {
      setState({
        ...state,
        loading: false,
        error: error.message,
      });
      throw error;
    }
  };

  const confirmPayment = async (orderId: string, paymentId: string) => {
    setState({ ...state, loading: true, error: null });
    
    try {
      const authToken = localStorage.getItem('authToken'); // Optional
      
      const response = await fetch('/api/v1/payments/confirm-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        credentials: 'include',
        body: JSON.stringify({
          orderId,
          paymentId,
        }),
      });

      if (!response.ok) {
        throw new Error('Payment confirmation failed');
      }

      const data = await response.json();
      setState({
        ...state,
        loading: false,
        error: null,
      });
      
      return data.data;
    } catch (error: any) {
      setState({
        ...state,
        loading: false,
        error: error.message,
      });
      throw error;
    }
  };

  return {
    ...state,
    createOrder,
    processPayment,
    confirmPayment,
  };
};
```

---

### Axios Configuration

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
  withCredentials: true, // Include cookies
});

// Request interceptor - add auth token if available (optional)
api.interceptors.request.use((config) => {
  const authToken = localStorage.getItem('authToken');
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Guest checkout example
export const createGuestOrder = async (orderData: any) => {
  // No auth token needed - works as guest
  const response = await api.post('/orders', orderData);
  return response.data;
};

// Authenticated checkout example
export const createAuthenticatedOrder = async (orderData: any) => {
  // Auth token is automatically added by interceptor
  const response = await api.post('/orders', orderData);
  return response.data;
};
```

---

## Checkout Flow

### Guest Checkout Flow

```
1. User selects tickets
   ↓
2. User enters billing details (email required)
   ↓
3. POST /api/v1/orders (no auth token)
   → Creates order with userId: null
   ↓
4. User enters payment details
   ↓
5. POST /api/v1/payments/create-payment (no auth token)
   → Processes payment for guest order
   ↓
6. POST /api/v1/payments/confirm-payment (no auth token)
   → Confirms payment
   ↓
7. POST /api/v1/checkout/confirm (no auth token)
   → Finalizes order, converts tickets to purchased
   ↓
8. GET /api/v1/orders/:id (no auth token)
   → Shows order confirmation (accessible by order ID)
```

### Authenticated Checkout Flow

```
1. User selects tickets (logged in)
   ↓
2. POST /api/v1/orders (with auth token)
   → Creates order with userId: user_id
   ↓
3. POST /api/v1/payments/create-payment (with auth token)
   → Processes payment for user's order
   ↓
4. POST /api/v1/payments/confirm-payment (with auth token)
   → Confirms payment
   ↓
5. POST /api/v1/checkout/confirm (with auth token)
   → Finalizes order
   ↓
6. GET /api/v1/orders/:id (with auth token)
   → Shows order confirmation
```

---

## Important Notes

### ✅ Guest Orders

- **No Account Required**: Users can checkout without creating an account
- **Order Access**: Guest orders can be accessed by anyone with the order ID
- **Email Required**: Billing email is required for order confirmation
- **Account Linking**: If user logs in during checkout, guest order can be linked to their account

### ✅ Authentication Handling

- **Optional Auth**: All endpoints work with or without authentication
- **Token Format**: Use `Authorization: Bearer <token>` header if token is available
- **Cookie Auth**: If using cookie-based auth, include `credentials: 'include'`
- **No Token**: If no token is provided, checkout proceeds as guest

### ✅ Order Linking

- If a guest order is created and user logs in later, the order remains a guest order
- If user is authenticated during payment confirmation, the order can be linked to their account
- Guest orders are identified by `userId: null` or `undefined`

---

## Error Handling

### Common Errors

**401 Unauthorized:**
- Only occurs if authenticated user tries to access another user's order
- Guest orders don't require authentication

**403 Forbidden:**
- User tries to access order that belongs to another user
- Guest orders are accessible by anyone with order ID

**404 Not Found:**
- Order ID doesn't exist
- Payment ID doesn't exist

### Error Response Format

```json
{
  "success": false,
  "message": "Error message",
  "statusCode": 400
}
```

---

## Testing

### Test Guest Checkout

```javascript
// 1. Create order without auth token
const orderResponse = await fetch('/api/v1/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    competitionId: 'test_competition_id',
    qty: 1,
    billingDetails: {
      email: 'guest@example.com',
      firstName: 'Guest',
      lastName: 'User',
    },
  }),
});

const order = await orderResponse.json();
console.log('Order created:', order.data.id);
console.log('User ID:', order.data.userId); // Should be null

// 2. Access order without auth token
const getOrderResponse = await fetch(`/api/v1/orders/${order.data.id}`, {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
});

const orderDetails = await getOrderResponse.json();
console.log('Order details:', orderDetails.data.order);
```

### Test Authenticated Checkout

```javascript
// Same as above, but include auth token
const authToken = 'your_auth_token';

const orderResponse = await fetch('/api/v1/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  },
  credentials: 'include',
  body: JSON.stringify({ /* ... */ }),
});

const order = await orderResponse.json();
console.log('User ID:', order.data.userId); // Should be user ID
```

---

## Migration Guide

### If You Previously Required Authentication

**Before:**
```javascript
// Required auth token
const response = await fetch('/api/v1/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`, // Required
  },
  body: JSON.stringify(orderData),
});
```

**After:**
```javascript
// Auth token is optional
const response = await fetch('/api/v1/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(authToken && { Authorization: `Bearer ${authToken}` }), // Optional
  },
  credentials: 'include',
  body: JSON.stringify(orderData),
});
```

---

## Summary

✅ **All checkout endpoints now support guest checkout**
✅ **Authentication is optional** - works with or without auth token
✅ **Guest orders** have `userId: null` and are accessible by order ID
✅ **Seamless experience** - same flow for authenticated and guest users
✅ **Account linking** - guest orders can be linked if user logs in

**Key Takeaway:** You can now allow users to checkout without creating an account, while still supporting authenticated checkout for logged-in users.

---

**Last Updated:** 2025-01-24

