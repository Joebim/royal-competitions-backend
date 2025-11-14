# Ticket Reservation and Cart Flow API Documentation

This document describes the complete flow for reserving tickets and managing cart items before checkout.

## Flow Overview

1. **Reserve Tickets** → User reserves tickets for a competition (tickets are held for 15 minutes)
2. **Add to Cart** → User adds reserved tickets to their cart
3. **Manage Cart** → User can view, update, or remove items from cart
4. **Checkout** → User proceeds to checkout from cart

---

## 1. Ticket Reservation Endpoints

### Reserve Tickets for Competition

Reserve tickets for a competition. Tickets are held for 15 minutes before expiring.

**Endpoint:** `POST /api/v1/competitions/:id/hold`

**Authentication:** Required (Bearer token)

**Parameters:**

- `id` (path) - Competition ID

**Request Body:**

```json
{
  "qty": 5
}
```

**Response:**

```json
{
  "success": true,
  "message": "Tickets reserved successfully",
  "data": {
    "reservationId": "res_1234567890_abc123",
    "reservedTickets": [1001, 1002, 1003, 1004, 1005],
    "reservedUntil": "2024-01-15T10:30:00.000Z",
    "costPence": 2500,
    "costGBP": "25.00",
    "competition": {
      "id": "competition_id",
      "title": "Competition Title",
      "ticketPricePence": 500,
      "remainingTickets": 995
    }
  }
}
```

**Error Responses:**

- `400` - Competition not accepting entries, invalid quantity, or insufficient tickets
- `404` - Competition not found
- `409` - Tickets already reserved (conflict)

**Notes:**

- Tickets are reserved for 15 minutes
- Reserved tickets are automatically released if not purchased within the time limit
- Maximum quantity depends on available tickets

---

## 2. Cart Management Endpoints

### Get Cart

Get the current user's shopping cart with all items and totals.

**Endpoint:** `GET /api/v1/cart`

**Authentication:** Required (Bearer token)

**Response:**

```json
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
        "quantity": 5,
        "unitPrice": 5.0,
        "subtotal": 25.0,
        "addedAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2024-01-15T10:05:00.000Z",
        "competition": {
          "id": "competition_id",
          "title": "Competition Title",
          "slug": "competition-slug",
          "image": "https://image-url.com/image.jpg",
          "ticketPrice": "5.00",
          "maxTickets": 1000,
          "soldTickets": 250,
          "status": "live",
          "isActive": true,
          "drawDate": "2024-12-31T00:00:00.000Z",
          "category": "Luxury Cars"
        }
      }
    ],
    "totals": {
      "subtotal": 25.0,
      "total": 25.0,
      "itemCount": 1
    },
    "updatedAt": "2024-01-15T10:05:00.000Z"
  }
}
```

---

### Add Item to Cart

Add a competition to the cart or update quantity if already in cart.

**Endpoint:** `POST /api/v1/cart/items`

**Authentication:** Required (Bearer token)

**Request Body:**

```json
{
  "competitionId": "competition_id",
  "quantity": 5
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
    "items": [...],
    "totals": {
      "subtotal": 25.00,
      "total": 25.00,
      "itemCount": 1
    }
  }
}
```

**Error Responses:**

- `400` - Competition not available, insufficient tickets
- `404` - Competition not found
- `422` - Invalid competitionId or quantity (must be 1-20)

**Validation Rules:**

- `quantity` must be between 1 and 20 (MAX_TICKETS_PER_ITEM)
- Competition must be active and live
- Quantity cannot exceed available tickets

**Notes:**

- If competition already exists in cart, it updates the quantity
- Automatically calculates subtotal based on current ticket price
- Checks ticket availability before adding

---

### Update Cart Item

Update the quantity of a specific item in the cart.

**Endpoint:** `PATCH /api/v1/cart/items/:itemId`

**Authentication:** Required (Bearer token)

**Parameters:**

- `itemId` (path) - Cart item ID

**Request Body:**

```json
{
  "quantity": 10
}
```

**Response:**

```json
{
  "success": true,
  "message": "Cart item updated successfully",
  "data": {
    "id": "cart_id",
    "currency": "GBP",
    "items": [...],
    "totals": {
      "subtotal": 50.00,
      "total": 50.00,
      "itemCount": 1
    }
  }
}
```

**Error Responses:**

- `400` - Competition not available, insufficient tickets
- `404` - Cart or cart item not found
- `422` - Invalid quantity (must be 1-20)

**Validation Rules:**

- `quantity` must be between 1 and 20
- Competition must still be available
- Quantity cannot exceed available tickets

---

### Remove Cart Item

Remove a specific item from the cart.

**Endpoint:** `DELETE /api/v1/cart/items/:itemId`

**Authentication:** Required (Bearer token)

**Parameters:**

- `itemId` (path) - Cart item ID

**Response:**

```json
{
  "success": true,
  "message": "Cart item removed successfully",
  "data": {
    "id": "cart_id",
    "currency": "GBP",
    "items": [],
    "totals": {
      "subtotal": 0.0,
      "total": 0.0,
      "itemCount": 0
    }
  }
}
```

**Error Responses:**

- `404` - Cart or cart item not found

---

### Clear Cart

Remove all items from the cart.

**Endpoint:** `DELETE /api/v1/cart`

**Authentication:** Required (Bearer token)

**Response:**

```json
{
  "success": true,
  "message": "Cart cleared successfully",
  "data": null
}
```

---

## 3. Checkout Endpoints

### Create Payment Intent from Cart

Create payment intent(s) for all items in the cart. This initiates the checkout process.

**Endpoint:** `POST /api/v1/checkout/payment-intent`

**Authentication:** Required (Bearer token)

**Request Body:**

```json
{
  "billingDetails": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+44123456789"
  },
  "shippingAddress": {
    "line1": "123 Main Street",
    "line2": "Apt 4B",
    "city": "London",
    "postalCode": "SW1A 1AA",
    "country": "GB"
  },
  "marketingOptIn": false
}
```

**Response:**

```json
{
  "success": true,
  "message": "Payment intent created",
  "data": {
    "order": {
      "id": "order_id",
      "competitionId": "competition_id",
      "amountPence": 2500,
      "amountGBP": "25.00",
      "quantity": 5,
      "ticketsReserved": [1001, 1002, 1003, 1004, 1005]
    },
    "payment": {
      "clientSecret": "pi_xxx_secret_xxx",
      "amount": 2500,
      "currency": "GBP"
    }
  }
}
```

**Error Responses:**

- `400` - Cart is empty, competition not available, tickets not reserved
- `404` - Order not found

**Notes:**

- Creates an order for each competition in the cart
- Requires tickets to be reserved before checkout
- Returns Stripe payment intent client secret for frontend payment processing

---

### Confirm Checkout Order

Verify the status of an order after payment processing.

**Endpoint:** `POST /api/v1/checkout/confirm`

**Authentication:** Required (Bearer token)

**Request Body:**

```json
{
  "orderId": "order_id"
}
```

**OR**

```json
{
  "paymentIntentId": "pi_xxx"
}
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
      "amountPence": 2500,
      "amountGBP": "25.00",
      "quantity": 5,
      "status": "completed",
      "paymentStatus": "paid",
      "ticketsReserved": [1001, 1002, 1003, 1004, 1005],
      "tickets": [
        {
          "id": "ticket_id",
          "ticketNumber": 1001,
          "status": "active"
        }
      ],
      "paymentIntent": {
        "id": "pi_xxx",
        "status": "succeeded",
        "amount": 2500,
        "currency": "gbp"
      },
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:05:00.000Z"
    }
  }
}
```

**Error Responses:**

- `400` - Order ID or Payment Intent ID required
- `403` - Not authorized to view this order
- `404` - Order not found

---

## 4. Order Management Endpoints

### Get My Orders

Get all orders for the current user with pagination.

**Endpoint:** `GET /api/v1/orders` or `GET /api/v1/orders/my-orders`

**Authentication:** Required (Bearer token)

**Query Parameters:**

- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 10)
- `status` (optional) - Filter by order status: "pending", "completed", "cancelled"
- `paymentStatus` (optional) - Filter by payment status: "pending", "paid", "failed", "refunded"

**Response:**

```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": {
    "orders": [
      {
        "id": "order_id",
        "competitionId": "competition_id",
        "userId": "user_id",
        "amountPence": 2500,
        "amountGBP": "25.00",
        "currency": "GBP",
        "quantity": 5,
        "status": "completed",
        "paymentStatus": "paid",
        "stripePaymentIntent": "pi_xxx",
        "paymentReference": "ORD-123456",
        "billingDetails": {...},
        "shippingAddress": {...},
        "marketingOptIn": false,
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2024-01-15T10:05:00.000Z"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalItems": 25,
      "totalPages": 3
    }
  }
}
```

---

### Get Order by ID

Get detailed information about a specific order.

**Endpoint:** `GET /api/v1/orders/:id`

**Authentication:** Required (Bearer token)

**Parameters:**

- `id` (path) - Order ID

**Response:**

```json
{
  "success": true,
  "message": "Order retrieved successfully",
  "data": {
    "order": {
      "id": "order_id",
      "competitionId": "competition_id",
      "userId": "user_id",
      "amountPence": 2500,
      "amountGBP": "25.00",
      "currency": "GBP",
      "quantity": 5,
      "status": "completed",
      "paymentStatus": "paid",
      "stripePaymentIntent": "pi_xxx",
      "paymentReference": "ORD-123456",
      "billingDetails": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "phone": "+44123456789"
      },
      "shippingAddress": {
        "line1": "123 Main Street",
        "line2": "Apt 4B",
        "city": "London",
        "postalCode": "SW1A 1AA",
        "country": "GB"
      },
      "marketingOptIn": false,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:05:00.000Z"
    }
  }
}
```

**Error Responses:**

- `403` - Not authorized to view this order
- `404` - Order not found

---

## Complete Flow Example

### Step 1: Reserve Tickets

```http
POST /api/v1/competitions/competition_id/hold
Authorization: Bearer <token>
Content-Type: application/json

{
  "qty": 5
}
```

### Step 2: Add to Cart

```http
POST /api/v1/cart/items
Authorization: Bearer <token>
Content-Type: application/json

{
  "competitionId": "competition_id",
  "quantity": 5
}
```

### Step 3: View Cart (Optional)

```http
GET /api/v1/cart
Authorization: Bearer <token>
```

### Step 4: Update Cart Item (Optional)

```http
PATCH /api/v1/cart/items/item_id
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantity": 10
}
```

### Step 5: Create Payment Intent

```http
POST /api/v1/checkout/payment-intent
Authorization: Bearer <token>
Content-Type: application/json

{
  "billingDetails": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+44123456789"
  },
  "shippingAddress": {
    "line1": "123 Main Street",
    "city": "London",
    "postalCode": "SW1A 1AA",
    "country": "GB"
  },
  "marketingOptIn": false
}
```

### Step 6: Process Payment (Frontend)

Use the `clientSecret` from Step 5 with Stripe.js to process payment on the frontend.

### Step 7: Confirm Order

```http
POST /api/v1/checkout/confirm
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "order_id"
}
```

---

## Important Notes

### Ticket Reservation

- Tickets are reserved for **15 minutes** from the time of reservation
- Reserved tickets are automatically released if not purchased within the time limit
- Reservation prevents other users from purchasing the same tickets during the hold period
- Multiple reservations can be made, but each expires independently

### Cart Management

- Cart items are stored per user
- Cart persists across sessions
- Maximum 20 tickets per competition item
- Cart automatically validates competition availability on each operation
- Prices are locked when added to cart (based on current ticket price)

### Checkout Process

- Tickets must be reserved before adding to cart
- Payment is processed through Stripe
- Orders are created for each competition in the cart
- Payment webhook handles order completion automatically
- Tickets are activated only after successful payment

### Error Handling

- All endpoints return consistent error format:
  ```json
  {
    "success": false,
    "message": "Error message",
    "errors": {
      "field": ["Error details"]
    }
  }
  ```

### Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors, business logic errors)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (not authorized for resource)
- `404` - Not Found
- `409` - Conflict (e.g., tickets already reserved)
- `422` - Unprocessable Entity (validation errors)

---

## Data Models

### Cart Item

```typescript
{
  id: string;
  competitionId: string;
  quantity: number;
  unitPrice: number; // in GBP
  subtotal: number; // in GBP
  addedAt: Date;
  updatedAt: Date;
}
```

### Order

```typescript
{
  id: string;
  competitionId: string;
  userId: string;
  amountPence: number;
  amountGBP: string;
  currency: "GBP";
  quantity: number;
  status: "pending" | "completed" | "cancelled";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  stripePaymentIntent: string;
  ticketsReserved: number[];
  billingDetails: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    postalCode: string;
    country: string;
  };
  marketingOptIn: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Ticket Reservation

```typescript
{
  reservationId: string;
  reservedTickets: number[];
  reservedUntil: Date;
  costPence: number;
  costGBP: string;
  competition: {
    id: string;
    title: string;
    ticketPricePence: number;
    remainingTickets: number | null;
  };
}
```

---

## Frontend Integration Tips

1. **Reservation Timing**: Show countdown timer for ticket reservations (15 minutes)
2. **Cart Persistence**: Cart persists, so users can return later
3. **Real-time Updates**: Poll cart endpoint or use WebSockets to show real-time availability
4. **Error Recovery**: Handle expired reservations gracefully by re-reserving
5. **Payment Flow**: Use Stripe.js Elements for secure payment processing
6. **Order Confirmation**: Always confirm order status after payment to ensure completion
