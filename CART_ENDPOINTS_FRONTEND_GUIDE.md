# Cart Endpoints - Frontend Implementation Guide

This guide provides complete instructions for integrating the cart functionality with ticket number selection into your frontend application.

## Table of Contents

1. [Overview](#overview)
2. [API Endpoints](#api-endpoints)
3. [Ticket Number Selection](#ticket-number-selection)
4. [Request/Response Examples](#requestresponse-examples)
5. [Frontend Implementation](#frontend-implementation)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)

---

## Overview

The cart system allows users to:

- Add competitions to cart with specific ticket numbers
- Update quantities and ticket numbers
- View cart with all selected ticket numbers
- Remove items from cart
- Clear entire cart

### Key Features

- **Ticket Number Selection**: Users can select specific ticket numbers when adding to cart
- **Auto-Assignment**: If ticket numbers not provided, they'll be auto-assigned during checkout
- **Validation**: Ticket numbers array length must match quantity
- **Persistence**: Cart is saved per user and persists across sessions

---

## API Endpoints

### Base URL

```
http://localhost:5000/api/v1/cart
```

### Authentication

All cart endpoints require authentication. Include credentials in requests:

```typescript
headers: {
  'Content-Type': 'application/json',
  // Cookies are automatically sent with withCredentials: true
}
```

---

## Endpoint Details

### 1. Get Cart

**GET** `/api/v1/cart`

Retrieves the current user's cart with all items and selected ticket numbers.

**Response**:

```typescript
{
  "success": true,
  "message": "Cart retrieved successfully",
  "data": {
    "id": "cart_id",
    "currency": "GBP",
    "items": [
      {
        "id": "item_id",
        "competitionId": "competition_id",
        "quantity": 3,
        "ticketNumbers": [5, 12, 23], // Array of selected ticket numbers
        "unitPrice": 1.99,
        "subtotal": 5.97,
        "addedAt": "2025-01-24T10:00:00.000Z",
        "updatedAt": "2025-01-24T10:00:00.000Z",
        "competition": {
          "id": "competition_id",
          "title": "Win the Ultimate Ham Radio & Tech Gear Bundle",
          "slug": "win-the-ultimate-ham-radio-tech-gear-bundle",
          "image": "https://...",
          "ticketPrice": "1.99",
          "maxTickets": 1000,
          "soldTickets": 150,
          "status": "live",
          "isActive": true,
          "drawDate": "2025-02-01T18:00:00.000Z",
          "category": "Tech & Gadgets"
        }
      }
    ],
    "totals": {
      "items": 1,        // Number of different competitions
      "subtotal": 5.97,  // Total amount
      "totalTickets": 3 // Total number of tickets
    },
    "updatedAt": "2025-01-24T10:00:00.000Z"
  }
}
```

---

### 2. Add or Update Cart Item

**POST** `/api/v1/cart/items`

Adds a new item to cart or updates existing item if competition already exists in cart.

**Request Body**:

```typescript
{
  competitionId: string;      // Required: Competition ID
  quantity: number;          // Required: Number of tickets (1-20)
  ticketNumbers?: number[];  // Optional: Array of specific ticket numbers
}
```

**Notes**:

- If `ticketNumbers` is provided, array length **must** match `quantity`
- If `ticketNumbers` is omitted, tickets will be auto-assigned during checkout
- Ticket numbers must be positive integers

**Response**: Same as Get Cart

**Example - With Ticket Numbers**:

```typescript
POST /api/v1/cart/items
{
  "competitionId": "6922428ef2104fdc938b27e2",
  "quantity": 3,
  "ticketNumbers": [5, 12, 23]
}
```

**Example - Without Ticket Numbers (Auto-Assign)**:

```typescript
POST /api/v1/cart/items
{
  "competitionId": "6922428ef2104fdc938b27e2",
  "quantity": 3
}
```

---

### 3. Update Cart Item

**PATCH** `/api/v1/cart/items/:itemId`

Updates quantity and/or ticket numbers for a specific cart item.

**Request Body**:

```typescript
{
  quantity: number;         // Required: New quantity (1-20)
  ticketNumbers?: number[]; // Optional: New ticket numbers array or null
}
```

**Notes**:

- If `ticketNumbers` is provided, array length **must** match `quantity`
- Set `ticketNumbers: null` to clear selected tickets (will auto-assign during checkout)
- Omit `ticketNumbers` to keep existing ticket numbers

**Response**: Same as Get Cart

**Example - Update Quantity and Ticket Numbers**:

```typescript
PATCH /api/v1/cart/items/item_id
{
  "quantity": 5,
  "ticketNumbers": [1, 2, 3, 4, 5]
}
```

**Example - Update Quantity Only (Keep Ticket Numbers)**:

```typescript
PATCH /api/v1/cart/items/item_id
{
  "quantity": 2
}
```

**Example - Clear Ticket Numbers**:

```typescript
PATCH /api/v1/cart/items/item_id
{
  "quantity": 3,
  "ticketNumbers": null
}
```

---

### 4. Remove Cart Item

**DELETE** `/api/v1/cart/items/:itemId`

Removes a specific item from the cart.

**Response**: Same as Get Cart (with item removed)

---

### 5. Clear Cart

**DELETE** `/api/v1/cart`

Removes all items from the cart.

**Response**:

```typescript
{
  "success": true,
  "message": "Cart cleared successfully",
  "data": null
}
```

---

## Ticket Number Selection

### When to Use Ticket Numbers

1. **User Selects Specific Tickets**: When user picks tickets from the ticket picker UI
2. **Auto-Assign During Checkout**: If not provided, backend will auto-assign available tickets

### Validation Rules

- `ticketNumbers` array length must equal `quantity`
- All ticket numbers must be positive integers (> 0)
- Ticket numbers are validated during checkout (availability check)

### Example Flow

```typescript
// 1. User views ticket list for competition
GET /api/v1/competitions/:id/tickets/list?range=1

// 2. User selects tickets: [5, 12, 23]
const selectedTickets = [5, 12, 23];

// 3. Add to cart with selected ticket numbers
POST /api/v1/cart/items
{
  "competitionId": "competition_id",
  "quantity": 3,
  "ticketNumbers": [5, 12, 23]
}

// 4. Cart now includes these ticket numbers
// During checkout, these specific tickets will be reserved
```

---

## Request/Response Examples

### Complete Flow Example

#### Step 1: Get Ticket List

```typescript
GET /api/v1/competitions/6922428ef2104fdc938b27e2/tickets/list?range=1

Response:
{
  "success": true,
  "data": {
    "tickets": [
      { "ticketNumber": 1, "status": "available" },
      { "ticketNumber": 2, "status": "bought" },
      { "ticketNumber": 3, "status": "available" },
      // ...
    ]
  }
}
```

#### Step 2: User Selects Tickets

```typescript
// User clicks on tickets 1, 3, 5, 7
const selectedTickets = [1, 3, 5, 7];
```

#### Step 3: Add to Cart

```typescript
POST /api/v1/cart/items
{
  "competitionId": "6922428ef2104fdc938b27e2",
  "quantity": 4,
  "ticketNumbers": [1, 3, 5, 7]
}

Response:
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "item_id",
        "competitionId": "6922428ef2104fdc938b27e2",
        "quantity": 4,
        "ticketNumbers": [1, 3, 5, 7],
        "unitPrice": 1.99,
        "subtotal": 7.96,
        "competition": { /* ... */ }
      }
    ],
    "totals": {
      "items": 1,
      "subtotal": 7.96,
      "totalTickets": 4
    }
  }
}
```

#### Step 4: Update Cart Item

```typescript
// User wants to change to tickets [10, 11, 12, 13, 14] (5 tickets)
PATCH /api/v1/cart/items/item_id
{
  "quantity": 5,
  "ticketNumbers": [10, 11, 12, 13, 14]
}
```

---

## Frontend Implementation

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

interface CartItem {
  id: string;
  competitionId: string;
  quantity: number;
  ticketNumbers: number[];
  unitPrice: number;
  subtotal: number;
  competition: {
    id: string;
    title: string;
    image: string | null;
    ticketPrice: string;
  };
}

interface Cart {
  id: string;
  currency: string;
  items: CartItem[];
  totals: {
    items: number;
    subtotal: number;
    totalTickets: number;
  };
}

export function useCart() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/cart`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setCart(data.data);
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (
    competitionId: string,
    quantity: number,
    ticketNumbers?: number[]
  ) => {
    try {
      const response = await fetch(`${API_URL}/cart/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          competitionId,
          quantity,
          ...(ticketNumbers && { ticketNumbers }),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setCart(data.data);
        return { success: true, data: data.data };
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const updateCartItem = async (
    itemId: string,
    quantity: number,
    ticketNumbers?: number[] | null
  ) => {
    try {
      const response = await fetch(`${API_URL}/cart/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          quantity,
          ...(ticketNumbers !== undefined && { ticketNumbers }),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setCart(data.data);
        return { success: true, data: data.data };
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const removeCartItem = async (itemId: string) => {
    try {
      const response = await fetch(`${API_URL}/cart/items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();
      if (data.success) {
        setCart(data.data);
        return { success: true };
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const clearCart = async () => {
    try {
      const response = await fetch(`${API_URL}/cart`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();
      if (data.success) {
        setCart(null);
        return { success: true };
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  return {
    cart,
    loading,
    error,
    fetchCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
  };
}
```

### Cart Component Example

```typescript
import React from 'react';
import { useCart } from './hooks/useCart';

const CartPage: React.FC = () => {
  const { cart, loading, updateCartItem, removeCartItem, clearCart } = useCart();

  if (loading) return <div>Loading cart...</div>;
  if (!cart || cart.items.length === 0) {
    return <div>Your cart is empty</div>;
  }

  const handleQuantityChange = async (
    itemId: string,
    newQuantity: number,
    currentTicketNumbers: number[]
  ) => {
    // If quantity changes, adjust ticket numbers
    let newTicketNumbers: number[] | undefined;

    if (newQuantity < currentTicketNumbers.length) {
      // Reduce: take first N ticket numbers
      newTicketNumbers = currentTicketNumbers.slice(0, newQuantity);
    } else if (newQuantity > currentTicketNumbers.length) {
      // Increase: keep existing, add nulls (will be auto-assigned)
      // Or prompt user to select more tickets
      newTicketNumbers = undefined; // Let backend auto-assign
    } else {
      // Same quantity: keep existing ticket numbers
      newTicketNumbers = currentTicketNumbers;
    }

    await updateCartItem(itemId, newQuantity, newTicketNumbers);
  };

  return (
    <div className="cart">
      <h1>Shopping Cart</h1>

      {cart.items.map((item) => (
        <div key={item.id} className="cart-item">
          <img src={item.competition.image || ''} alt={item.competition.title} />
          <div>
            <h3>{item.competition.title}</h3>
            <p>Price: £{item.unitPrice.toFixed(2)} per ticket</p>
            <p>Quantity: {item.quantity}</p>

            {item.ticketNumbers && item.ticketNumbers.length > 0 ? (
              <div>
                <p>Selected Tickets: {item.ticketNumbers.join(', ')}</p>
                <button onClick={() => {
                  // Open ticket picker to change ticket numbers
                  openTicketPicker(item.competitionId, item.quantity);
                }}>
                  Change Tickets
                </button>
              </div>
            ) : (
              <p>Tickets will be auto-assigned during checkout</p>
            )}

            <p>Subtotal: £{item.subtotal.toFixed(2)}</p>

            <div>
              <button
                onClick={() => handleQuantityChange(
                  item.id,
                  item.quantity - 1,
                  item.ticketNumbers
                )}
                disabled={item.quantity <= 1}
              >
                -
              </button>
              <span>{item.quantity}</span>
              <button
                onClick={() => handleQuantityChange(
                  item.id,
                  item.quantity + 1,
                  item.ticketNumbers
                )}
                disabled={item.quantity >= 20}
              >
                +
              </button>
            </div>

            <button onClick={() => removeCartItem(item.id)}>
              Remove
            </button>
          </div>
        </div>
      ))}

      <div className="cart-totals">
        <p>Total Items: {cart.totals.items}</p>
        <p>Total Tickets: {cart.totals.totalTickets}</p>
        <p>Subtotal: £{cart.totals.subtotal.toFixed(2)}</p>
      </div>

      <button onClick={clearCart}>Clear Cart</button>
      <button onClick={() => navigate('/checkout')}>Proceed to Checkout</button>
    </div>
  );
};
```

### Add to Cart with Ticket Selection

```typescript
import React, { useState } from 'react';
import { useCart } from './hooks/useCart';

const CompetitionPage: React.FC<{ competitionId: string }> = ({
  competitionId,
}) => {
  const { addToCart } = useCart();
  const [selectedTickets, setSelectedTickets] = useState<number[]>([]);
  const [quantity, setQuantity] = useState(1);

  const handleTicketSelect = (ticketNumber: number) => {
    setSelectedTickets((prev) => {
      if (prev.includes(ticketNumber)) {
        // Deselect
        return prev.filter((num) => num !== ticketNumber);
      } else {
        // Select (limit to quantity)
        if (prev.length < quantity) {
          return [...prev, ticketNumber];
        }
        return prev;
      }
    });
  };

  const handleAddToCart = async () => {
    // Option 1: With selected ticket numbers
    if (selectedTickets.length === quantity) {
      await addToCart(competitionId, quantity, selectedTickets);
    }
    // Option 2: Without ticket numbers (auto-assign)
    else {
      await addToCart(competitionId, quantity);
    }
  };

  return (
    <div>
      <h2>Select Tickets</h2>

      <div>
        <label>Quantity: </label>
        <input
          type="number"
          min="1"
          max="20"
          value={quantity}
          onChange={(e) => {
            const newQty = parseInt(e.target.value);
            setQuantity(newQty);
            // Adjust selected tickets if quantity changes
            setSelectedTickets((prev) => prev.slice(0, newQty));
          }}
        />
      </div>

      {/* Ticket Picker Component */}
      <TicketPicker
        competitionId={competitionId}
        selectedTickets={selectedTickets}
        maxSelection={quantity}
        onTicketSelect={handleTicketSelect}
      />

      <div>
        <p>
          Selected: {selectedTickets.length} of {quantity} tickets
        </p>
        {selectedTickets.length > 0 && (
          <p>Tickets: {selectedTickets.sort((a, b) => a - b).join(', ')}</p>
        )}
      </div>

      <button
        onClick={handleAddToCart}
        disabled={selectedTickets.length > 0 && selectedTickets.length !== quantity}
      >
        {selectedTickets.length === quantity
          ? `Add ${quantity} Selected Tickets to Cart`
          : selectedTickets.length > 0
          ? `Select ${quantity - selectedTickets.length} more ticket(s)`
          : `Add ${quantity} Ticket(s) to Cart (Auto-Assign)`}
      </button>
    </div>
  );
};
```

---

## Error Handling

### Common Errors

#### 1. Validation Error

```typescript
{
  "success": false,
  "message": "ticketNumbers array length (2) must match quantity (3)"
}
```

**Solution**: Ensure `ticketNumbers.length === quantity`

#### 2. Competition Not Available

```typescript
{
  "success": false,
  "message": "This competition has ended and is no longer accepting entries"
}
```

**Solution**: Check competition status before adding to cart

#### 3. Insufficient Tickets

```typescript
{
  "success": false,
  "message": "Only 5 tickets remaining for this competition"
}
```

**Solution**: Reduce quantity or select different competition

#### 4. Invalid Ticket Numbers

```typescript
{
  "success": false,
  "message": "All ticket numbers must be positive integers"
}
```

**Solution**: Validate ticket numbers before sending

### Error Handling Example

```typescript
const addToCartWithErrorHandling = async (
  competitionId: string,
  quantity: number,
  ticketNumbers?: number[]
) => {
  try {
    // Validate ticket numbers
    if (ticketNumbers && ticketNumbers.length !== quantity) {
      throw new Error(
        `Ticket numbers array (${ticketNumbers.length}) must match quantity (${quantity})`
      );
    }

    if (
      ticketNumbers &&
      !ticketNumbers.every((num) => num > 0 && Number.isInteger(num))
    ) {
      throw new Error('All ticket numbers must be positive integers');
    }

    const result = await addToCart(competitionId, quantity, ticketNumbers);

    if (!result.success) {
      // Handle API error
      showError(result.error);
      return;
    }

    showSuccess('Added to cart successfully');
  } catch (error: any) {
    showError(error.message);
  }
};
```

---

## Best Practices

### 1. Ticket Number Selection

- **Always validate** ticket numbers match quantity before API call
- **Show selected tickets** in cart UI for user confirmation
- **Allow changes** - let users modify ticket numbers before checkout
- **Handle conflicts** - if selected tickets become unavailable, prompt user to reselect

### 2. Cart Management

- **Sync cart state** - fetch cart after any modification
- **Show loading states** - indicate when cart operations are in progress
- **Handle errors gracefully** - show user-friendly error messages
- **Persist cart** - cart is automatically saved per user

### 3. User Experience

- **Display ticket numbers** in cart for transparency
- **Allow quantity changes** with automatic ticket number adjustment
- **Show totals** clearly (items, tickets, subtotal)
- **Provide clear CTAs** (Add to Cart, Update, Remove, Checkout)

### 4. Performance

- **Debounce updates** - don't update cart on every keystroke
- **Cache cart data** - fetch once, update locally, sync on changes
- **Optimistic updates** - update UI immediately, rollback on error

### 5. Edge Cases

- **Empty ticket numbers**: If user doesn't select tickets, backend auto-assigns during checkout
- **Quantity changes**: When quantity increases, prompt user to select more tickets or auto-assign
- **Quantity decreases**: Keep first N ticket numbers, remove the rest
- **Ticket conflicts**: If selected tickets become unavailable, clear ticket numbers and auto-assign

---

## Complete Example: Add to Cart Flow

```typescript
// 1. User views competition and ticket list
const ticketList = await fetchTicketList(competitionId, range: 1);

// 2. User selects tickets from picker
const selectedTickets = [5, 12, 23, 45];

// 3. User clicks "Add to Cart"
const result = await addToCart(competitionId, 4, selectedTickets);

if (result.success) {
  // 4. Show success message
  showNotification('Added to cart!');

  // 5. Update cart badge/count
  updateCartCount(result.data.totals.totalTickets);

  // 6. Optionally navigate to cart
  navigate('/cart');
} else {
  // Handle error
  showError(result.error);
}
```

---

## Testing Checklist

- [ ] Add item to cart without ticket numbers
- [ ] Add item to cart with ticket numbers
- [ ] Update cart item quantity
- [ ] Update cart item ticket numbers
- [ ] Remove item from cart
- [ ] Clear entire cart
- [ ] Validate ticket numbers match quantity
- [ ] Handle invalid ticket numbers
- [ ] Handle competition unavailable errors
- [ ] Display ticket numbers in cart UI
- [ ] Sync cart state after operations

---

**Last Updated**: 2025-01-24
**Version**: 1.0.0
