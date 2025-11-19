# Payment Endpoints API Reference

Complete API documentation for PayPal payment endpoints.

## Base URL
```
http://localhost:5000/api/v1/payments
```

---

## 1. Create PayPal Order

**Endpoint:** `POST /api/v1/payments/create-order`

**Description:** Creates a PayPal order and returns the `orderID` for use with PayPal Buttons.

**Authentication:** Optional (can be called from frontend without auth)

**Request Body:**
```json
{
  "amount": 365,           // Required: Amount in pence (e.g., 365 = £3.65)
  "orderId": "optional"    // Optional: Internal order ID to link PayPal order to existing order
}
```

**Request Example:**
```json
{
  "amount": 365
}
```

**Or with existing order:**
```json
{
  "amount": 365,
  "orderId": "67890abcdef1234567890123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "PayPal order created",
  "data": {
    "orderID": "5O190127TN364715T",
    "paypalOrderId": "5O190127TN364715T"
  }
}
```

**Error Responses:**

**400 - Missing Amount:**
```json
{
  "success": false,
  "message": "Amount is required"
}
```

**404 - Order Not Found:**
```json
{
  "success": false,
  "message": "Order not found"
}
```

**403 - Not Authorized:**
```json
{
  "success": false,
  "message": "Not authorized"
}
```

**500 - PayPal Error:**
```json
{
  "success": false,
  "message": "Failed to create PayPal order"
}
```

**Usage Notes:**
- If `orderId` is provided, the endpoint verifies the order exists and links the PayPal order to it
- If `orderId` is not provided, a standalone PayPal order is created
- The returned `orderID` should be used with PayPal Buttons `createOrder` prop
- Both `orderID` and `paypalOrderId` are the same value (aliases for consistency)

---

## 2. Capture Payment

**Endpoint:** `POST /api/v1/payments/capture-order`

**Description:** Captures a PayPal payment after user approval. This is called from the PayPal Buttons `onApprove` callback.

**Authentication:** Public (called from frontend after PayPal approval)

**Request Body:**
```json
{
  "orderID": "5O190127TN364715T",     // Required: PayPal order ID from onApprove callback
  "orderId": "optional"                // Optional: Internal order ID (fallback)
}
```

**Request Example:**
```json
{
  "orderID": "5O190127TN364715T"
}
```

**Or with internal order ID:**
```json
{
  "orderID": "5O190127TN364715T",
  "orderId": "67890abcdef1234567890123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Payment captured successfully",
  "data": {
    "status": "success",
    "orderId": "67890abcdef1234567890123",
    "captureId": "8F12345678901234",
    "paypalOrderId": "5O190127TN364715T",
    "data": {
      "id": "5O190127TN364715T",
      "status": "COMPLETED",
      "purchase_units": [...]
    }
  }
}
```

**Already Paid Response (200):**
```json
{
  "success": true,
  "message": "Payment already completed",
  "data": {
    "orderId": "67890abcdef1234567890123",
    "status": "completed",
    "alreadyPaid": true
  }
}
```

**Error Responses:**

**400 - Missing Order ID:**
```json
{
  "success": false,
  "message": "PayPal orderID is required"
}
```

**400 - Capture Failed:**
```json
{
  "success": false,
  "message": "Payment capture failed with status: DENIED"
}
```

**404 - Order Not Found:**
```json
{
  "success": false,
  "message": "Order not found"
}
```

**500 - PayPal Error:**
```json
{
  "success": false,
  "message": "Failed to capture PayPal order"
}
```

**Usage Notes:**
- This endpoint is called automatically from PayPal Buttons `onApprove` callback
- The `orderID` comes from `data.orderID` in the `onApprove` callback
- If payment is already captured, returns success with `alreadyPaid: true` (idempotent)
- On success, tickets are automatically issued and order status is updated

**Frontend Integration:**
```typescript
<PayPalButtons
  createOrder={() => orderID}
  onApprove={async (data) => {
    const response = await fetch('/api/v1/payments/capture-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ orderID: data.orderID }),
    });
    const result = await response.json();
    // Handle success
  }}
/>
```

---

## 3. Confirm Payment

**Endpoint:** `POST /api/v1/payments/confirm`

**Description:** Alias for `/capture-order`. Provides clearer naming for frontend developers. Same functionality as capture-order.

**Authentication:** Public

**Request Body:**
```json
{
  "orderID": "5O190127TN364715T",     // Required: PayPal order ID
  "orderId": "optional"                // Optional: Internal order ID
}
```

**Request Example:**
```json
{
  "orderID": "5O190127TN364715T"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Payment captured successfully",
  "data": {
    "status": "success",
    "orderId": "67890abcdef1234567890123",
    "captureId": "8F12345678901234",
    "paypalOrderId": "5O190127TN364715T",
    "data": { ... }
  }
}
```

**Error Responses:**
Same as `/capture-order` endpoint.

**Usage Notes:**
- This is an alias for `/capture-order`
- Use whichever endpoint name is clearer for your use case
- Both endpoints have identical functionality

---

## Complete Payment Flow Example

### Step 1: Create Order
```http
POST /api/v1/orders
Content-Type: application/json

{
  "competitionId": "6919aa951f3d63a8102600fa",
  "qty": 12,
  "ticketsReserved": [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
  "billingDetails": {
    "firstName": "Joseph",
    "lastName": "Akinwole",
    "email": "joseph.akinwole.me@gmail.com"
  },
  "shippingAddress": {
    "line1": "20, River Jordan Street, Ayobo, Lagos.",
    "line2": "Futa South Gate",
    "city": "Lagos",
    "postalCode": "100001",
    "country": "NG"
  },
  "marketingOptIn": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order": { ... },
    "paypalOrderId": "5O190127TN364715T",
    "orderID": "5O190127TN364715T"
  }
}
```

### Step 2: Use PayPal Buttons
```typescript
<PayPalButtons
  createOrder={() => "5O190127TN364715T"}  // From Step 1
  onApprove={async (data) => {
    // Step 3: Capture payment
  }}
/>
```

### Step 3: Capture Payment
```http
POST /api/v1/payments/capture-order
Content-Type: application/json

{
  "orderID": "5O190127TN364715T"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "success",
    "orderId": "67890abcdef1234567890123",
    "captureId": "8F12345678901234",
    "paypalOrderId": "5O190127TN364715T"
  }
}
```

---

## Alternative Flow: Create PayPal Order Separately

If you need to create a PayPal order separately from order creation:

### Step 1: Create PayPal Order
```http
POST /api/v1/payments/create-order
Content-Type: application/json

{
  "amount": 4380,
  "orderId": "67890abcdef1234567890123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderID": "5O190127TN364715T",
    "paypalOrderId": "5O190127TN364715T"
  }
}
```

### Step 2: Use with PayPal Buttons
```typescript
<PayPalButtons
  createOrder={() => "5O190127TN364715T"}
  onApprove={async (data) => {
    await capturePayment(data.orderID);
  }}
/>
```

---

## Field Descriptions

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | Yes* | Amount in pence (e.g., 365 = £3.65). Required if `orderId` not provided |
| `orderId` | string | No | Internal order ID to link PayPal order |
| `orderID` | string | Yes | PayPal order ID (from PayPal Buttons `onApprove`) |

*Note: `amount` is required if `orderId` is not provided. If `orderId` is provided, amount is taken from the order.

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `orderID` | string | PayPal order ID (use with PayPal Buttons) |
| `paypalOrderId` | string | Same as `orderID` (alias for consistency) |
| `status` | string | Payment status ("success", "completed") |
| `orderId` | string | Internal order ID |
| `captureId` | string | PayPal capture ID |
| `alreadyPaid` | boolean | True if payment was already processed |

---

## Error Handling

### Common Error Scenarios

1. **Missing Required Fields**
   - Error: `"Amount is required"` or `"PayPal orderID is required"`
   - Solution: Ensure all required fields are provided

2. **Order Not Found**
   - Error: `"Order not found"`
   - Solution: Verify the order ID is correct

3. **Payment Already Captured**
   - Response: Success with `alreadyPaid: true`
   - Solution: This is normal - payment was already processed (idempotent)

4. **PayPal API Error**
   - Error: `"Failed to create PayPal order"` or `"Failed to capture PayPal order"`
   - Solution: Check PayPal credentials and network connectivity

5. **Authorization Error**
   - Error: `"Not authorized"`
   - Solution: Ensure user has permission to access the order

---

## Status Codes

| Code | Meaning | When It Occurs |
|------|---------|----------------|
| 200 | Success | Payment captured successfully |
| 400 | Bad Request | Missing fields, invalid data, or PayPal error |
| 403 | Forbidden | User not authorized to access order |
| 404 | Not Found | Order doesn't exist |
| 500 | Server Error | Internal server error or PayPal API failure |

---

## Testing

### Test with PayPal Sandbox

1. Set `PAYPAL_MODE=sandbox` in backend `.env`
2. Use PayPal sandbox Client ID in frontend
3. Use sandbox test accounts from PayPal Developer Dashboard
4. Test all scenarios:
   - Successful payment
   - Payment cancellation
   - Payment failure
   - Already paid (idempotency)

### Example Test Request

```bash
# Create PayPal Order
curl -X POST http://localhost:5000/api/v1/payments/create-order \
  -H "Content-Type: application/json" \
  -d '{"amount": 365}'

# Capture Payment (after PayPal approval)
curl -X POST http://localhost:5000/api/v1/payments/capture-order \
  -H "Content-Type: application/json" \
  -d '{"orderID": "5O190127TN364715T"}'
```

---

## Notes

1. **Idempotency**: Both `/capture-order` and `/confirm` are idempotent - calling them multiple times with the same `orderID` is safe
2. **Webhooks**: Payment confirmation is also handled via webhooks automatically
3. **Order Linking**: If `orderId` is provided when creating PayPal order, it links the PayPal order to your internal order
4. **Currency**: All amounts are in pence (smallest currency unit). 365 pence = £3.65
5. **Authentication**: `/create-order` and `/capture-order` don't require authentication, but authorization is checked if `orderId` is provided

