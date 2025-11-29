# Authentication Requirement Changes - Frontend Documentation

## Overview

All checkout and order endpoints now **require user authentication**. Guest checkout has been removed. Users must be logged in to create orders, view orders, and process payments.

---

## Changes Summary

### Before (Guest Checkout Enabled)
- ✅ Users could checkout without logging in
- ✅ Orders could be created with `userId: null` (guest orders)
- ✅ Payment processing worked for both authenticated and guest users

### After (Authentication Required)
- ❌ **All checkout endpoints require authentication**
- ❌ **Users must be logged in to create orders**
- ❌ **Users must be logged in to view orders**
- ❌ **Users must be logged in to process payments**

---

## Affected Endpoints

### 1. Create Order

**Endpoint:** `POST /api/v1/orders`

**Before:** Optional authentication (guest checkout supported)
**After:** ✅ **Authentication Required**

**Request:**
```json
{
  "competitionId": "comp_123",
  "qty": 3,
  "ticketsReserved": [5, 12, 23],
  "billingDetails": {
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

**Response (401 if not authenticated):**
```json
{
  "success": false,
  "message": "Not authorized",
  "statusCode": 401
}
```

---

### 2. Get Order by ID

**Endpoint:** `GET /api/v1/orders/:id`

**Before:** Optional authentication (guest orders accessible by ID)
**After:** ✅ **Authentication Required**

**Response (401 if not authenticated):**
```json
{
  "success": false,
  "message": "Not authorized",
  "statusCode": 401
}
```

**Response (403 if user doesn't own order):**
```json
{
  "success": false,
  "message": "Not authorized to access this order",
  "statusCode": 403
}
```

---

### 3. Create Payment

**Endpoint:** `POST /api/v1/payments/create-payment`

**Before:** Optional authentication (guest checkout supported)
**After:** ✅ **Authentication Required**

**Request:**
```json
{
  "sourceId": "square_nonce",
  "orderId": "order_id",
  "idempotencyKey": "unique_key"
}
```

**Response (401 if not authenticated):**
```json
{
  "success": false,
  "message": "Not authorized",
  "statusCode": 401
}
```

---

### 4. Confirm Payment

**Endpoint:** `POST /api/v1/payments/confirm-payment`

**Before:** Optional authentication (guest checkout supported)
**After:** ✅ **Authentication Required**

**Request:**
```json
{
  "orderId": "order_id",
  "paymentId": "square_payment_id"
}
```

**Response (401 if not authenticated):**
```json
{
  "success": false,
  "message": "Not authorized",
  "statusCode": 401
}
```

---

### 5. Create Checkout from Cart

**Endpoint:** `POST /api/v1/checkout/create`

**Before:** Required authentication (already required)
**After:** ✅ **Authentication Required** (unchanged)

**Note:** This endpoint already required authentication, so no change needed.

---

### 6. Create Checkout Payment Intent

**Endpoint:** `POST /api/v1/checkout/payment-intent`

**Before:** Optional authentication (guest checkout supported)
**After:** ✅ **Authentication Required**

**Request:**
```json
{
  "orderId": "order_id",
  "billingDetails": {
    "email": "user@example.com"
  }
}
```

**Response (401 if not authenticated):**
```json
{
  "success": false,
  "message": "Not authorized",
  "statusCode": 401
}
```

---

### 7. Confirm Checkout Order

**Endpoint:** `POST /api/v1/checkout/confirm`

**Before:** Optional authentication (guest checkout supported)
**After:** ✅ **Authentication Required**

**Request:**
```json
{
  "orderId": "order_id",
  "paymentId": "square_payment_id"
}
```

**Response (401 if not authenticated):**
```json
{
  "success": false,
  "message": "Not authorized",
  "statusCode": 401
}
```

---

## Frontend Implementation Changes

### Step 1: Check Authentication Before Checkout

```typescript
// components/CheckoutButton.tsx
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export const CheckoutButton = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      navigate('/login?returnUrl=/checkout');
      return;
    }

    // Proceed with checkout
    proceedToCheckout();
  };

  return (
    <button onClick={handleCheckout}>
      {isAuthenticated ? 'Proceed to Checkout' : 'Login to Checkout'}
    </button>
  );
};
```

---

### Step 2: Update API Client Error Handling

```typescript
// utils/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
  withCredentials: true,
});

// Request interceptor - add auth token if available
api.interceptors.request.use(
  (config) => {
    // Token is automatically sent via cookies
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // User not authenticated
      // Redirect to login or show login modal
      window.location.href = '/login?returnUrl=' + window.location.pathname;
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

### Step 3: Update Order Creation Hook

```typescript
// hooks/useOrder.ts
import { useState } from 'react';
import { useAuth } from './useAuth';
import api from '../utils/api';

export const useOrder = () => {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOrder = async (data: CreateOrderData) => {
    // Check authentication first
    if (!isAuthenticated) {
      throw new Error('Please log in to create an order');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/orders', data);
      return response.data.data.order;
    } catch (err: any) {
      if (err.response?.status === 401) {
        throw new Error('Please log in to create an order');
      }
      const errorMessage = err.response?.data?.message || 'Failed to create order';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    createOrder,
    loading,
    error,
  };
};
```

---

### Step 4: Add Login Prompt Component

```typescript
// components/LoginPrompt.tsx
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface LoginPromptProps {
  message?: string;
  returnUrl?: string;
}

export const LoginPrompt = ({ 
  message = 'Please log in to continue',
  returnUrl 
}: LoginPromptProps) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return null;
  }

  const handleLogin = () => {
    const url = returnUrl || window.location.pathname;
    navigate(`/login?returnUrl=${encodeURIComponent(url)}`);
  };

  return (
    <div className="login-prompt">
      <p>{message}</p>
      <button onClick={handleLogin}>Log In</button>
    </div>
  );
};
```

---

### Step 5: Update Checkout Flow

```typescript
// components/Checkout.tsx
import { useAuth } from '../hooks/useAuth';
import { LoginPrompt } from './LoginPrompt';
import { CheckoutForm } from './CheckoutForm';

export const Checkout = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <LoginPrompt 
        message="Please log in to complete your purchase"
        returnUrl="/checkout"
      />
    );
  }

  return <CheckoutForm />;
};
```

---

## Migration Guide

### For Existing Guest Checkout Implementation

1. **Remove Guest Checkout UI**
   - Remove "Continue as Guest" buttons
   - Remove guest checkout forms
   - Add login requirement messages

2. **Update Error Handling**
   - Handle 401 errors by redirecting to login
   - Show login prompts instead of guest forms
   - Store return URL for post-login redirect

3. **Update Order Creation**
   - Check authentication before showing checkout
   - Redirect to login if not authenticated
   - Remove guest order handling code

4. **Update Payment Processing**
   - Ensure user is authenticated before payment
   - Remove guest payment handling
   - Add authentication checks

---

## User Flow Changes

### Before (Guest Checkout)
```
1. User adds items to cart
2. User clicks "Checkout"
3. User can choose "Continue as Guest" or "Login"
4. Guest user fills billing details
5. Guest user creates order (userId: null)
6. Guest user processes payment
7. Order completed (no account link)
```

### After (Authentication Required)
```
1. User adds items to cart
2. User clicks "Checkout"
3. If not logged in → Redirect to login
4. User logs in
5. User redirected back to checkout
6. User fills billing details (pre-filled from account)
7. User creates order (userId: set automatically)
8. User processes payment
9. Order completed (linked to account)
```

---

## Error Handling

### 401 Unauthorized

**When:** User is not authenticated

**Response:**
```json
{
  "success": false,
  "message": "Not authorized",
  "statusCode": 401
}
```

**Frontend Action:**
```typescript
if (error.response?.status === 401) {
  // Redirect to login with return URL
  const returnUrl = window.location.pathname;
  window.location.href = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
}
```

### 403 Forbidden

**When:** User is authenticated but doesn't own the resource

**Response:**
```json
{
  "success": false,
  "message": "Not authorized to access this order",
  "statusCode": 403
}
```

**Frontend Action:**
```typescript
if (error.response?.status === 403) {
  // Show error message
  alert('You do not have permission to access this order');
  // Redirect to orders list
  navigate('/orders');
}
```

---

## Best Practices

### 1. **Check Authentication Early**
```typescript
// Check before showing checkout UI
if (!isAuthenticated) {
  return <LoginPrompt />;
}
```

### 2. **Store Return URL**
```typescript
// When redirecting to login
const returnUrl = window.location.pathname + window.location.search;
navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
```

### 3. **Pre-fill User Data**
```typescript
// After login, pre-fill billing details from user profile
const billingDetails = {
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
};
```

### 4. **Handle Auth Errors Gracefully**
```typescript
// Show user-friendly messages
if (error.response?.status === 401) {
  toast.error('Please log in to continue');
  navigate('/login');
}
```

---

## Testing Checklist

- [ ] User cannot create order without authentication
- [ ] User cannot view order without authentication
- [ ] User cannot process payment without authentication
- [ ] User is redirected to login when not authenticated
- [ ] User can access their own orders after login
- [ ] User cannot access other users' orders
- [ ] Error messages are user-friendly
- [ ] Return URL works correctly after login

---

## Summary

✅ **All checkout endpoints now require authentication**
✅ **Users must be logged in to create orders**
✅ **Users must be logged in to view orders**
✅ **Users must be logged in to process payments**
✅ **Guest checkout has been removed**

**Key Takeaway**: Users must be authenticated before accessing any checkout or order functionality. The frontend should check authentication status and redirect to login when necessary.

---

**Last Updated:** 2025-01-24

