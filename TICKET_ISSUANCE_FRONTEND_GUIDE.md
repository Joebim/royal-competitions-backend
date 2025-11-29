# Ticket Issuance on Add to Cart - Frontend Implementation Guide

## Overview

Tickets are now **issued immediately when adding items to cart**, not during checkout or payment. This guide explains how to implement the two ticket selection modes: **Lucky Draw** (random selection) and **Number Picker** (specific ticket selection).

---

## Key Changes

### Before

- Tickets were created during checkout/payment
- Users selected tickets but they weren't reserved until checkout

### After

- ✅ **Tickets are issued when adding to cart** (status: `RESERVED`)
- ✅ **Lucky Draw**: Random ticket selection
- ✅ **Number Picker**: User selects specific ticket numbers
- ✅ **Cart response includes issued ticket numbers**
- ✅ **Limited tickets warning**: If lucky draw can't fulfill request, user is informed of available tickets

---

## API Endpoints

### Add Item to Cart

**Endpoint:** `POST /api/v1/cart/items`

**Authentication:** Required

**Request Body:**

#### Lucky Draw Mode (Random Selection)

```json
{
  "competitionId": "competition_id",
  "quantity": 3,
  "ticketType": "lucky_draw"
  // ticketNumbers not provided - will be randomly selected
}
```

#### Number Picker Mode (Specific Selection)

```json
{
  "competitionId": "competition_id",
  "quantity": 3,
  "ticketType": "number_picker",
  "ticketNumbers": [5, 12, 23] // Must match quantity
}
```

**Response:**

```json
{
  "success": true,
  "message": "Cart updated successfully",
  "data": {
    "id": "cart_id",
    "currency": "GBP",
    "items": [
      {
        "id": "item_id",
        "competitionId": "competition_id",
        "quantity": 3,
        "ticketNumbers": [5, 12, 23], // ← Issued ticket numbers
        "unitPrice": 1.99,
        "subtotal": 5.97,
        "competition": {
          "id": "competition_id",
          "title": "Competition Title",
          "ticketPrice": "1.99",
          "maxTickets": 1000,
          "soldTickets": 150,
          "status": "live"
        }
      }
    ],
    "totals": {
      "items": 1,
      "subtotal": 5.97,
      "totalTickets": 3
    }
  }
}
```

**Error Responses:**

#### Limited Tickets Available (Lucky Draw)

```json
{
  "success": false,
  "message": "Only 2 ticket(s) remaining for this competition. Available ticket numbers: 45, 67, 89, 102, 134, 156, 178, 201, 223, 245, 267, 289, 312, 334, 356, 378, 401, 423, 445, 467.... Please use the number picker to select specific tickets.",
  "statusCode": 400
}
```

#### Ticket Numbers Already Taken (Number Picker)

```json
{
  "success": false,
  "message": "Ticket number(s) 5, 12 are already taken. Please select different tickets.",
  "statusCode": 400
}
```

---

## Frontend Implementation

### Step 1: Ticket Selection Component

```typescript
// components/TicketSelector.tsx
import { useState, useEffect } from 'react';

interface TicketSelectorProps {
  competitionId: string;
  ticketLimit?: number;
  ticketsSold: number;
  onAddToCart: (data: {
    competitionId: string;
    quantity: number;
    ticketType: 'lucky_draw' | 'number_picker';
    ticketNumbers?: number[];
  }) => Promise<void>;
}

export const TicketSelector = ({
  competitionId,
  ticketLimit,
  ticketsSold,
  onAddToCart,
}: TicketSelectorProps) => {
  const [mode, setMode] = useState<'lucky_draw' | 'number_picker'>('lucky_draw');
  const [quantity, setQuantity] = useState(1);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const availableTickets = ticketLimit
    ? ticketLimit - ticketsSold
    : Infinity;

  // For number picker: Load available ticket numbers
  const [availableNumbers, setAvailableNumbers] = useState<number[]>([]);

  useEffect(() => {
    if (mode === 'number_picker' && ticketLimit) {
      // Fetch available ticket numbers from API
      // This would be a separate endpoint or included in competition details
      loadAvailableNumbers();
    }
  }, [mode, ticketLimit]);

  const loadAvailableNumbers = async () => {
    // Call API to get available ticket numbers
    // Example: GET /api/v1/competitions/:id/tickets/available
    // For now, we'll generate a list (you should fetch from API)
    const numbers: number[] = [];
    for (let i = 1; i <= (ticketLimit || 1000); i++) {
      if (numbers.length >= 100) break; // Limit to first 100 for display
      numbers.push(i);
    }
    setAvailableNumbers(numbers);
  };

  const handleAddToCart = async () => {
    setError('');
    setLoading(true);

    try {
      if (mode === 'number_picker') {
        if (selectedNumbers.length !== quantity) {
          setError(`Please select exactly ${quantity} ticket(s)`);
          setLoading(false);
          return;
        }
        await onAddToCart({
          competitionId,
          quantity,
          ticketType: 'number_picker',
          ticketNumbers: selectedNumbers,
        });
      } else {
        // Lucky draw
        await onAddToCart({
          competitionId,
          quantity,
          ticketType: 'lucky_draw',
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add to cart');
    } finally {
      setLoading(false);
    }
  };

  const toggleNumber = (number: number) => {
    if (selectedNumbers.includes(number)) {
      setSelectedNumbers(selectedNumbers.filter((n) => n !== number));
    } else {
      if (selectedNumbers.length < quantity) {
        setSelectedNumbers([...selectedNumbers, number]);
      }
    }
  };

  return (
    <div className="ticket-selector">
      <div className="mode-selector">
        <button
          className={mode === 'lucky_draw' ? 'active' : ''}
          onClick={() => {
            setMode('lucky_draw');
            setSelectedNumbers([]);
          }}
        >
          Lucky Draw
        </button>
        <button
          className={mode === 'number_picker' ? 'active' : ''}
          onClick={() => {
            setMode('number_picker');
            setSelectedNumbers([]);
          }}
        >
          Number Picker
        </button>
      </div>

      <div className="quantity-selector">
        <label>Quantity:</label>
        <input
          type="number"
          min="1"
          max={Math.min(20, availableTickets === Infinity ? 20 : availableTickets)}
          value={quantity}
          onChange={(e) => {
            const newQty = parseInt(e.target.value) || 1;
            setQuantity(newQty);
            if (mode === 'number_picker') {
              // Adjust selected numbers if quantity changed
              setSelectedNumbers(selectedNumbers.slice(0, newQty));
            }
          }}
        />
        {availableTickets !== Infinity && (
          <span className="available-info">
            {availableTickets} tickets available
          </span>
        )}
      </div>

      {mode === 'number_picker' && (
        <div className="number-picker">
          <p>Select {quantity} ticket number(s):</p>
          <div className="number-grid">
            {availableNumbers.map((number) => (
              <button
                key={number}
                className={`number-btn ${
                  selectedNumbers.includes(number) ? 'selected' : ''
                }`}
                onClick={() => toggleNumber(number)}
                disabled={!selectedNumbers.includes(number) && selectedNumbers.length >= quantity}
              >
                {number}
              </button>
            ))}
          </div>
          {selectedNumbers.length > 0 && (
            <div className="selected-numbers">
              Selected: {selectedNumbers.sort((a, b) => a - b).join(', ')}
            </div>
          )}
        </div>
      )}

      {mode === 'lucky_draw' && (
        <div className="lucky-draw-info">
          <p>Random tickets will be selected for you</p>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      <button
        onClick={handleAddToCart}
        disabled={loading || (mode === 'number_picker' && selectedNumbers.length !== quantity)}
      >
        {loading ? 'Adding...' : 'Add to Cart'}
      </button>
    </div>
  );
};
```

---

### Step 2: Cart Hook with Ticket Numbers

```typescript
// hooks/useCart.ts
import { useState, useEffect } from 'react';
import api from '../utils/api';

interface CartItem {
  id: string;
  competitionId: string;
  quantity: number;
  ticketNumbers: number[]; // ← Issued ticket numbers
  unitPrice: number;
  subtotal: number;
  competition: {
    id: string;
    title: string;
    ticketPrice: string;
  };
}

interface Cart {
  id: string;
  items: CartItem[];
  totals: {
    items: number;
    subtotal: number;
    totalTickets: number;
  };
}

export const useCart = () => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);

  const loadCart = async () => {
    setLoading(true);
    try {
      const response = await api.get('/cart');
      setCart(response.data.data);
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (data: {
    competitionId: string;
    quantity: number;
    ticketType: 'lucky_draw' | 'number_picker';
    ticketNumbers?: number[];
  }) => {
    setLoading(true);
    try {
      const response = await api.post('/cart/items', data);
      setCart(response.data.data);
      return response.data.data;
    } catch (error: any) {
      // Handle limited tickets error for lucky draw
      if (error.response?.status === 400 && data.ticketType === 'lucky_draw') {
        const message = error.response.data.message;
        // Extract available ticket numbers from error message
        const availableNumbersMatch = message.match(
          /Available ticket numbers: ([\d,\s]+)/
        );
        if (availableNumbersMatch) {
          const numbers = availableNumbersMatch[1]
            .split(',')
            .map((n) => parseInt(n.trim()))
            .filter((n) => !isNaN(n));
          throw new Error(
            `Only limited tickets available. Please use number picker to select from: ${numbers.slice(0, 20).join(', ')}${numbers.length > 20 ? '...' : ''}`
          );
        }
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  return {
    cart,
    loading,
    addToCart,
    loadCart,
  };
};
```

---

### Step 3: Cart Display Component

```typescript
// components/Cart.tsx
import { useCart } from '../hooks/useCart';

export const Cart = () => {
  const { cart, loading } = useCart();

  if (loading) return <div>Loading cart...</div>;
  if (!cart || cart.items.length === 0) {
    return <div>Your cart is empty</div>;
  }

  return (
    <div className="cart">
      <h2>Your Cart</h2>
      {cart.items.map((item) => (
        <div key={item.id} className="cart-item">
          <h3>{item.competition.title}</h3>
          <p>Quantity: {item.quantity}</p>
          <p>Ticket Numbers: {item.ticketNumbers.join(', ')}</p>
          <p>Price: £{item.subtotal.toFixed(2)}</p>
        </div>
      ))}
      <div className="cart-totals">
        <p>Total: £{cart.totals.subtotal.toFixed(2)}</p>
        <p>Total Tickets: {cart.totals.totalTickets}</p>
      </div>
    </div>
  );
};
```

---

## Error Handling

### Limited Tickets in Lucky Draw

When using lucky draw mode and there are limited tickets available, the API returns an error with available ticket numbers:

```typescript
try {
  await addToCart({
    competitionId: 'comp_123',
    quantity: 5,
    ticketType: 'lucky_draw',
  });
} catch (error: any) {
  if (error.response?.status === 400) {
    const message = error.response.data.message;

    // Check if it's a limited tickets error
    if (message.includes('Only') && message.includes('ticket(s) remaining')) {
      // Extract available numbers
      const match = message.match(/Available ticket numbers: ([\d,\s]+)/);
      if (match) {
        const availableNumbers = match[1]
          .split(',')
          .map((n) => parseInt(n.trim()))
          .filter((n) => !isNaN(n));

        // Show user-friendly message
        alert(
          `Only ${availableNumbers.length} tickets available. Please switch to number picker and select from: ${availableNumbers.slice(0, 20).join(', ')}${availableNumbers.length > 20 ? '...' : ''}`
        );

        // Optionally switch to number picker mode
        setMode('number_picker');
        setAvailableNumbers(availableNumbers);
      }
    }
  }
}
```

---

## User Flow

### Lucky Draw Flow

```
1. User selects "Lucky Draw" mode
2. User selects quantity (e.g., 3 tickets)
3. User clicks "Add to Cart"
4. Backend randomly selects 3 available tickets
5. Tickets are created with status RESERVED
6. Cart response includes ticket numbers: [12, 45, 89]
7. User sees selected tickets in cart
```

### Number Picker Flow

```
1. User selects "Number Picker" mode
2. User selects quantity (e.g., 3 tickets)
3. User clicks on specific ticket numbers: 5, 12, 23
4. User clicks "Add to Cart"
5. Backend validates ticket numbers are available
6. Tickets are created with status RESERVED
7. Cart response includes ticket numbers: [5, 12, 23]
8. User sees selected tickets in cart
```

### Limited Tickets Flow (Lucky Draw)

```
1. User selects "Lucky Draw" mode
2. User selects quantity (e.g., 5 tickets)
3. Only 2 tickets available
4. Backend returns error with available ticket numbers
5. Frontend shows message: "Only 2 tickets available. Available numbers: 45, 67. Please use number picker."
6. User switches to number picker
7. User selects from available numbers
8. Tickets are added to cart
```

---

## Best Practices

### 1. **Display Ticket Numbers in Cart**

- ✅ Always show issued ticket numbers in cart
- ✅ Sort ticket numbers for better readability
- ✅ Highlight ticket numbers prominently

### 2. **Error Handling**

- ✅ Handle limited tickets gracefully
- ✅ Show available ticket numbers when lucky draw fails
- ✅ Provide clear instructions to switch to number picker

### 3. **User Experience**

- ✅ Show loading state during ticket issuance
- ✅ Display ticket numbers immediately after adding to cart
- ✅ Allow users to see which tickets they've selected

### 4. **Validation**

- ✅ Validate ticket numbers before sending to API
- ✅ Check quantity limits before adding to cart
- ✅ Handle concurrent ticket selection gracefully

---

## API Response Structure

### Cart Response with Tickets

```json
{
  "success": true,
  "data": {
    "id": "cart_id",
    "items": [
      {
        "id": "item_id",
        "competitionId": "comp_123",
        "quantity": 3,
        "ticketNumbers": [5, 12, 23], // ← Issued ticket numbers
        "unitPrice": 1.99,
        "subtotal": 5.97,
        "competition": {
          "id": "comp_123",
          "title": "Win an iPhone 15",
          "ticketPrice": "1.99"
        }
      }
    ],
    "totals": {
      "items": 1,
      "subtotal": 5.97,
      "totalTickets": 3
    }
  }
}
```

---

## Testing

### Test Case 1: Lucky Draw Success

```javascript
// Request
POST /api/v1/cart/items
{
  "competitionId": "comp_123",
  "quantity": 3,
  "ticketType": "lucky_draw"
}

// Expected: Random 3 tickets issued, returned in response
```

### Test Case 2: Number Picker Success

```javascript
// Request
POST /api/v1/cart/items
{
  "competitionId": "comp_123",
  "quantity": 3,
  "ticketType": "number_picker",
  "ticketNumbers": [5, 12, 23]
}

// Expected: Specific tickets issued, returned in response
```

### Test Case 3: Limited Tickets (Lucky Draw)

```javascript
// Request (only 2 tickets available)
POST /api/v1/cart/items
{
  "competitionId": "comp_123",
  "quantity": 5,
  "ticketType": "lucky_draw"
}

// Expected: Error with available ticket numbers
```

### Test Case 4: Ticket Already Taken (Number Picker)

```javascript
// Request (ticket 5 already taken)
POST /api/v1/cart/items
{
  "competitionId": "comp_123",
  "quantity": 2,
  "ticketType": "number_picker",
  "ticketNumbers": [5, 12]
}

// Expected: Error "Ticket number(s) 5 are already taken"
```

---

## Summary

✅ **Tickets issued on add to cart** (not during checkout/payment)
✅ **Lucky Draw mode**: Random ticket selection
✅ **Number Picker mode**: User selects specific tickets
✅ **Cart includes issued ticket numbers**
✅ **Limited tickets warning**: User informed of available tickets
✅ **Error handling**: Graceful handling of conflicts and limitations

**Key Takeaway**: Tickets are now reserved immediately when adding to cart, giving users immediate confirmation of their selected tickets.

---

**Last Updated:** 2025-01-24
