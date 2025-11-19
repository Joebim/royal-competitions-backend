# Frontend Ticket Lifecycle: Complete User Journey & API Endpoints

## Overview

This document explains the complete ticket purchase flow from the **frontend perspective**, including all API endpoints, request/response formats, and user actions.

---

## Complete User Journey

```
┌─────────────────────────────────────────────────────────────┐
│              FRONTEND TICKET PURCHASE FLOW                    │
└─────────────────────────────────────────────────────────────┘

1. BROWSE COMPETITIONS
   ↓
2. ADD TO CART (Hold Tickets)
   ↓
3. VIEW CART
   ↓
4. CHECKOUT (Create Order)
   ↓
5. PAY WITH PAYPAL
   ↓
6. CONFIRM PAYMENT
   ↓
7. VIEW TICKETS
```

---

## Step 1: Browse Competitions

### User Action
User views available competitions on the homepage or competition listing page.

### API Endpoint

**GET** `/api/v1/competitions`

**Request:**
```http
GET /api/v1/competitions?page=1&limit=10&status=live&category=electronics
Authorization: Bearer <token> (optional)
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status (live, closed, ended, etc.)
- `category` (optional): Filter by category slug
- `featured` (optional): Show only featured competitions
- `search` (optional): Search by title

**Response:**
```json
{
  "success": true,
  "data": {
    "competitions": [
      {
        "id": "6919aa951f3d63a8102600ea",
        "title": "Bentley Continental GT Speed",
        "slug": "bentley-continental-gt-speed",
        "ticketPrice": "365.00",
        "cashAlternative": "150000.00",
        "maxTickets": 1000,
        "soldTickets": 245,
        "progress": 24.5,
        "status": "live",
        "images": [...],
        "drawAt": "2025-12-25T12:00:00Z"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 50,
    "totalPages": 5
  }
}
```

### Frontend Implementation
```typescript
// Fetch competitions
const response = await fetch('/api/v1/competitions?status=live&page=1&limit=10');
const data = await response.json();
// Display competitions in UI
```

---

## Step 2: Add to Cart (Hold Tickets)

### User Action
User clicks "Add to Cart" or "Buy Tickets" button for a competition.

### What Happens Behind the Scenes
1. **Tickets are RESERVED** (created in database with status `RESERVED`)
2. **Cart item is added** to user's cart
3. Tickets expire after 15 minutes if not purchased

### API Endpoints

#### Option A: Add to Cart (Recommended)
**POST** `/api/v1/cart/items`

**Request:**
```http
POST /api/v1/cart/items
Authorization: Bearer <token>
Content-Type: application/json

{
  "competitionId": "6919aa951f3d63a8102600ea",
  "quantity": 3
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cart": {
      "id": "691d4633526cd4c76ba09d94",
      "userId": "691d4633526cd4c76ba09d93",
      "items": [
        {
          "id": "691d4633526cd4c76ba09d95",
          "competitionId": "6919aa951f3d63a8102600ea",
          "competitionTitle": "Bentley Continental GT Speed",
          "quantity": 3,
          "ticketPrice": 36500,
          "subtotal": 109500
        }
      ],
      "total": 109500,
      "totalGBP": "1095.00",
      "updatedAt": "2025-11-19T04:00:00Z"
    }
  },
  "message": "Item added to cart"
}
```

**What Happens:**
- System automatically reserves tickets (calls hold tickets internally)
- Cart item is created/updated
- Tickets are created with status `RESERVED` in database ✅

#### Option B: Hold Tickets Directly (Alternative)
**POST** `/api/v1/tickets/competitions/:id/hold`

**Request:**
```http
POST /api/v1/tickets/competitions/6919aa951f3d63a8102600ea/hold
Authorization: Bearer <token>
Content-Type: application/json

{
  "qty": 3
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ticketsReserved": [14, 15, 16],
    "cost": 109500,
    "costGBP": "1095.00",
    "reservedUntil": "2025-11-19T04:15:00Z"
  },
  "message": "Tickets reserved successfully"
}
```

**Then add to cart separately:**
```http
POST /api/v1/cart/items
{
  "competitionId": "6919aa951f3d63a8102600ea",
  "quantity": 3
}
```

### Frontend Implementation
```typescript
// Add to cart
const addToCart = async (competitionId: string, quantity: number) => {
  const response = await fetch('/api/v1/cart/items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      competitionId,
      quantity
    })
  });
  
  const data = await response.json();
  // Update cart UI
  // Show success message
};
```

### Database State After This Step
```javascript
// Tickets created in MongoDB
{
  _id: ObjectId("..."),
  competitionId: ObjectId("6919aa951f3d63a8102600ea"),
  ticketNumber: 14,
  userId: ObjectId("691d4633526cd4c76ba09d93"),
  status: "reserved",  // ← RESERVED status
  reservedUntil: ISODate("2025-11-19T04:15:00Z"),  // Expires in 15 min
  createdAt: ISODate("2025-11-19T04:00:00Z")
}
```

---

## Step 3: View Cart

### User Action
User navigates to cart page to review items before checkout.

### API Endpoint

**GET** `/api/v1/cart`

**Request:**
```http
GET /api/v1/cart
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cart": {
      "id": "691d4633526cd4c76ba09d94",
      "userId": "691d4633526cd4c76ba09d93",
      "items": [
        {
          "id": "691d4633526cd4c76ba09d95",
          "competitionId": "6919aa951f3d63a8102600ea",
          "competitionTitle": "Bentley Continental GT Speed",
          "quantity": 3,
          "ticketPrice": 36500,
          "subtotal": 109500
        }
      ],
      "total": 109500,
      "totalGBP": "1095.00",
      "updatedAt": "2025-11-19T04:00:00Z"
    }
  }
}
```

### Frontend Implementation
```typescript
// Fetch cart
const getCart = async () => {
  const response = await fetch('/api/v1/cart', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  // Display cart items
  // Show total
};
```

---

## Step 4: Checkout (Create Order)

### User Action
User clicks "Checkout" or "Proceed to Payment" button.

### What Happens Behind the Scenes
1. **Orders are created** for each competition in cart
2. **Tickets are validated** (or re-reserved if expired)
3. **PayPal order is created** for each order
4. **Cart is cleared** (optional, depends on implementation)

### API Endpoint

**POST** `/api/v1/checkout/payment-intent`

**Request:**
```http
POST /api/v1/checkout/payment-intent
Authorization: Bearer <token>
Content-Type: application/json

{
  "billingDetails": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890"
  },
  "shippingAddress": {
    "line1": "123 Main Street",
    "line2": "Apt 4B",
    "city": "London",
    "postalCode": "SW1A 1AA",
    "country": "GB"
  },
  "marketingOptIn": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "691d4633526cd4c76ba09d96",
        "competitionId": "6919aa951f3d63a8102600ea",
        "competitionTitle": "Bentley Continental GT Speed",
        "quantity": 3,
        "amountPence": 109500,
        "amountGBP": "1095.00",
        "paypalOrderId": "6PF86185NE999741P",
        "orderID": "6PF86185NE999741P"
      }
    ],
    "message": "Orders created with tickets reserved. Please complete payment for each order."
  }
}
```

**What Happens:**
- Orders are created with status `PENDING`
- Tickets remain `RESERVED` (or are re-reserved if expired)
- PayPal orders are created
- Returns `paypalOrderId` for each order

### Database State After This Step
```javascript
// Order created
{
  _id: ObjectId("691d4633526cd4c76ba09d96"),
  userId: ObjectId("691d4633526cd4c76ba09d93"),
  competitionId: ObjectId("6919aa951f3d63a8102600ea"),
  status: "pending",
  paymentStatus: "pending",
  ticketsReserved: [14, 15, 16],
  paypalOrderId: "6PF86185NE999741P",
  amountPence: 109500,
  billingDetails: {...},
  shippingAddress: {...}
}

// Tickets still RESERVED
{
  status: "reserved",  // ← Still RESERVED
  reservedUntil: ISODate("2025-11-19T04:15:00Z")
}
```

### Frontend Implementation
```typescript
// Create checkout
const checkout = async (billingDetails, shippingAddress) => {
  const response = await fetch('/api/v1/checkout/payment-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      billingDetails,
      shippingAddress,
      marketingOptIn: true
    })
  });
  
  const data = await response.json();
  // Store order IDs and PayPal order IDs
  // Initialize PayPal Buttons with orderID
};
```

---

## Step 5: Pay with PayPal

### User Action
User clicks PayPal button and completes payment in PayPal popup/modal.

### Frontend Implementation (PayPal Buttons)

```typescript
import { PayPalButtons } from '@paypal/react-paypal-js';

// In your checkout component
<PayPalButtons
  createOrder={() => {
    // Return the PayPal order ID from Step 4
    return orderID; // e.g., "6PF86185NE999741P"
  }}
  onApprove={async (data, actions) => {
    // Step 6: Capture payment
    return await capturePayment(data.orderID);
  }}
  onError={(err) => {
    console.error('PayPal error:', err);
    // Show error message
  }}
  onCancel={() => {
    // User cancelled payment
    // Show cancellation message
  }}
/>
```

### What Happens:
1. User clicks PayPal button
2. PayPal popup opens
3. User logs in and approves payment
4. PayPal calls `onApprove` callback with `orderID`
5. Frontend calls capture endpoint (Step 6)

---

## Step 6: Confirm Payment (Capture)

### User Action
Payment is automatically captured after PayPal approval (via `onApprove` callback).

### API Endpoint

**POST** `/api/v1/payments/capture-order`

**Request:**
```http
POST /api/v1/payments/capture-order
Authorization: Bearer <token> (optional, but recommended)
Content-Type: application/json

{
  "orderID": "6PF86185NE999741P",
  "orderId": "691d4633526cd4c76ba09d96"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment captured successfully",
  "data": {
    "status": "success",
    "orderId": "691d4633526cd4c76ba09d96",
    "captureId": "6M9883740K7571708",
    "paypalOrderId": "6PF86185NE999741P",
    "data": {
      "id": "6PF86185NE999741P",
      "status": "COMPLETED",
      "purchase_units": [...]
    }
  }
}
```

**What Happens:**
- Payment is captured from PayPal
- Order status updated: `PENDING` → `COMPLETED`
- Payment status updated: `PENDING` → `PAID`
- **Tickets updated: `RESERVED` → `ACTIVE`** ✅
- Competition `ticketsSold` incremented
- Klaviyo notification sent (if configured)

### Database State After This Step
```javascript
// Order updated
{
  status: "completed",  // ← Updated
  paymentStatus: "paid",  // ← Updated
  paymentReference: "6M9883740K7571708"
}

// Tickets updated
{
  status: "active",  // ← Changed from RESERVED to ACTIVE
  orderId: ObjectId("691d4633526cd4c76ba09d96"),  // ← Linked to order
  userId: ObjectId("691d4633526cd4c76ba09d93"),
  reservedUntil: undefined  // ← Removed
}
```

### Frontend Implementation
```typescript
// Capture payment
const capturePayment = async (paypalOrderID: string, orderId: string) => {
  const response = await fetch('/api/v1/payments/capture-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      orderID: paypalOrderID,
      orderId: orderId
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Show success message
    // Redirect to success page
    // Update UI
  }
};

// In PayPal Buttons onApprove
onApprove={async (data) => {
  await capturePayment(data.orderID, orderId);
}}
```

### Alternative: Confirm Endpoint (Alias)

**POST** `/api/v1/payments/confirm`

Same as `/capture-order`, just an alias for clarity.

---

## Step 7: View Order Details

### User Action
User views order confirmation page or order details.

### API Endpoint

**GET** `/api/v1/orders/:id`

**Request:**
```http
GET /api/v1/orders/691d4633526cd4c76ba09d96
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "691d4633526cd4c76ba09d96",
      "competitionId": "6919aa951f3d63a8102600ea",
      "competitionTitle": "Bentley Continental GT Speed",
      "amountPence": 109500,
      "amountGBP": "1095.00",
      "quantity": 3,
      "status": "completed",
      "paymentStatus": "paid",
      "ticketsReserved": [14, 15, 16],
      "tickets": [
        {
          "ticketNumber": 14,
          "status": "active",
          "createdAt": "2025-11-19T04:00:00Z"
        },
        {
          "ticketNumber": 15,
          "status": "active",
          "createdAt": "2025-11-19T04:00:00Z"
        },
        {
          "ticketNumber": 16,
          "status": "active",
          "createdAt": "2025-11-19T04:00:00Z"
        }
      ],
      "paypalOrderId": "6PF86185NE999741P",
      "createdAt": "2025-11-19T04:00:00Z",
      "updatedAt": "2025-11-19T04:05:00Z"
    }
  },
  "message": "Order status retrieved successfully"
}
```

### Frontend Implementation
```typescript
// Get order details
const getOrder = async (orderId: string) => {
  const response = await fetch(`/api/v1/orders/${orderId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  // Display order details
  // Show tickets
};
```

---

## Step 8: View My Tickets

### User Action
User navigates to "My Tickets" page to see all their purchased tickets.

### API Endpoint

**GET** `/api/v1/users/me/tickets`

**Request:**
```http
GET /api/v1/users/me/tickets?page=1&limit=10
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `competitionId` (optional): Filter by competition

**Response:**
```json
{
  "success": true,
  "data": {
    "tickets": [
      {
        "competition": {
          "_id": "6919aa951f3d63a8102600ea",
          "title": "Bentley Continental GT Speed",
          "prize": "Bentley Continental GT Speed",
          "images": [...],
          "drawAt": "2025-12-25T12:00:00Z",
          "status": "live"
        },
        "tickets": [
          {
            "id": "691d4633526cd4c76ba09d97",
            "ticketNumber": 14,
            "status": "active",
            "orderNumber": "ORD-2025-001234",
            "paymentStatus": "paid",
            "createdAt": "2025-11-19T04:00:00Z"
          },
          {
            "id": "691d4633526cd4c76ba09d98",
            "ticketNumber": 15,
            "status": "active",
            "orderNumber": "ORD-2025-001234",
            "paymentStatus": "paid",
            "createdAt": "2025-11-19T04:00:00Z"
          },
          {
            "id": "691d4633526cd4c76ba09d99",
            "ticketNumber": 16,
            "status": "active",
            "orderNumber": "ORD-2025-001234",
            "paymentStatus": "paid",
            "createdAt": "2025-11-19T04:00:00Z"
          }
        ]
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 3,
    "totalPages": 1
  },
  "message": "Tickets retrieved successfully"
}
```

### Frontend Implementation
```typescript
// Get user tickets
const getMyTickets = async (page = 1, limit = 10) => {
  const response = await fetch(
    `/api/v1/users/me/tickets?page=${page}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  const data = await response.json();
  // Display tickets grouped by competition
};
```

---

## Alternative Flow: Direct Order Creation

If you're not using the cart system, you can create orders directly:

### API Endpoint

**POST** `/api/v1/orders`

**Request:**
```http
POST /api/v1/orders
Authorization: Bearer <token> (optional - supports guest checkout)
Content-Type: application/json

{
  "competitionId": "6919aa951f3d63a8102600ea",
  "qty": 3,
  "ticketsReserved": [14, 15, 16],
  "billingDetails": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890"
  },
  "shippingAddress": {
    "line1": "123 Main Street",
    "line2": "Apt 4B",
    "city": "London",
    "postalCode": "SW1A 1AA",
    "country": "GB"
  },
  "marketingOptIn": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "691d4633526cd4c76ba09d96",
      "orderNumber": "ORD-2025-001234",
      "status": "pending",
      "paymentStatus": "pending",
      "paypalOrderId": "6PF86185NE999741P",
      "orderID": "6PF86185NE999741P"
    },
    "paypalOrderId": "6PF86185NE999741P",
    "orderID": "6PF86185NE999741P"
  },
  "message": "Order created successfully"
}
```

**Then proceed with Steps 5-6 (PayPal payment and capture).**

---

## Complete Frontend Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND FLOW                              │
└─────────────────────────────────────────────────────────────┘

1. USER BROWSES
   GET /api/v1/competitions
   ↓
   Display competitions

2. USER ADDS TO CART
   POST /api/v1/cart/items
   { competitionId, quantity }
   ↓
   Tickets created: status = "RESERVED" ✅
   Cart updated

3. USER VIEWS CART
   GET /api/v1/cart
   ↓
   Display cart items

4. USER CHECKS OUT
   POST /api/v1/checkout/payment-intent
   { billingDetails, shippingAddress }
   ↓
   Orders created
   PayPal orders created
   Returns: paypalOrderId, orderID

5. USER PAYS
   PayPal Buttons Component
   createOrder={() => orderID}
   ↓
   PayPal popup opens
   User approves payment

6. PAYMENT CAPTURED
   POST /api/v1/payments/capture-order
   { orderID, orderId }
   ↓
   Tickets updated: "RESERVED" → "ACTIVE" ✅
   Order updated: "pending" → "completed"

7. USER VIEWS ORDER
   GET /api/v1/orders/:id
   ↓
   Display order with tickets

8. USER VIEWS TICKETS
   GET /api/v1/users/me/tickets
   ↓
   Display all user tickets
```

---

## Error Handling

### Common Errors and Solutions

#### 1. Tickets Already Reserved
**Error:**
```json
{
  "success": false,
  "message": "Some tickets are already reserved. Please try again.",
  "statusCode": 409
}
```

**Solution:**
- Refresh cart
- Try again (tickets may have expired)
- Remove item and re-add

#### 2. Payment Capture Failed
**Error:**
```json
{
  "success": false,
  "message": "Payment capture failed with status: DENIED"
}
```

**Solution:**
- Check PayPal account
- Try payment again
- Contact support if issue persists

#### 3. Order Not Found
**Error:**
```json
{
  "success": false,
  "message": "Order not found",
  "statusCode": 404
}
```

**Solution:**
- Verify order ID
- Check if user has access to order
- Contact support

---

## Status Codes Reference

| Code | Meaning | When It Occurs |
|------|---------|----------------|
| 200 | Success | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid data or missing fields |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | Not authorized to access resource |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource conflict (e.g., tickets already reserved) |
| 422 | Validation Error | Request validation failed |
| 500 | Server Error | Internal server error |

---

## Frontend Implementation Checklist

- [ ] Install PayPal SDK: `npm install @paypal/react-paypal-js`
- [ ] Set up PayPal provider with client ID
- [ ] Implement cart functionality
- [ ] Implement checkout flow
- [ ] Integrate PayPal Buttons
- [ ] Handle payment capture
- [ ] Display order confirmation
- [ ] Display user tickets
- [ ] Handle errors gracefully
- [ ] Show loading states
- [ ] Implement retry logic for failed requests

---

## Summary

### Ticket Status Flow (Frontend Perspective)

1. **Add to Cart** → Tickets created: `RESERVED` ✅
2. **Checkout** → Orders created, tickets remain: `RESERVED` ✅
3. **Payment Captured** → Tickets updated: `RESERVED` → `ACTIVE` ✅
4. **Draw Executed** → Winning ticket: `ACTIVE` → `WINNER` ✅

### Key Endpoints

- **Cart**: `/api/v1/cart`
- **Checkout**: `/api/v1/checkout/payment-intent`
- **Payment**: `/api/v1/payments/capture-order`
- **Orders**: `/api/v1/orders/:id`
- **Tickets**: `/api/v1/users/me/tickets`

### Important Notes

1. ✅ Tickets ARE created when adding to cart (as RESERVED)
2. ✅ Tickets are updated to ACTIVE when payment is captured
3. ✅ Always use the `orderID` from checkout response for PayPal
4. ✅ Handle payment capture in `onApprove` callback
5. ✅ Display tickets after successful payment

The system ensures tickets exist at every step! 🎉

