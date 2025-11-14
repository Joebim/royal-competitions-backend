# Royal Competitions API Documentation

Base URL: `/api/v1`

All responses follow this format:

```json
{
  "success": true,
  "message": "Success message",
  "data": { ... }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Error message",
  "errors": {
    "field": ["Error details"]
  }
}
```

---

## Content Endpoints

### GET Home Content

Get homepage content including hero competition, competitions list, champions, stats, draws, and reviews.

**Endpoint:** `GET /content/home`

**Authentication:** Not required

**Response:**

```json
{
  "success": true,
  "message": "Home content retrieved",
  "data": {
    "hero": {
      "id": "competition_id",
      "title": "Competition Title",
      "slug": "competition-slug",
      "image": "https://image-url.com/image.jpg",
      "ticketPrice": "5.00",
      "maxTickets": 1000,
      "soldTickets": 250,
      "progress": {
        "soldTickets": 250,
        "maxTickets": 1000,
        "entriesRemaining": 750,
        "percentage": 25
      },
      "drawDate": "2024-12-31T00:00:00.000Z",
      "category": "Luxury Cars",
      "featured": true
    },
    "competitions": [...],
    "champions": [...],
    "stats": [
      {
        "key": "competitions",
        "label": "Competitions",
        "value": "1.2K+"
      }
    ],
    "recentDraws": [...],
    "reviews": [...]
  }
}
```

---

### GET Page Content

Get content for a legal/info page by slug.

**Endpoint:** `GET /content/pages/:slug`

**Authentication:** Not required

**Parameters:**

- `slug` (path) - Page slug (e.g., "terms", "privacy")

**Response:**

```json
{
  "success": true,
  "message": "Page content retrieved successfully",
  "data": {
    "page": {
      "slug": "terms",
      "title": "Terms and Conditions",
      "subtitle": "Please read carefully",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "sections": [...]
    }
  }
}
```

---

### GET FAQs

Get frequently asked questions, optionally filtered by category.

**Endpoint:** `GET /content/faqs`

**Authentication:** Not required

**Query Parameters:**

- `category` (optional) - Filter by category: "General", "Competitions", "Draws", "Payments", "Account", "Prizes", "Technical"

**Response:**

```json
{
  "success": true,
  "message": "FAQs retrieved successfully",
  "data": {
    "faqs": [
      {
        "id": "faq_id",
        "question": "How do competitions work?",
        "answer": "Competitions are skill-based...",
        "category": "General",
        "order": 1
      }
    ]
  }
}
```

---

## Competition Endpoints

### GET All Competitions

Get paginated list of competitions with filtering and sorting.

**Endpoint:** `GET /competitions`

**Authentication:** Not required

**Query Parameters:**

- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 12)
- `status` (optional) - Filter by status: "live", "closed", "drawn", "draft", "cancelled"
- `category` (optional) - Filter by category
- `featured` (optional) - Filter featured competitions: "true" or "false"
- `minPrice` (optional) - Minimum ticket price in pounds
- `maxPrice` (optional) - Maximum ticket price in pounds
- `sort` (optional) - Sort field and direction: "field:asc" or "field:desc" (e.g., "createdAt:desc", "ticketPrice:asc")

**Response:**

```json
{
  "success": true,
  "message": "Competitions retrieved successfully",
  "data": {
    "competitions": [
      {
        "_id": "competition_id",
        "title": "Competition Title",
        "slug": "competition-slug",
        "description": "Full description",
        "shortDescription": "Short description",
        "prize": "Luxury Car",
        "prizeValue": 50000,
        "ticketPricePence": 500,
        "ticketLimit": 1000,
        "ticketsSold": 250,
        "status": "live",
        "category": "Luxury Cars",
        "featured": true,
        "images": [...],
        "drawAt": "2024-12-31T00:00:00.000Z",
        "progress": {
          "soldTickets": 250,
          "maxTickets": 1000,
          "entriesRemaining": 750,
          "percentage": 25
        }
      }
    ],
    "meta": {
      "pagination": {
        "page": 1,
        "limit": 12,
        "totalItems": 50,
        "totalPages": 5
      }
    }
  }
}
```

---

### GET Featured Competitions

Get all featured competitions.

**Endpoint:** `GET /competitions/featured`

**Authentication:** Not required

**Response:**

```json
{
  "success": true,
  "message": "Featured competitions retrieved successfully",
  "data": {
    "competitions": [...]
  }
}
```

---

### GET Single Competition

Get detailed information about a specific competition.

**Endpoint:** `GET /competitions/:id`

**Authentication:** Not required

**Parameters:**

- `id` (path) - Competition ID or slug

**Response:**

```json
{
  "success": true,
  "message": "Competition retrieved successfully",
  "data": {
    "competition": {
      "_id": "competition_id",
      "title": "Competition Title",
      "slug": "competition-slug",
      "description": "Full description",
      "shortDescription": "Short description",
      "prize": "Luxury Car",
      "prizeValue": 50000,
      "cashAlternative": 45000,
      "originalPrice": 60000,
      "ticketPricePence": 500,
      "ticketLimit": 1000,
      "ticketsSold": 250,
      "status": "live",
      "category": "Luxury Cars",
      "featured": true,
      "images": [
        {
          "url": "https://image-url.com/image.jpg",
          "publicId": "public_id",
          "thumbnail": "https://thumbnail-url.com/thumb.jpg"
        }
      ],
      "features": ["Feature 1", "Feature 2"],
      "included": ["Item 1", "Item 2"],
      "specifications": [
        {
          "label": "Engine",
          "value": "V8"
        }
      ],
      "drawAt": "2024-12-31T00:00:00.000Z",
      "freeEntryEnabled": true,
      "question": {
        "question": "What is the capital of UK?",
        "options": ["London", "Manchester", "Birmingham"],
        "correctAnswer": "London"
      },
      "progress": {
        "soldTickets": 250,
        "maxTickets": 1000,
        "entriesRemaining": 750,
        "percentage": 25
      }
    }
  }
}
```

---

### GET Competition Progress

Get progress information for a competition.

**Endpoint:** `GET /competitions/:id/progress`

**Authentication:** Not required

**Response:**

```json
{
  "success": true,
  "message": "Competition progress retrieved",
  "data": {
    "progress": {
      "soldTickets": 250,
      "maxTickets": 1000,
      "entriesRemaining": 750,
      "percentage": 25
    }
  }
}
```

---

### GET Competition Entry List

Get list of entries for a competition.

**Endpoint:** `GET /competitions/:id/entry-list`

**Authentication:** Not required

**Query Parameters:**

- `page` (optional) - Page number
- `limit` (optional) - Items per page

**Response:**

```json
{
  "success": true,
  "data": {
    "entries": [...],
    "meta": {
      "pagination": {...}
    }
  }
}
```

---

### GET Competition Draws

Get draws for a competition.

**Endpoint:** `GET /competitions/:id/draws`

**Authentication:** Not required

**Response:**

```json
{
  "success": true,
  "data": {
    "draws": [...]
  }
}
```

---

### GET Competition Winners

Get winners for a competition.

**Endpoint:** `GET /competitions/:id/winners`

**Authentication:** Not required

**Response:**

```json
{
  "success": true,
  "data": {
    "winners": [...]
  }
}
```

---

## User Endpoints

### GET My Entries

Get current user's competition entries.

**Endpoint:** `GET /users/me/entries`

**Authentication:** Required (Bearer token)

**Response:**

```json
{
  "success": true,
  "data": {
    "entries": [...]
  }
}
```

---

### GET My Orders

Get current user's orders.

**Endpoint:** `GET /users/me/orders`

**Authentication:** Required (Bearer token)

**Response:**

```json
{
  "success": true,
  "data": {
    "orders": [...]
  }
}
```

---

### UPDATE User Profile

Update current user's profile information.

**Endpoint:** `PUT /users/:id` or `PATCH /users/:id`

**Authentication:** Required (Admin only)

**Request Body:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+44123456789"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "user": {...}
  }
}
```

---

## Cart Endpoints

### GET Cart

Get current user's shopping cart.

**Endpoint:** `GET /cart`

**Authentication:** Required (Bearer token)

**Response:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "itemId": "item_id",
        "competitionId": "competition_id",
        "competition": {
          "title": "Competition Title",
          "slug": "competition-slug",
          "image": "https://image-url.com/image.jpg"
        },
        "quantity": 5,
        "unitPrice": 5.0,
        "subtotal": 25.0
      }
    ],
    "total": 25.0,
    "itemCount": 1
  }
}
```

---

### UPDATE Cart Item

Update quantity of an item in the cart.

**Endpoint:** `PATCH /cart/items/:itemId`

**Authentication:** Required (Bearer token)

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
    "cart": {...}
  }
}
```

---

## Order Endpoints

### GET My Orders

Get current user's orders.

**Endpoint:** `GET /orders` or `GET /orders/my-orders`

**Authentication:** Required (Bearer token)

**Response:**

```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "_id": "order_id",
        "orderNumber": "ORD-123456",
        "items": [...],
        "total": 25.00,
        "status": "completed",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

### GET Order by ID

Get details of a specific order.

**Endpoint:** `GET /orders/:id`

**Authentication:** Required (Bearer token)

**Response:**

```json
{
  "success": true,
  "data": {
    "order": {
      "_id": "order_id",
      "orderNumber": "ORD-123456",
      "items": [...],
      "total": 25.00,
      "status": "completed",
      "paymentStatus": "paid",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

## Authentication

### Headers

For protected endpoints, include the JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

### Token Format

The token is obtained from the login endpoint and should be stored securely. Include it in all authenticated requests.

---

## Notes

1. **Pagination**: Most list endpoints support pagination with `page` and `limit` query parameters.

2. **Filtering**: Competition endpoints support multiple filter options via query parameters.

3. **Sorting**: Use the `sort` parameter with format `field:direction` (e.g., `createdAt:desc`, `ticketPrice:asc`).

4. **Price Format**: Ticket prices are stored in pence. Divide by 100 to get pounds (e.g., 500 pence = £5.00).

5. **Date Format**: All dates are returned in ISO 8601 format (UTC).

6. **Error Handling**: Always check the `success` field in responses. On errors, check the `errors` object for field-specific validation errors.
