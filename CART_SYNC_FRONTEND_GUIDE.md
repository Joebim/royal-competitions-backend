# Cart Sync - Frontend Implementation Guide

## Overview

This guide explains how to implement cart synchronization between local storage (guest cart) and server cart (authenticated user cart). When a user logs in with items in their local cart, those items are automatically merged with their server cart.

---

## Feature Description

### Problem

- Users can add items to cart while logged out (stored in localStorage)
- When they log in, their local cart items should be synced to their server cart
- Server cart items should take priority over local cart items
- Duplicate competitions should be handled intelligently

### Solution

- **Sync Endpoint**: `POST /api/v1/cart/sync`
- **Merging Logic**: Server cart items take priority, local cart items are added if competition doesn't exist in server cart
- **Validation**: All items are validated for availability before merging

---

## API Endpoint

### Sync Cart

**Endpoint:** `POST /api/v1/cart/sync`

**Authentication:** Required (user must be logged in)

**Request Body:**

```json
{
  "localCartItems": [
    {
      "competitionId": "competition_id_1",
      "quantity": 3,
      "ticketNumbers": [1, 2, 3] // Optional
    },
    {
      "competitionId": "competition_id_2",
      "quantity": 2,
      "ticketNumbers": null // Optional, null for auto-assignment
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Cart synced successfully",
  "data": {
    "id": "cart_id",
    "currency": "GBP",
    "items": [
      {
        "id": "item_id",
        "competitionId": "competition_id",
        "quantity": 3,
        "ticketNumbers": [1, 2, 3],
        "unitPrice": 1.99,
        "subtotal": 5.97,
        "competition": {
          "id": "competition_id",
          "title": "Competition Title",
          "slug": "competition-slug",
          "image": "https://...",
          "ticketPrice": "1.99",
          "maxTickets": 1000,
          "soldTickets": 150,
          "status": "live",
          "isActive": true,
          "drawDate": "2025-02-01T00:00:00.000Z",
          "category": "Tech & Gadgets"
        }
      }
    ],
    "totals": {
      "items": 2,
      "subtotal": 9.95,
      "totalTickets": 5
    },
    "updatedAt": "2025-01-24T12:00:00.000Z"
  }
}
```

**Error Responses:**

```json
{
  "success": false,
  "message": "localCartItems must be an array",
  "statusCode": 400
}
```

```json
{
  "success": false,
  "message": "Not authorized",
  "statusCode": 401
}
```

---

## Sync Logic

### Merging Rules

1. **Server Cart Priority**: Items already in server cart are kept as-is (server cart takes priority)
2. **Local Cart Addition**: Items from local cart are added only if the competition doesn't exist in server cart
3. **Validation**: All items (both server and local) are validated for:
   - Competition availability
   - Competition status (must be LIVE)
   - Available tickets (quantity doesn't exceed limit)
   - Ticket price (recalculated from current competition price)
4. **Invalid Items**: Items for unavailable competitions are automatically removed
5. **Quantity Adjustment**: If local cart item quantity exceeds available tickets, it's adjusted to available amount

### Example Scenarios

#### Scenario 1: No Conflicts

- **Server Cart**: Competition A (2 tickets)
- **Local Cart**: Competition B (3 tickets)
- **Result**: Both items merged → Competition A (2) + Competition B (3)

#### Scenario 2: Same Competition

- **Server Cart**: Competition A (2 tickets)
- **Local Cart**: Competition A (3 tickets)
- **Result**: Server cart takes priority → Competition A (2 tickets) only

#### Scenario 3: Unavailable Competition

- **Server Cart**: Competition A (2 tickets)
- **Local Cart**: Competition B (3 tickets) - Competition B has ended
- **Result**: Competition B removed → Competition A (2 tickets) only

---

## Frontend Implementation

### Step 1: Store Cart in Local Storage

```typescript
// types/cart.ts
export interface LocalCartItem {
  competitionId: string;
  quantity: number;
  ticketNumbers?: number[] | null;
  addedAt?: string; // Optional timestamp
}

export interface LocalCart {
  items: LocalCartItem[];
  updatedAt: string;
}

// utils/localCart.ts
const CART_STORAGE_KEY = 'royal_competitions_cart';

export const getLocalCart = (): LocalCart => {
  try {
    const cartJson = localStorage.getItem(CART_STORAGE_KEY);
    if (cartJson) {
      return JSON.parse(cartJson);
    }
  } catch (error) {
    console.error('Error reading local cart:', error);
  }
  return { items: [], updatedAt: new Date().toISOString() };
};

export const saveLocalCart = (cart: LocalCart): void => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    console.error('Error saving local cart:', error);
  }
};

export const addToLocalCart = (item: LocalCartItem): void => {
  const cart = getLocalCart();
  const existingIndex = cart.items.findIndex(
    (i) => i.competitionId === item.competitionId
  );

  if (existingIndex >= 0) {
    // Update existing item
    cart.items[existingIndex] = {
      ...item,
      addedAt: cart.items[existingIndex].addedAt || new Date().toISOString(),
    };
  } else {
    // Add new item
    cart.items.push({
      ...item,
      addedAt: new Date().toISOString(),
    });
  }

  cart.updatedAt = new Date().toISOString();
  saveLocalCart(cart);
};

export const removeFromLocalCart = (competitionId: string): void => {
  const cart = getLocalCart();
  cart.items = cart.items.filter(
    (item) => item.competitionId !== competitionId
  );
  cart.updatedAt = new Date().toISOString();
  saveLocalCart(cart);
};

export const clearLocalCart = (): void => {
  localStorage.removeItem(CART_STORAGE_KEY);
};
```

---

### Step 2: Create Cart Sync Hook

```typescript
// hooks/useCartSync.ts
import { useState } from 'react';
import { getLocalCart, clearLocalCart } from '../utils/localCart';
import api from '../utils/api'; // Your API client

interface SyncCartResult {
  success: boolean;
  cart?: any;
  error?: string;
}

export const useCartSync = () => {
  const [syncing, setSyncing] = useState(false);

  const syncCart = async (): Promise<SyncCartResult> => {
    const localCart = getLocalCart();

    // If no local cart items, nothing to sync
    if (!localCart.items || localCart.items.length === 0) {
      return { success: true };
    }

    setSyncing(true);

    try {
      // Prepare local cart items for sync
      const localCartItems = localCart.items.map((item) => ({
        competitionId: item.competitionId,
        quantity: item.quantity,
        ticketNumbers: item.ticketNumbers || null,
      }));

      // Call sync endpoint
      const response = await api.post('/cart/sync', {
        localCartItems,
      });

      // Clear local cart after successful sync
      clearLocalCart();

      return {
        success: true,
        cart: response.data.data,
      };
    } catch (error: any) {
      console.error('Cart sync error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to sync cart',
      };
    } finally {
      setSyncing(false);
    }
  };

  return {
    syncCart,
    syncing,
  };
};
```

---

### Step 3: Integrate with Authentication

```typescript
// hooks/useAuth.ts or your auth context
import { useEffect } from 'react';
import { useCartSync } from './useCartSync';
import { getLocalCart } from '../utils/localCart';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { syncCart, syncing } = useCartSync();

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const userData = response.data.data.user;

      setUser(userData);
      setIsAuthenticated(true);

      // Check if user has local cart items
      const localCart = getLocalCart();
      if (localCart.items && localCart.items.length > 0) {
        // Sync cart after login
        const syncResult = await syncCart();
        if (syncResult.success) {
          console.log('Cart synced successfully');
          // Optionally show a notification
          // toast.success('Your cart items have been synced');
        } else {
          console.error('Cart sync failed:', syncResult.error);
          // Optionally show an error notification
          // toast.error('Failed to sync cart items');
        }
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return {
    user,
    isAuthenticated,
    login,
    logout,
    syncing,
  };
};
```

---

### Step 4: React Component Example

```typescript
// components/CartSyncHandler.tsx
import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCartSync } from '../hooks/useCartSync';
import { getLocalCart } from '../utils/localCart';

export const CartSyncHandler = () => {
  const { isAuthenticated } = useAuth();
  const { syncCart, syncing } = useCartSync();

  useEffect(() => {
    // Sync cart when user becomes authenticated
    if (isAuthenticated) {
      const localCart = getLocalCart();

      // Only sync if there are local cart items
      if (localCart.items && localCart.items.length > 0) {
        syncCart().then((result) => {
          if (result.success) {
            console.log('Cart synced:', result.cart);
            // Optionally refresh cart display or show notification
          } else {
            console.error('Cart sync failed:', result.error);
          }
        });
      }
    }
  }, [isAuthenticated, syncCart]);

  // Optionally show loading indicator
  if (syncing) {
    return <div>Syncing cart...</div>;
  }

  return null;
};
```

---

### Step 5: Complete Cart Management Hook

```typescript
// hooks/useCart.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useCartSync } from './useCartSync';
import {
  getLocalCart,
  saveLocalCart,
  addToLocalCart,
  removeFromLocalCart,
  clearLocalCart,
} from '../utils/localCart';
import api from '../utils/api';

export const useCart = () => {
  const { isAuthenticated } = useAuth();
  const { syncCart } = useCartSync();
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Load cart (server or local)
  const loadCart = useCallback(async () => {
    setLoading(true);
    try {
      if (isAuthenticated) {
        // Load from server
        const response = await api.get('/cart');
        setCart(response.data.data);
      } else {
        // Load from local storage
        const localCart = getLocalCart();
        setCart({
          items: localCart.items,
          totals: {
            items: localCart.items.length,
            subtotal: localCart.items.reduce(
              (sum, item) => sum + item.quantity * (item.unitPrice || 0),
              0
            ),
            totalTickets: localCart.items.reduce(
              (sum, item) => sum + item.quantity,
              0
            ),
          },
        });
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Add item to cart
  const addItem = async (
    competitionId: string,
    quantity: number,
    ticketNumbers?: number[]
  ) => {
    setLoading(true);
    try {
      if (isAuthenticated) {
        // Add to server cart
        const response = await api.post('/cart/items', {
          competitionId,
          quantity,
          ticketNumbers,
        });
        setCart(response.data.data);
      } else {
        // Add to local cart
        addToLocalCart({
          competitionId,
          quantity,
          ticketNumbers,
        });
        await loadCart();
      }
    } catch (error) {
      console.error('Error adding item to cart:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Remove item from cart
  const removeItem = async (itemId: string, competitionId: string) => {
    setLoading(true);
    try {
      if (isAuthenticated) {
        // Remove from server cart
        await api.delete(`/cart/items/${itemId}`);
        await loadCart();
      } else {
        // Remove from local cart
        removeFromLocalCart(competitionId);
        await loadCart();
      }
    } catch (error) {
      console.error('Error removing item from cart:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sync cart when user logs in
  useEffect(() => {
    if (isAuthenticated) {
      const localCart = getLocalCart();
      if (localCart.items && localCart.items.length > 0) {
        syncCart().then((result) => {
          if (result.success) {
            setCart(result.cart);
            clearLocalCart();
          }
          loadCart(); // Reload cart after sync
        });
      } else {
        loadCart(); // Just load server cart if no local items
      }
    } else {
      loadCart(); // Load local cart when logged out
    }
  }, [isAuthenticated, syncCart, loadCart]);

  // Initial load
  useEffect(() => {
    loadCart();
  }, [loadCart]);

  return {
    cart,
    loading,
    addItem,
    removeItem,
    loadCart,
  };
};
```

---

## Implementation Flow

### User Journey

```
1. User browses site (not logged in)
   ↓
2. User adds items to cart
   → Stored in localStorage
   ↓
3. User clicks "Login"
   ↓
4. User enters credentials and logs in
   ↓
5. On successful login:
   a. Check if localCart has items
   b. If yes, call POST /api/v1/cart/sync
   c. Merge local cart with server cart
   d. Clear localStorage cart
   e. Display merged cart
   ↓
6. User continues shopping with synced cart
```

---

## Best Practices

### 1. **Sync Timing**

- ✅ Sync immediately after successful login
- ✅ Don't sync on every page load (only on login)
- ✅ Show loading indicator during sync

### 2. **Error Handling**

- ✅ If sync fails, keep local cart items
- ✅ Show user-friendly error message
- ✅ Allow manual retry if needed

### 3. **User Experience**

- ✅ Show notification when cart is synced
- ✅ Display merged cart count
- ✅ Handle conflicts gracefully (server cart takes priority)

### 4. **Data Validation**

- ✅ Validate local cart items before syncing
- ✅ Handle expired competitions
- ✅ Adjust quantities if tickets are sold out

---

## Example: Complete Login Component

```typescript
// components/LoginForm.tsx
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCartSync } from '../hooks/useCartSync';
import { getLocalCart } from '../utils/localCart';

export const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { syncCart, syncing } = useCartSync();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // Login
      await login(email, password);

      // Check for local cart items
      const localCart = getLocalCart();
      if (localCart.items && localCart.items.length > 0) {
        // Sync cart
        const result = await syncCart();
        if (result.success) {
          // Show success message
          alert(
            `Welcome back! ${localCart.items.length} item(s) from your cart have been synced.`
          );
        } else {
          // Show warning but don't block login
          console.warn('Cart sync failed:', result.error);
        }
      }

      // Redirect to home or previous page
      window.location.href = '/';
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <div className="error">{error}</div>}
      {syncing && <div>Syncing your cart...</div>}
      <button type="submit" disabled={syncing}>
        {syncing ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};
```

---

## Testing

### Test Case 1: Sync with No Conflicts

```javascript
// Setup: User has Competition A in server cart, Competition B in local cart
const localCartItems = [
  { competitionId: 'comp_b', quantity: 2, ticketNumbers: null },
];

// Expected: Both items in merged cart
```

### Test Case 2: Sync with Conflicts

```javascript
// Setup: User has Competition A (2 tickets) in server cart, Competition A (3 tickets) in local cart
const localCartItems = [
  { competitionId: 'comp_a', quantity: 3, ticketNumbers: null },
];

// Expected: Server cart takes priority - Competition A (2 tickets) only
```

### Test Case 3: Sync with Unavailable Competition

```javascript
// Setup: User has ended competition in local cart
const localCartItems = [
  { competitionId: 'ended_comp', quantity: 2, ticketNumbers: null },
];

// Expected: Unavailable competition removed from cart
```

---

## Troubleshooting

### Issue: Cart not syncing after login

**Solution:**

- Check if `localCartItems` array is being sent correctly
- Verify user is authenticated before calling sync
- Check browser console for errors

### Issue: Duplicate items in cart

**Solution:**

- Server cart items take priority - this is expected behavior
- If you want local cart to override, modify sync logic

### Issue: Items removed after sync

**Solution:**

- Items are removed if competition is unavailable
- Check competition status and availability
- Validate items before syncing

---

## Summary

✅ **Sync Endpoint**: `POST /api/v1/cart/sync`
✅ **Merging Logic**: Server cart takes priority, local cart items added if competition doesn't exist
✅ **Validation**: All items validated for availability
✅ **User Experience**: Seamless sync on login
✅ **Error Handling**: Graceful handling of sync failures

**Key Takeaway**: When a user logs in with items in their local cart, those items are automatically merged with their server cart, with server cart items taking priority.

---

**Last Updated:** 2025-01-24
