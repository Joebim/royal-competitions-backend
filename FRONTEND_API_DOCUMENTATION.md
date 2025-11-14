# Frontend API Documentation - Royal Competitions

## Base URL

```
http://localhost:5000/api/v1  (Development)
https://api.royalcompetitions.co.uk/api/v1  (Production)
```

## Authentication

The API uses cookie-based authentication. Include credentials in all requests:

```javascript
// Axios example
axios.defaults.withCredentials = true;

// Fetch example
fetch(url, {
  credentials: 'include',
});
```

---

## 1. Browse Competitions

### GET /api/v1/competitions

Get all competitions with filters.

**Query Parameters:**

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 12)
- `status` (string): Filter by status (live, closed, drawn, cancelled)
- `category` (string): Filter by category
- `featured` (boolean): Filter featured competitions
- `priceMin` (number): Minimum ticket price
- `priceMax` (number): Maximum ticket price
- `search` (string): Search in title/description
- `sort` (string): Sort field and direction (e.g., "createdAt:desc")

**Response:**

```json
{
  "success": true,
  "message": "Competitions retrieved successfully",
  "data": {
    "competitions": [
      {
        "_id": "competition_id",
        "title": "Win a Pioneer DJ Setup",
        "description": "...",
        "prize": "Pioneer DJ Deck",
        "prizeValue": 500,
        "images": [...],
        "ticketPricePence": 100,
        "ticketLimit": 10000,
        "ticketsSold": 234,
        "status": "live",
        "drawMode": "automatic",
        "drawAt": "2026-01-10T19:00:00Z",
        "freeEntryEnabled": true,
        "noPurchasePostalAddress": "...",
        "progress": {
          "soldTickets": 234,
          "maxTickets": 10000,
          "entriesRemaining": 9766,
          "percentage": 2.34
        },
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 12,
      "totalItems": 50,
      "totalPages": 5
    }
  }
}
```

---

## 2. Competition Detail

### GET /api/v1/competitions/:id

Get single competition details.

**Response:**

```json
{
  "success": true,
  "data": {
    "competition": {
      "_id": "competition_id",
      "title": "Win a Pioneer DJ Setup",
      "description": "...",
      "prize": "Pioneer DJ Deck",
      "prizeValue": 500,
      "images": [...],
      "ticketPricePence": 100,
      "ticketLimit": 10000,
      "ticketsSold": 234,
      "status": "live",
      "drawMode": "automatic",
      "drawAt": "2026-01-10T19:00:00Z",
      "freeEntryEnabled": true,
      "noPurchasePostalAddress": "...",
      "termsUrl": "...",
      "features": [...],
      "included": [...],
      "specifications": [...],
      "progress": {
        "soldTickets": 234,
        "maxTickets": 10000,
        "entriesRemaining": 9766,
        "percentage": 2.34
      }
    }
  }
}
```

### GET /api/v1/competitions/:id/progress

Get competition progress (tickets sold, remaining, etc.).

**Response:**

```json
{
  "success": true,
  "data": {
    "progress": {
      "soldTickets": 234,
      "maxTickets": 10000,
      "entriesRemaining": 9766,
      "percentage": 2.34
    },
    "status": "live",
    "drawDate": "2026-01-10T19:00:00Z"
  }
}
```

---

## 3. Ticket Reservation (Hold Tickets)

### POST /api/v1/competitions/:id/hold

Reserve tickets for a competition (requires authentication).

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
    "reservedTickets": [101, 102, 103, 104, 105],
    "reservedUntil": "2025-01-01T12:15:00Z",
    "costPence": 500,
    "costGBP": "5.00",
    "competition": {
      "id": "competition_id",
      "title": "Win a Pioneer DJ Setup",
      "ticketPricePence": 100,
      "remainingTickets": 9761
    }
  }
}
```

**Important:**

- Reservations expire after 15 minutes
- Reserved tickets are automatically released if payment is not completed
- Frontend should show countdown timer until `reservedUntil`
- Store `reservedTickets` array for order creation

---

## 4. Create Order

### POST /api/v1/orders

Create an order for reserved tickets (can be guest checkout).

**Request Body:**

```json
{
  "competitionId": "competition_id",
  "qty": 5,
  "ticketsReserved": [101, 102, 103, 104, 105],
  "billingDetails": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+447911123456"
  },
  "shippingAddress": {
    "line1": "123 Main St",
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
  "message": "Order created successfully",
  "data": {
    "order": {
      "id": "order_id",
      "competitionId": "competition_id",
      "amountPence": 500,
      "amountGBP": "5.00",
      "currency": "GBP",
      "quantity": 5,
      "status": "pending",
      "paymentStatus": "pending",
      "ticketsReserved": [101, 102, 103, 104, 105],
      "billingDetails": {...},
      "shippingAddress": {...},
      "marketingOptIn": true,
      "createdAt": "2025-01-01T12:00:00Z"
    },
    "clientSecret": "pi_xxx_secret_xxx"
  }
}
```

**Important:**

- Use `clientSecret` with Stripe Elements for payment
- Store `order.id` for tracking
- Order status will be updated via webhook after payment

---

## 5. Payment with Stripe

### Frontend Flow:

1. Create order (POST /api/v1/orders) - returns `clientSecret`
2. Initialize Stripe Elements with `clientSecret`
3. Collect payment method from user
4. Confirm payment with Stripe
5. Wait for webhook to process payment
6. Check order status (GET /api/v1/orders/:id)

**Stripe Integration:**

```javascript
import { loadStripe } from '@stripe/stripe-js';

const stripe = await loadStripe('pk_test_...');
const { clientSecret } = await createOrder(orderData);

const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: {
      name: billingDetails.firstName + ' ' + billingDetails.lastName,
      email: billingDetails.email,
      phone: billingDetails.phone,
    },
  },
});

if (error) {
  // Handle error
} else if (paymentIntent.status === 'succeeded') {
  // Payment succeeded - webhook will issue tickets
  // Poll order status or redirect to success page
}
```

---

## 6. Get Order Status

### GET /api/v1/orders/:id

Get order details and status (requires authentication).

**Response:**

```json
{
  "success": true,
  "data": {
    "order": {
      "id": "order_id",
      "competitionId": "competition_id",
      "amountPence": 500,
      "amountGBP": "5.00",
      "currency": "GBP",
      "quantity": 5,
      "status": "completed",
      "paymentStatus": "paid",
      "stripePaymentIntent": "pi_xxx",
      "ticketsReserved": [101, 102, 103, 104, 105],
      "paymentReference": "pi_xxx",
      "billingDetails": {...},
      "shippingAddress": {...},
      "marketingOptIn": true,
      "createdAt": "2025-01-01T12:00:00Z",
      "updatedAt": "2025-01-01T12:05:00Z"
    }
  }
}
```

---

## 7. My Tickets

### GET /api/v1/tickets/users/:id/tickets

Get user's tickets (requires authentication).

**Query Parameters:**

- `competitionId` (string, optional): Filter by competition

**Response:**

```json
{
  "success": true,
  "data": {
    "tickets": [
      {
        "competition": {
          "_id": "competition_id",
          "title": "Win a Pioneer DJ Setup",
          "prize": "Pioneer DJ Deck",
          "images": [...],
          "drawAt": "2026-01-10T19:00:00Z",
          "status": "live"
        },
        "tickets": [
          {
            "id": "ticket_id",
            "ticketNumber": 101,
            "status": "active",
            "createdAt": "2025-01-01T12:05:00Z"
          }
        ]
      }
    ]
  }
}
```

---

## 8. Entry List (Public Transparency)

### GET /api/v1/competitions/:id/entry-list

Get competition entry list (public, anonymized by default).

**Query Parameters:**

- `anonymize` (boolean, default: true): Whether to anonymize user data

**Response:**

```json
{
  "success": true,
  "data": {
    "competition": {
      "id": "competition_id",
      "title": "Win a Pioneer DJ Setup",
      "totalTickets": 234
    },
    "entries": [
      {
        "ticketNumber": 101,
        "createdAt": "2025-01-01T12:00:00Z"
      },
      {
        "ticketNumber": 102,
        "user": {
          "name": "John Doe",
          "email": "john@example.com"
        },
        "createdAt": "2025-01-01T12:01:00Z"
      }
    ]
  }
}
```

---

## 9. Winners

### GET /api/v1/winners

Get public winners list.

**Query Parameters:**

- `page` (number): Page number
- `limit` (number): Items per page
- `competitionId` (string, optional): Filter by competition

**Response:**

```json
{
  "success": true,
  "data": {
    "winners": [
      {
        "id": "winner_id",
        "competition": {
          "id": "competition_id",
          "title": "Win a Pioneer DJ Setup",
          "prize": "Pioneer DJ Deck",
          "images": [...]
        },
        "ticketNumber": 101,
        "claimCode": "ABCD-1234",
        "drawTime": "2026-01-10T19:00:00Z",
        "drawMethod": "automatic",
        "proofImageUrl": "...",
        "drawVideoUrl": "...",
        "notified": true,
        "claimed": true,
        "createdAt": "2026-01-10T19:00:00Z"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 50,
      "totalPages": 3
    }
  }
}
```

### GET /api/v1/competitions/:id/winners

Get winners for a specific competition.

**Response:**

```json
{
  "success": true,
  "data": {
    "competition": {
      "id": "competition_id",
      "title": "Win a Pioneer DJ Setup",
      "prize": "Pioneer DJ Deck",
      "prizeValue": 500,
      "drawnAt": "2026-01-10T19:00:00Z"
    },
    "draw": {
      "id": "draw_id",
      "drawTime": "2026-01-10T19:00:00Z",
      "drawMethod": "automatic",
      "algorithm": "hmac-sha256-v1",
      "snapshotTicketCount": 234,
      "evidenceUrl": "..."
    },
    "winners": [
      {
        "id": "winner_id",
        "ticketNumber": 101,
        "claimCode": "ABCD-1234",
        "notified": true,
        "claimed": true,
        "proofImageUrl": "...",
        "drawVideoUrl": "...",
        "testimonial": {...},
        "user": {
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com"
        },
        "createdAt": "2026-01-10T19:00:00Z"
      }
    ]
  }
}
```

---

## 10. Draw Information

### GET /api/v1/draws/:id

Get draw details with audit information.

**Response:**

```json
{
  "success": true,
  "data": {
    "draw": {
      "_id": "draw_id",
      "competitionId": "competition_id",
      "drawTime": "2026-01-10T19:00:00Z",
      "seed": "abc123...",
      "algorithm": "hmac-sha256-v1",
      "snapshotTicketCount": 234,
      "snapshot": [...],
      "result": [
        {
          "ticketNumber": 101,
          "ticketId": "ticket_id",
          "userId": "user_id"
        }
      ],
      "drawMethod": "automatic",
      "initiatedBy": "admin_id",
      "notes": "...",
      "evidenceUrl": "...",
      "winners": [...],
      "audit": {
        "seed": "abc123...",
        "algorithm": "hmac-sha256-v1",
        "snapshotTicketCount": 234,
        "snapshot": [...],
        "result": [...]
      }
    }
  }
}
```

### GET /api/v1/draws/:id/verify

Verify draw result (for audit purposes).

**Response:**

```json
{
  "success": true,
  "data": {
    "drawId": "draw_id",
    "isValid": true
  },
  "message": "Draw verification passed"
}
```

---

## 11. Competition Draws

### GET /api/v1/competitions/:id/draws

Get draws for a competition.

**Response:**

```json
{
  "success": true,
  "data": {
    "draws": [
      {
        "_id": "draw_id",
        "drawTime": "2026-01-10T19:00:00Z",
        "drawMethod": "automatic",
        "seed": "abc123...",
        "algorithm": "hmac-sha256-v1",
        "snapshotTicketCount": 234,
        "result": [...],
        "initiatedBy": {...}
      }
    ],
    "winners": [...]
  }
}
```

---

## 12. Free Entry (Postal Entry)

### Display Postal Entry Instructions

If `competition.freeEntryEnabled === true`, show postal entry instructions:

**Frontend UI:**

```javascript
// Check if free entry is enabled
if (competition.freeEntryEnabled) {
  // Show "Postal Entry Instructions" button/modal
  // Display competition.noPurchasePostalAddress
  // Include instructions on how to enter without purchase
}
```

**Postal Entry Instructions:**

- Address: `competition.noPurchasePostalAddress`
- Include: Name, Address, Email, Phone, Competition ID
- Admin will manually add entries via CSV import or admin panel

---

## Complete User Flow

### 1. Browse Competitions

```
GET /api/v1/competitions
→ Display grid/list of competitions
→ Show: thumbnail, prize, ticket price, progress bar, countdown, CTA
```

### 2. View Competition Detail

```
GET /api/v1/competitions/:id
→ Display: images, description, prize, ticket price, remaining tickets, draw date
→ Show "Enter" button or "Postal Entry" button if freeEntryEnabled
```

### 3. Reserve Tickets

```
POST /api/v1/competitions/:id/hold
Body: { qty: 5 }
→ Reserve 5 tickets for 15 minutes
→ Show countdown timer
→ Store reservedTickets array
```

### 4. Checkout

```
POST /api/v1/orders
Body: {
  competitionId, qty, ticketsReserved,
  billingDetails, shippingAddress, marketingOptIn
}
→ Create order
→ Get clientSecret for Stripe
→ Initialize Stripe Elements
```

### 5. Payment

```
Stripe.confirmCardPayment(clientSecret, paymentMethod)
→ Payment processed
→ Webhook issues tickets automatically
→ Poll order status: GET /api/v1/orders/:id
```

### 6. Post-Checkout

```
GET /api/v1/orders/:id
→ Check if paymentStatus === "paid"
→ Display success page with ticket numbers
→ Show "My Tickets" link
```

### 7. My Tickets

```
GET /api/v1/tickets/users/:id/tickets
→ Display all user's tickets grouped by competition
→ Show ticket numbers, competition details, draw date
→ Allow CSV export
```

### 8. Draw (Automatic)

```
Scheduled job runs at drawAt time
→ Draw is performed automatically
→ Winners are notified via Klaviyo
→ Competition status changes to "drawn"
```

### 9. View Winners

```
GET /api/v1/winners
GET /api/v1/competitions/:id/winners
→ Display winners with proof images/videos
→ Show draw audit information
→ Allow download of audit package
```

---

## Error Handling

### Standard Error Response:

```json
{
  "success": false,
  "message": "Error message",
  "error": {
    "code": "ERROR_CODE",
    "details": {...}
  }
}
```

### Common HTTP Status Codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (not authorized)
- `404` - Not Found
- `500` - Internal Server Error

### Example Error Handling:

```javascript
try {
  const response = await axios.post('/api/v1/competitions/:id/hold', {
    qty: 5,
  });
  // Handle success
} catch (error) {
  if (error.response?.status === 400) {
    // Validation error
    console.error(error.response.data.message);
  } else if (error.response?.status === 401) {
    // Not authenticated - redirect to login
    window.location.href = '/login';
  } else {
    // Other errors
    console.error('An error occurred:', error);
  }
}
```

---

## Rate Limiting

- API endpoints are rate limited
- Rate limit: 100 requests per 15 minutes per IP
- Rate limit headers in response:
  - `X-RateLimit-Limit`: Maximum requests
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset time

---

## Webhooks (Stripe)

### Webhook Endpoint:

```
POST /api/v1/payments/webhook
```

### Webhook Events:

- `payment_intent.succeeded` - Payment successful, tickets issued
- `payment_intent.payment_failed` - Payment failed, reservations released
- `charge.refunded` - Refund processed, tickets marked as refunded

**Note:** Webhooks are handled server-side. Frontend should poll order status after payment.

---

## Environment Variables

### Frontend Required:

```env
REACT_APP_API_URL=http://localhost:5000/api/v1
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Best Practices

1. **Always include credentials** in API requests for cookie-based auth
2. **Handle reservations carefully** - they expire after 15 minutes
3. **Poll order status** after payment instead of relying on webhooks
4. **Show loading states** during API calls
5. **Handle errors gracefully** with user-friendly messages
6. **Validate input** on frontend before API calls
7. **Cache competition data** to reduce API calls
8. **Implement retry logic** for failed requests
9. **Show countdown timers** for reservations and draw dates
10. **Display progress bars** for ticket sales

---

## Testing

### Test Competition Flow:

1. Create test competition via admin panel
2. Reserve tickets
3. Create order
4. Process payment with Stripe test cards
5. Verify tickets are issued
6. Check "My Tickets" page
7. Run draw (admin or automatic)
8. Verify winners are displayed

### Stripe Test Cards:

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0027 6000 3184`

---

## Support

For API support or questions:

- Email: support@royalcompetitions.co.uk
- Documentation: https://docs.royalcompetitions.co.uk

---

## Changelog

### Version 1.0.0 (2025-01-01)

- Initial release
- Competition browsing and detail
- Ticket reservation and checkout
- Stripe payment integration
- Automatic and manual draws
- Winners display
- Public entry lists
