# Order Handling - Frontend Implementation Guide

## Overview

This guide explains how to handle order creation and management for both **logged-in users** and **guest users (logged out)**. The same API endpoints work for both, with automatic user detection.

---

## Key Concepts

### Authentication States

- **Logged In**: User has valid auth token/cookie → `userId` automatically set in order
- **Guest (Logged Out)**: No auth token/cookie → `userId` is `undefined` in order
- **Same Request Structure**: Both use identical request body format

### Order Flow

```
1. Add to Cart → Tickets Reserved
2. Create Order → Order Created (PENDING)
3. Process Payment → Payment Confirmed
4. Tickets Activated → Status: ACTIVE
```

---

## API Endpoints

### 1. Create Order (Single Competition)

**Endpoint:** `POST /api/v1/orders`

**Authentication:** Optional (works for both logged-in and guest users)

**Request Body:**
```json
{
  "competitionId": "competition_id",
  "qty": 3,
  "ticketsReserved": [5, 12, 23],  // Required - from cart
  "ticketsValid": true,            // Optional (default: true)
  "billingDetails": {
    "email": "user@example.com",   // Required
    "firstName": "John",           // Optional
    "lastName": "Doe",             // Optional
    "phone": "+1234567890"         // Optional
  },
  "shippingAddress": {             // Optional
    "line1": "123 Main St",
    "line2": "Apt 4B",
    "city": "London",
    "postalCode": "SW1A 1AA",
    "country": "GB"
  },
  "marketingOptIn": false          // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": {
      "id": "order_id",
      "userId": "user_id_or_null",  // null for guest orders
      "competitionId": "competition_id",
      "orderNumber": "ORD-20250124-ABC123",
      "amount": 5.97,
      "amountGBP": "5.97",
      "currency": "GBP",
      "quantity": 3,
      "status": "pending",
      "paymentStatus": "pending",
      "ticketsReserved": [5, 12, 23],
      "billingDetails": { ... },
      "shippingAddress": { ... },
      "createdAt": "2025-01-24T12:00:00.000Z"
    },
    "orderId": "order_id"
  }
}
```

---

### 2. Create Orders from Cart (Multiple Competitions)

**Endpoint:** `POST /api/v1/checkout/create`

**Authentication:** Required (only for logged-in users)

**Request Body:**
```json
{
  "billingDetails": {
    "email": "user@example.com",   // Required
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890"
  },
  "shippingAddress": {             // Optional
    "line1": "123 Main St",
    "city": "London",
    "postalCode": "SW1A 1AA",
    "country": "GB"
  },
  "marketingOptIn": false          // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Checkout initiated successfully",
  "data": {
    "orders": [
      {
        "id": "order_id_1",
        "competitionId": "comp_1",
        "competitionTitle": "Win an iPhone 15",
        "quantity": 2,
        "amount": 3.98,
        "amountGBP": "3.98",
        "orderId": "order_id_1"
      },
      {
        "id": "order_id_2",
        "competitionId": "comp_2",
        "competitionTitle": "Win a MacBook Pro",
        "quantity": 1,
        "amount": 1.99,
        "amountGBP": "1.99",
        "orderId": "order_id_2"
      }
    ],
    "message": "Orders created with tickets reserved. Please complete payment for each order."
  }
}
```

---

### 3. Get Order by ID

**Endpoint:** `GET /api/v1/orders/:id`

**Authentication:** Optional (works for both logged-in and guest users)

**Response:**
```json
{
  "success": true,
  "message": "Order retrieved successfully",
  "data": {
    "order": {
      "id": "order_id",
      "userId": "user_id_or_null",
      "orderNumber": "ORD-20250124-ABC123",
      "amount": 5.97,
      "amountGBP": "5.97",
      "currency": "GBP",
      "quantity": 3,
      "status": "pending",
      "paymentStatus": "pending",
      "ticketsReserved": [5, 12, 23],
      "squarePaymentId": null,
      "billingDetails": { ... },
      "shippingAddress": { ... },
      "createdAt": "2025-01-24T12:00:00.000Z",
      "updatedAt": "2025-01-24T12:00:00.000Z"
    }
  }
}
```

---

## Frontend Implementation

### Step 1: Order Creation Hook

```typescript
// hooks/useOrder.ts
import { useState } from 'react';
import api from '../utils/api'; // Your API client with credentials: 'include'

interface CreateOrderData {
  competitionId: string;
  qty: number;
  ticketsReserved: number[];
  ticketsValid?: boolean;
  billingDetails: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    postalCode: string;
    country?: string;
  };
  marketingOptIn?: boolean;
}

interface Order {
  id: string;
  userId: string | null;
  competitionId: string;
  orderNumber: string;
  amount: number;
  amountGBP: string;
  currency: string;
  quantity: number;
  status: string;
  paymentStatus: string;
  ticketsReserved: number[];
  billingDetails: any;
  shippingAddress?: any;
  createdAt: string;
}

export const useOrder = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOrder = async (data: CreateOrderData): Promise<Order> => {
    setLoading(true);
    setError(null);

    try {
      // Same request for both logged-in and guest users
      // Backend automatically detects authentication via cookies/token
      const response = await api.post('/orders', data);
      return response.data.data.order;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to create order';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getOrder = async (orderId: string): Promise<Order> => {
    setLoading(true);
    setError(null);

    try {
      // Works for both logged-in and guest users
      const response = await api.get(`/orders/${orderId}`);
      return response.data.data.order;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to get order';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    createOrder,
    getOrder,
    loading,
    error,
  };
};
```

---

### Step 2: Checkout from Cart Hook (Logged-In Only)

```typescript
// hooks/useCheckout.ts
import { useState } from 'react';
import api from '../utils/api';

interface CheckoutData {
  billingDetails: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    postalCode: string;
    country?: string;
  };
  marketingOptIn?: boolean;
}

interface CheckoutOrder {
  id: string;
  competitionId: string;
  competitionTitle: string;
  quantity: number;
  amount: number;
  amountGBP: string;
  orderId: string;
}

export const useCheckout = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCheckoutFromCart = async (
    data: CheckoutData
  ): Promise<CheckoutOrder[]> => {
    setLoading(true);
    setError(null);

    try {
      // Requires authentication - only for logged-in users
      const response = await api.post('/checkout/create', data);
      return response.data.data.orders;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to create checkout';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    createCheckoutFromCart,
    loading,
    error,
  };
};
```

---

### Step 3: Order Creation Component (Single Competition)

```typescript
// components/CreateOrder.tsx
import { useState } from 'react';
import { useOrder } from '../hooks/useOrder';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';

interface CreateOrderProps {
  competitionId: string;
  onOrderCreated: (orderId: string) => void;
}

export const CreateOrder = ({ competitionId, onOrderCreated }: CreateOrderProps) => {
  const { createOrder, loading, error } = useOrder();
  const { cart } = useCart();
  const { isAuthenticated } = useAuth();
  const [billingDetails, setBillingDetails] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [shippingAddress, setShippingAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    postalCode: '',
    country: 'GB',
  });
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  // Get cart item for this competition
  const cartItem = cart?.items.find(
    (item) => item.competitionId === competitionId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cartItem || !cartItem.ticketNumbers || cartItem.ticketNumbers.length === 0) {
      alert('Please add items to cart first');
      return;
    }

    try {
      // Same request structure for both logged-in and guest users
      const order = await createOrder({
        competitionId,
        qty: cartItem.quantity,
        ticketsReserved: cartItem.ticketNumbers, // From cart
        billingDetails: {
          email: billingDetails.email,
          firstName: billingDetails.firstName,
          lastName: billingDetails.lastName,
          phone: billingDetails.phone,
        },
        shippingAddress: {
          line1: shippingAddress.line1,
          line2: shippingAddress.line2,
          city: shippingAddress.city,
          postalCode: shippingAddress.postalCode,
          country: shippingAddress.country,
        },
        marketingOptIn,
      });

      // Order created successfully
      onOrderCreated(order.id);
    } catch (err: any) {
      console.error('Order creation error:', err);
      // Error is already set in hook
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Order Details</h2>

      {/* Billing Details */}
      <div className="form-group">
        <label>Email *</label>
        <input
          type="email"
          required
          value={billingDetails.email}
          onChange={(e) =>
            setBillingDetails({ ...billingDetails, email: e.target.value })
          }
        />
      </div>

      <div className="form-group">
        <label>First Name</label>
        <input
          type="text"
          value={billingDetails.firstName}
          onChange={(e) =>
            setBillingDetails({ ...billingDetails, firstName: e.target.value })
          }
        />
      </div>

      <div className="form-group">
        <label>Last Name</label>
        <input
          type="text"
          value={billingDetails.lastName}
          onChange={(e) =>
            setBillingDetails({ ...billingDetails, lastName: e.target.value })
          }
        />
      </div>

      <div className="form-group">
        <label>Phone</label>
        <input
          type="tel"
          value={billingDetails.phone}
          onChange={(e) =>
            setBillingDetails({ ...billingDetails, phone: e.target.value })
          }
        />
      </div>

      {/* Shipping Address */}
      <div className="form-group">
        <label>Address Line 1</label>
        <input
          type="text"
          value={shippingAddress.line1}
          onChange={(e) =>
            setShippingAddress({ ...shippingAddress, line1: e.target.value })
          }
        />
      </div>

      <div className="form-group">
        <label>City</label>
        <input
          type="text"
          value={shippingAddress.city}
          onChange={(e) =>
            setShippingAddress({ ...shippingAddress, city: e.target.value })
          }
        />
      </div>

      <div className="form-group">
        <label>Postal Code</label>
        <input
          type="text"
          value={shippingAddress.postalCode}
          onChange={(e) =>
            setShippingAddress({
              ...shippingAddress,
              postalCode: e.target.value,
            })
          }
        />
      </div>

      {/* Marketing Opt-In */}
      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={marketingOptIn}
            onChange={(e) => setMarketingOptIn(e.target.checked)}
          />
          Subscribe to marketing emails
        </label>
      </div>

      {/* User Status Info */}
      <div className="user-status">
        {isAuthenticated ? (
          <p className="info">✓ Logged in as user</p>
        ) : (
          <p className="info">Guest checkout (no account required)</p>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      <button type="submit" disabled={loading}>
        {loading ? 'Creating Order...' : 'Create Order'}
      </button>
    </form>
  );
};
```

---

### Step 4: Checkout from Cart Component (Logged-In Only)

```typescript
// components/CheckoutFromCart.tsx
import { useState } from 'react';
import { useCheckout } from '../hooks/useCheckout';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export const CheckoutFromCart = () => {
  const { createCheckoutFromCart, loading, error } = useCheckout();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [billingDetails, setBillingDetails] = useState({
    email: user?.email || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
  });
  const [shippingAddress, setShippingAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    postalCode: '',
    country: 'GB',
  });
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  // Redirect if not logged in
  if (!isAuthenticated) {
    return (
      <div>
        <p>Please log in to checkout from cart</p>
        <button onClick={() => navigate('/login')}>Login</button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const orders = await createCheckoutFromCart({
        billingDetails,
        shippingAddress,
        marketingOptIn,
      });

      // Multiple orders created - proceed to payment
      // You can handle multiple payments or combine them
      if (orders.length > 0) {
        navigate(`/payment?orderId=${orders[0].id}`);
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Checkout</h2>

      {/* Pre-fill with user data if logged in */}
      <div className="form-group">
        <label>Email *</label>
        <input
          type="email"
          required
          value={billingDetails.email}
          onChange={(e) =>
            setBillingDetails({ ...billingDetails, email: e.target.value })
          }
        />
      </div>

      {/* Rest of form similar to CreateOrder component */}
      {/* ... */}

      {error && <div className="error">{error}</div>}

      <button type="submit" disabled={loading}>
        {loading ? 'Processing...' : 'Proceed to Payment'}
      </button>
    </form>
  );
};
```

---

## Differences: Logged-In vs Guest

### Request Structure
✅ **Same** - Identical request body for both

### Authentication
- **Logged In**: Auth token/cookie sent automatically
- **Guest**: No auth token/cookie

### Backend Behavior
- **Logged In**: `userId` set automatically from token
- **Guest**: `userId` is `null` in order

### Order Access
- **Logged In**: Can access via `/orders` (my orders list)
- **Guest**: Can only access via `/orders/:id` (with order ID)

### Cart Checkout
- **Logged In**: Can use `/checkout/create` (from cart)
- **Guest**: Must use `/orders` (single competition, pass tickets)

---

## Complete Flow Examples

### Flow 1: Logged-In User (Single Competition)

```typescript
// 1. Add to cart (tickets reserved)
await addToCart({
  competitionId: 'comp_123',
  quantity: 3,
  ticketType: 'lucky_draw',
});

// 2. Get cart to retrieve ticket numbers
const cart = await getCart();
const cartItem = cart.items.find((item) => item.competitionId === 'comp_123');

// 3. Create order (userId automatically set from auth)
const order = await createOrder({
  competitionId: 'comp_123',
  qty: 3,
  ticketsReserved: cartItem.ticketNumbers, // [5, 12, 23]
  billingDetails: {
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
  },
});

// 4. Process payment
await processPayment({
  orderId: order.id,
  sourceId: 'square_nonce',
});
```

### Flow 2: Guest User (Single Competition)

```typescript
// 1. Add to cart (tickets reserved) - but wait, guest can't have cart!
// For guest users, you need to:
// Option A: Use local storage for cart
// Option B: Create order directly with tickets

// For direct order creation (guest):
// First, you'd need to reserve tickets somehow, or
// The backend should handle ticket reservation if not in cart

// Actually, for guest checkout, the flow is:
// 1. User selects tickets (frontend only, no cart)
// 2. Create order with ticket numbers
// 3. Backend reserves tickets during order creation

// But wait - the current implementation requires ticketsReserved
// So for guest users, you might need to:
// - Use a temporary reservation endpoint, OR
// - Modify the flow to allow order creation without pre-reserved tickets

// For now, assuming guest can't use cart:
const order = await createOrder({
  competitionId: 'comp_123',
  qty: 3,
  ticketsReserved: [5, 12, 23], // Must be provided
  billingDetails: {
    email: 'guest@example.com',
    firstName: 'Guest',
    lastName: 'User',
  },
});

// Note: This requires tickets to be reserved first
// You might need a "reserve tickets" endpoint for guest users
```

### Flow 3: Logged-In User (Cart Checkout)

```typescript
// 1. Add multiple items to cart
await addToCart({ competitionId: 'comp_1', quantity: 2, ticketType: 'lucky_draw' });
await addToCart({ competitionId: 'comp_2', quantity: 1, ticketType: 'number_picker', ticketNumbers: [10] });

// 2. Checkout from cart (creates multiple orders)
const orders = await createCheckoutFromCart({
  billingDetails: {
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
  },
});

// 3. Process payment for each order
for (const order of orders) {
  await processPayment({
    orderId: order.id,
    sourceId: 'square_nonce',
  });
}
```

---

## Error Handling

### Common Errors

#### 1. Tickets Not Reserved
```json
{
  "success": false,
  "message": "Tickets must be reserved before creating order. Please add items to cart first.",
  "statusCode": 400
}
```
**Solution**: Ensure tickets are reserved in cart first, or provide `ticketsReserved` array.

#### 2. Tickets Expired
```json
{
  "success": false,
  "message": "Some reserved tickets have expired. Please remove and re-add to cart.",
  "statusCode": 400
}
```
**Solution**: Refresh cart and re-add items.

#### 3. Competition Not Available
```json
{
  "success": false,
  "message": "This competition is no longer accepting entries",
  "statusCode": 400
}
```
**Solution**: Inform user competition has ended.

#### 4. Cart Empty (Checkout)
```json
{
  "success": false,
  "message": "Cart is empty",
  "statusCode": 400
}
```
**Solution**: Add items to cart before checkout.

---

## Best Practices

### 1. **Pre-fill User Data**
```typescript
// If logged in, pre-fill billing details from user profile
const billingDetails = isAuthenticated
  ? {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
    }
  : {
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
    };
```

### 2. **Handle Guest Orders**
```typescript
// Store order ID in localStorage for guest users
if (!isAuthenticated && order) {
  localStorage.setItem('guest_order_id', order.id);
}

// Later, retrieve order
const orderId = localStorage.getItem('guest_order_id');
if (orderId) {
  const order = await getOrder(orderId);
}
```

### 3. **Show User Status**
```typescript
// Display whether user is logged in or guest
{isAuthenticated ? (
  <p>✓ Order will be linked to your account</p>
) : (
  <p>ℹ Guest checkout - save your order number for tracking</p>
)}
```

### 4. **Validate Before Submission**
```typescript
// Ensure tickets are available before creating order
if (!cartItem || !cartItem.ticketNumbers || cartItem.ticketNumbers.length === 0) {
  alert('Please add items to cart first');
  return;
}
```

### 5. **Error Recovery**
```typescript
try {
  const order = await createOrder(data);
} catch (error: any) {
  if (error.message.includes('expired')) {
    // Refresh cart and retry
    await refreshCart();
    // Show retry button
  } else {
    // Show error message
  }
}
```

---

## Summary

✅ **Same Request Structure**: Identical request body for logged-in and guest users
✅ **Automatic User Detection**: Backend sets `userId` automatically based on auth
✅ **Guest Support**: Guest users can create orders (userId: null)
✅ **Cart Checkout**: Only available for logged-in users
✅ **Order Access**: Both can access orders via order ID
✅ **Error Handling**: Same error handling for both user types

**Key Takeaway**: The frontend can use the same code for both logged-in and guest users. The backend automatically handles the authentication difference.

---

**Last Updated:** 2025-01-24

