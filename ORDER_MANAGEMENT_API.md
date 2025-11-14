# Order Management CRUD Endpoints

This document describes all available endpoints for managing orders.

**Base URL:** `/api/v1/orders`

---

## CREATE (Create Order)

### Create Order
Create a new order with billing details and reserved tickets.

**Endpoint:** `POST /api/v1/orders`

**Authentication:** Optional (can be guest checkout)

**Request Body:**
```json
{
  "competitionId": "competition_id",
  "qty": 5,
  "ticketsReserved": [1001, 1002, 1003, 1004, 1005],
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

**Required Fields:**
- `competitionId` - Competition ID
- `qty` - Number of tickets
- `ticketsReserved` - Array of reserved ticket numbers
- `billingDetails.email` - Email is required

**Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": {
      "id": "order_id",
      "orderNumber": "RC1A2B3C4D5E6F",
      "competitionId": "competition_id",
      "amountPence": 2500,
      "amountGBP": "25.00",
      "quantity": 5,
      "status": "pending",
      "paymentStatus": "pending",
      "ticketsReserved": [1001, 1002, 1003, 1004, 1005],
      "billingDetails": {...},
      "shippingAddress": {...}
    },
    "clientSecret": "pi_xxx_secret_xxx"
  }
}
```

**Error Responses:**
- `400` - Missing required fields, competition not found, reserved tickets no longer available
- `404` - Competition not found
- `500` - Failed to generate unique order number

---

## READ (Get Orders)

### Get My Orders
Get all orders for the authenticated user with pagination and filtering.

**Endpoint:** `GET /api/v1/orders` or `GET /api/v1/orders/my-orders`

**Authentication:** Required (Bearer token)

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 10)
- `status` (optional) - Filter by order status: `pending`, `processing`, `completed`, `failed`, `refunded`
- `paymentStatus` (optional) - Filter by payment status: `pending`, `paid`, `failed`, `refunded`

**Response:**
```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": {
    "orders": [
      {
        "id": "order_id",
        "orderNumber": "RC1A2B3C4D5E6F",
        "competitionId": {
          "id": "competition_id",
          "title": "Competition Title",
          "prize": "Luxury Car",
          "images": ["https://image-url.com/image.jpg"]
        },
        "amountPence": 2500,
        "amountGBP": "25.00",
        "quantity": 5,
        "status": "completed",
        "paymentStatus": "paid",
        "ticketsReserved": [1001, 1002, 1003, 1004, 1005],
        "createdAt": "2024-01-15T10:00:00.000Z"
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

**Example Requests:**
```bash
# Get all my orders
GET /api/v1/orders

# Get my pending orders
GET /api/v1/orders?status=pending

# Get my paid orders
GET /api/v1/orders?paymentStatus=paid

# Get orders with pagination
GET /api/v1/orders?page=2&limit=20
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
      "orderNumber": "RC1A2B3C4D5E6F",
      "competitionId": {
        "id": "competition_id",
        "title": "Competition Title",
        "prize": "Luxury Car",
        "images": ["https://image-url.com/image.jpg"]
      },
      "userId": "user_id",
      "amountPence": 2500,
      "amountGBP": "25.00",
      "currency": "GBP",
      "quantity": 5,
      "status": "completed",
      "paymentStatus": "paid",
      "stripePaymentIntent": "pi_xxx",
      "paymentReference": "pi_xxx",
      "ticketsReserved": [1001, 1002, 1003, 1004, 1005],
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
- `401` - Not authorized (not logged in)
- `403` - Not authorized to access this order
- `404` - Order not found

**Authorization:**
- Users can access their own orders
- Admins can access any order
- Guest orders (no userId) can be accessed by anyone (for confirmation pages)

---

### Get All Orders (Admin Only)
Get all orders in the system with advanced filtering.

**Endpoint:** `GET /api/v1/orders/admin/all`

**Authentication:** Required (Admin or Super Admin)

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 50)
- `status` (optional) - Filter by order status
- `paymentStatus` (optional) - Filter by payment status
- `competitionId` (optional) - Filter by competition ID
- `search` (optional) - Search by payment reference

**Response:**
```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": {
    "orders": [
      {
        "id": "order_id",
        "orderNumber": "RC1A2B3C4D5E6F",
        "competitionId": {
          "id": "competition_id",
          "title": "Competition Title",
          "prize": "Luxury Car"
        },
        "userId": {
          "id": "user_id",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com"
        },
        "amountPence": 2500,
        "amountGBP": "25.00",
        "status": "completed",
        "paymentStatus": "paid",
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 50,
      "totalItems": 150,
      "totalPages": 3
    }
  }
}
```

**Example Requests:**
```bash
# Get all orders
GET /api/v1/orders/admin/all

# Filter by status
GET /api/v1/orders/admin/all?status=completed

# Filter by payment status
GET /api/v1/orders/admin/all?paymentStatus=paid

# Filter by competition
GET /api/v1/orders/admin/all?competitionId=competition_id

# Search by payment reference
GET /api/v1/orders/admin/all?search=pi_xxx

# Combined filters with pagination
GET /api/v1/orders/admin/all?status=completed&paymentStatus=paid&page=2&limit=100
```

---

### Get User Orders (Admin Only)
Get all orders for a specific user.

**Endpoint:** `GET /api/v1/orders/admin/users/:userId`

**Authentication:** Required (Admin or Super Admin)

**Parameters:**
- `userId` (path) - User ID

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": {
    "orders": [
      {
        "id": "order_id",
        "orderNumber": "RC1A2B3C4D5E6F",
        "competitionId": "competition_id",
        "amountPence": 2500,
        "amountGBP": "25.00",
        "status": "completed",
        "paymentStatus": "paid",
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 5,
      "totalPages": 1
    }
  }
}
```

---

## UPDATE (Update Order)

**⚠️ Currently Not Implemented**

The following update endpoints are not currently available but could be added:

- `PATCH /api/v1/orders/:id` - Update order details (status, billing details, etc.)
- `PUT /api/v1/orders/:id` - Replace entire order
- `PATCH /api/v1/orders/:id/status` - Update order status (admin only)
- `PATCH /api/v1/orders/:id/cancel` - Cancel an order

**Note:** Order status is typically updated automatically by:
- Payment webhooks (when payment succeeds/fails)
- System processes (when tickets are issued)
- Admin actions (manual updates)

---

## DELETE (Delete Order)

**⚠️ Currently Not Implemented**

The following delete endpoints are not currently available:

- `DELETE /api/v1/orders/:id` - Delete an order (soft delete recommended)
- `DELETE /api/v1/orders/:id/hard` - Hard delete an order (admin only)

**Note:** Orders are typically not deleted but marked as cancelled or refunded for audit purposes.

---

## Order Status Values

### Order Status (`status`)
- `pending` - Order created, awaiting payment
- `processing` - Payment received, processing tickets
- `completed` - Order completed, tickets issued
- `failed` - Payment failed or order failed
- `refunded` - Order refunded

### Payment Status (`paymentStatus`)
- `pending` - Payment not yet processed
- `paid` - Payment successful
- `failed` - Payment failed
- `refunded` - Payment refunded

---

## Summary Table

| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| **CREATE** |
| `POST` | `/orders` | Create new order | Optional | - |
| **READ** |
| `GET` | `/orders` | Get my orders | Yes | - |
| `GET` | `/orders/my-orders` | Get my orders (alias) | Yes | - |
| `GET` | `/orders/:id` | Get order by ID | Yes | - |
| `GET` | `/orders/admin/all` | Get all orders | Yes | Admin |
| `GET` | `/orders/admin/users/:userId` | Get user orders | Yes | Admin |
| **UPDATE** |
| `PATCH` | `/orders/:id` | Update order | ❌ Not implemented | - |
| `PUT` | `/orders/:id` | Replace order | ❌ Not implemented | - |
| **DELETE** |
| `DELETE` | `/orders/:id` | Delete order | ❌ Not implemented | - |

---

## Frontend Integration Examples

### Get User's Orders
```javascript
const getMyOrders = async (filters = {}) => {
  const queryParams = new URLSearchParams({
    page: filters.page || 1,
    limit: filters.limit || 10,
    ...(filters.status && { status: filters.status }),
    ...(filters.paymentStatus && { paymentStatus: filters.paymentStatus }),
  });

  const response = await fetch(`/api/v1/orders?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return await response.json();
};
```

### Get Order Details
```javascript
const getOrderDetails = async (orderId) => {
  const response = await fetch(`/api/v1/orders/${orderId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return await response.json();
};
```

### Create Order
```javascript
const createOrder = async (orderData) => {
  const response = await fetch('/api/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` // Optional for guest checkout
    },
    body: JSON.stringify(orderData)
  });

  return await response.json();
};
```

---

## Notes

1. **Order Numbers**: Each order gets a unique `orderNumber` (e.g., `RC1A2B3C4D5E6F`) generated automatically.

2. **Guest Orders**: Orders can be created without authentication (guest checkout), but they won't be associated with a user account.

3. **Payment Intent**: When an order is created, a Stripe payment intent is automatically created and returned in the response as `clientSecret`.

4. **Status Updates**: Order status is typically updated automatically by webhooks and system processes, not manually.

5. **Filtering**: Use query parameters to filter orders by status, payment status, competition, etc.

6. **Pagination**: All list endpoints support pagination with `page` and `limit` parameters.

