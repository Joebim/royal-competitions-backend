# Royal Competitions API – Comprehensive Reference

This document describes the production REST API that powers the Royal Competitions platform. The backend replaces all mocked frontend data with live endpoints, each returning a consistent envelope:

```json
{
  "success": true,
  "data": { ... },
  "message": "optional note",
  "meta": { "pagination": { ... } }
}
```

Unless stated otherwise:

- **Base URL**: `https://<host>/api/v1` (local default: `http://localhost:5000/api/v1`)
- **Authentication**: HTTP-only cookies (`authToken`, `refreshToken`). Axios must set `withCredentials = true`.
- **Pagination**: responses include `meta.pagination = { page, limit, totalItems, totalPages }`.
- **Errors**: validation failures surface as `422` with an `errors` map; other errors flatten to `{ success: false, message, errors? }`.
- **Role checks**: Admin endpoints require `admin` or `super_admin`; destructive operations may require `super_admin`.

---

## 1. Authentication & Account Management

| Method | Path                    | Auth     | Purpose                                     |
| ------ | ----------------------- | -------- | ------------------------------------------- |
| POST   | `/auth/register`        | –        | Create an account and issue login cookies   |
| POST   | `/auth/login`           | –        | Standard user login                         |
| POST   | `/auth/admin/login`     | –        | Login restricted to `admin` / `super_admin` |
| POST   | `/auth/refresh`         | –        | Rotate access + refresh cookies             |
| POST   | `/auth/verify-email`    | –        | Mark account verified using email token     |
| POST   | `/auth/forgot-password` | –        | Generate password reset token               |
| POST   | `/auth/reset-password`  | –        | Reset password via token                    |
| GET    | `/auth/profile`         | ✅       | Fetch authenticated user                    |
| PUT    | `/auth/profile`         | ✅       | Update profile details                      |
| POST   | `/auth/change-password` | ✅       | Change password                             |
| POST   | `/auth/logout`          | ✅       | Clear authentication cookies                |
| GET    | `/auth/admin/verify`    | ✅ admin | Check admin/super-admin status              |

### 1.1 Register

**Request**

```json
POST /auth/register
Content-Type: application/json

{
  "firstName": "Imogen",
  "lastName": "Boyle",
  "email": "imogen@example.com",
  "phone": "07123456789",
  "password": "MyStrongPass1!",
  "confirmPassword": "MyStrongPass1!",
  "subscribedToNewsletter": true
}
```

**Response**

```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "data": {
    "user": {
      "_id": "664fd4db0b8e3ceb12f20589",
      "firstName": "Imogen",
      "lastName": "Boyle",
      "email": "imogen@example.com",
      "role": "user",
      "isVerified": false,
      "isActive": true,
      "subscribedToNewsletter": true,
      "createdAt": "2024-11-09T10:00:00.000Z",
      "updatedAt": "2024-11-09T10:00:00.000Z"
    }
  }
}
```

### 1.2 Login / Admin Login

**Request**

```json
POST /auth/login
Content-Type: application/json

{
  "email": "imogen@example.com",
  "password": "MyStrongPass1!"
}
```

**Response**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "664fd4db0b8e3ceb12f20589",
      "firstName": "Imogen",
      "lastName": "Boyle",
      "email": "imogen@example.com",
      "role": "user",
      "isVerified": true,
      "isActive": true,
      "subscribedToNewsletter": true,
      "createdAt": "2024-11-09T10:00:00.000Z",
      "updatedAt": "2024-11-10T08:41:12.000Z"
    },
    "isAdmin": false,
    "isSuperAdmin": false
  }
}
```

Admin login returns the same shape but forces `isAdmin = true` and `isSuperAdmin = role === 'super_admin'`.

### 1.3 Refresh Token

```http
POST /auth/refresh
```

**Response**

```json
{
  "success": true,
  "message": "Token refreshed successfully"
}
```

### 1.4 Profile Endpoints

- `GET /auth/profile` returns `{ user }` (same shape as login response).
- `PUT /auth/profile` accepts any subset of:

```json
{
  "firstName": "Imogen",
  "lastName": "Boyle",
  "phone": "07123456789",
  "subscribedToNewsletter": false
}
```

### 1.5 Change Password

```json
POST /auth/change-password
{
  "currentPassword": "MyStrongPass1!",
  "newPassword": "MyEvenStrongerPass2!",
  "confirmPassword": "MyEvenStrongerPass2!"
}
```

### 1.6 Forgot / Reset Password

- `POST /auth/forgot-password` – `{ "email": "user@example.com" }`
- `POST /auth/reset-password` – `{ "token": "<reset-token>", "password": "..." , "confirmPassword": "..." }`

### 1.7 Email Verification

```json
POST /auth/verify-email
{
  "token": "<verification-token>"
}
```

---

## 2. Competitions & Public Data

### 2.1 List Competitions

```http
GET /competitions?page=1&limit=12&status=active&featured=true&search=volvo&priceMin=100&sort=drawDate:asc
```

**Response**

```json
{
  "success": true,
  "message": "Competitions retrieved successfully",
  "data": {
    "competitions": [
      {
        "_id": "6650d5a30b8e3ceb12f20701",
        "title": "Volvo XC40 D4 R-Design Pro",
        "shortDescription": "Win a fully-loaded Volvo XC40 in our latest luxury draw.",
        "description": "...",
        "prize": "Volvo XC40 D4 R-Design Pro",
        "prizeValue": 4500000,
        "cashAlternative": 4000000,
        "ticketPrice": 299,
        "maxTickets": 50000,
        "soldTickets": 15432,
        "status": "active",
        "question": {
          "question": "What do Volvo manufacture?",
          "options": ["Cars", "Motorcycles", "Boats"]
        },
        "drawDate": "2024-12-24T22:30:00.000Z",
        "category": "Luxury Cars",
        "featured": true,
        "isActive": true,
        "slug": "volvo-xc40-d4-r-design-pro",
        "images": [
          {
            "url": "https://cdn.example.com/competitions/volvo-1.jpg",
            "publicId": "competitions/volvo-1"
          }
        ],
        "progress": {
          "soldTickets": 15432,
          "maxTickets": 50000,
          "entriesRemaining": 34568,
          "percentage": 31
        },
        "createdAt": "2024-10-30T21:15:00.000Z",
        "updatedAt": "2024-11-09T11:02:00.000Z"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 12,
      "totalItems": 23,
      "totalPages": 2
    }
  }
}
```

**Supported query parameters**

| Name                   | Description                                            |
| ---------------------- | ------------------------------------------------------ |
| `page`, `limit`        | Pagination (default 1 / 12)                            |
| `status`               | `draft`, `active`, `drawing`, `completed`, `cancelled` |
| `category`             | Competition category                                   |
| `featured` / `active`  | `true` / `false`                                       |
| `search`               | Title/description/prize text search                    |
| `priceMin`, `priceMax` | Ticket price range                                     |
| `prizeMin`, `prizeMax` | Prize value range                                      |
| `from`, `to`           | Draw date range (ISO-8601)                             |
| `ids`                  | Comma-separated IDs                                    |
| `sort`                 | e.g. `sort=drawDate:asc`                               |

### 2.2 Get Competition Detail

```http
GET /competitions/6650d5a30b8e3ceb12f20701
```

- Public responses omit `question.correctAnswer`.
- Admin-authenticated requests include the correct answer automatically.

### 2.3 Progress Polling

```http
GET /competitions/6650d5a30b8e3ceb12f20701/progress
```

```json
{
  "success": true,
  "message": "Competition progress retrieved",
  "data": {
    "progress": {
      "soldTickets": 15432,
      "maxTickets": 50000,
      "entriesRemaining": 34568,
      "percentage": 31
    },
    "status": "active",
    "drawDate": "2024-12-24T22:30:00.000Z"
  }
}
```

### 2.4 Validate Skill Question

```json
POST /competitions/6650d5a30b8e3ceb12f20701/entries/validate-answer
{
  "answer": "Cars"
}
```

```json
{
  "success": true,
  "message": "Answer validated successfully",
  "data": {
    "isCorrect": true
  }
}
```

### 2.5 Featured Competitions

`GET /competitions/featured` returns up to 6 active featured competitions; same structure as list endpoint.

---

## 3. Draws, Champions, Reviews, Content

### 3.1 Draws

```http
GET /draws?page=1&limit=6&includeInactive=false
```

```json
{
  "success": true,
  "message": "Draws retrieved successfully",
  "data": {
    "draws": [
      {
        "_id": "6651188c0b8e3ceb12f20892",
        "competitionId": {
          "_id": "6650d5a30b8e3ceb12f20701",
          "title": "Volvo XC40 D4 R-Design Pro",
          "category": "Luxury Cars"
        },
        "winnerId": {
          "_id": "664fd4db0b8e3ceb12f20589",
          "firstName": "Imogen",
          "lastName": "Boyle",
          "email": "imogen@example.com"
        },
        "winnerName": "Imogen Boyle",
        "winnerLocation": "London",
        "competitionTitle": "Volvo XC40 D4 R-Design Pro",
        "prizeName": "Volvo XC40 D4 R-Design Pro",
        "prizeValue": 4500000,
        "totalTickets": 50000,
        "winningTicketNumber": 38765,
        "drawDate": "2024-12-24T22:30:00.000Z",
        "drawnAt": "2024-12-24T22:45:00.000Z",
        "imageUrl": "https://cdn.example.com/draws/volvo-win.jpg",
        "isActive": true,
        "createdAt": "2024-12-24T22:45:01.000Z",
        "updatedAt": "2024-12-24T22:45:01.000Z"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 6,
      "totalItems": 12,
      "totalPages": 2
    }
  }
}
```

Other endpoints:

- `GET /draws/:id` – returns populated competition & winner.
- `GET /draws/recent?limit=4` – latest public draws for homepage/winners carousel.
- Admin draw management: `/admin/draws` (GET, POST, PUT, DELETE) with payload:

```json
{
  "competitionId": "6650d5a30b8e3ceb12f20701",
  "winnerId": "664fd4db0b8e3ceb12f20589",
  "winnerName": "Imogen Boyle",
  "winnerLocation": "London",
  "totalTickets": 50000,
  "winningTicketNumber": 38765,
  "drawDate": "2024-12-24T22:30:00Z",
  "imageUrl": "https://cdn.example.com/draws/volvo-win.jpg",
  "publicId": "draws/volvo-win"
}
```

### 3.2 Champions

Public:

- `GET /champions` – paginated list with optional `page`, `limit`, `featured`, `search`.
- `GET /champions/featured` – highlight cards.
- `GET /champions/:id` – full detail.

Admin (`/admin/champions`) allows multipart creation/update:

```
POST /admin/champions
Content-Type: multipart/form-data

drawId=<draw_id>
testimonial=Winning feels amazing!
winnerName=Imogen Boyle
winnerLocation=London
prizeValue="£45,000"
featured=true
image=<file>
```

### 3.3 Reviews

```http
GET /reviews?page=1&limit=6&verified=true
```

Response:

```json
{
  "success": true,
  "message": "Reviews retrieved successfully",
  "data": {
    "reviews": [
      {
        "_id": "6651496f0b8e3ceb12f208f3",
        "title": "Amazing experience!",
        "body": "The whole process was seamless and I received my prize quickly.",
        "rating": 5,
        "reviewer": "Laura B.",
        "location": "Manchester",
        "verified": true,
        "timeAgo": "3 days ago",
        "createdAt": "2024-11-06T16:11:20.000Z"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 6,
      "totalItems": 42,
      "totalPages": 7
    }
  }
}
```

To accept new testimonials:

```json
POST /reviews
{
  "title": "Amazing experience!",
  "body": "The whole process was seamless and I received my prize quickly.",
  "rating": 5,
  "reviewer": "Laura B.",
  "location": "Manchester"
}
```

### 3.4 Content & Stats

- `GET /content/home` – returns homepage aggregates:

```json
{
  "success": true,
  "message": "Home content retrieved",
  "data": {
    "hero": {
      "image": "https://cdn.example.com/competitions/volvo-hero.jpg",
      "alt": "Volvo XC40 D4 R-Design Pro"
    },
    "competitions": [...],
    "champions": [...],
    "stats": [
      { "key": "competitions", "label": "Competitions", "value": "1.5K+", "description": "Total draws completed" },
      { "key": "draws", "label": "Winners", "value": "920+", "description": "Prizes awarded" }
    ],
    "recentDraws": [...],
    "reviews": [...]
  }
}
```

- `GET /content/pages/:slug` – placeholder response for static pages: `{ slug, title, body: null }`.

- `GET /stats/site` – returns either stored stats or computed fallbacks:

```json
{
  "success": true,
  "message": "Site stats retrieved",
  "data": {
    "stats": [
      {
        "key": "competitions",
        "label": "Competitions",
        "value": 1520,
        "formattedValue": "1.5K+",
        "description": "Total prize draws to date",
        "updatedAt": "2024-11-09T08:12:34.000Z"
      }
    ]
  }
}
```

### 3.5 Newsletter

- `POST /newsletter/subscribe` – `{ email, firstName?, lastName?, source? }`
- `POST /newsletter/unsubscribe` – `{ email }`
- `GET /newsletter/stats` (admin) – returns subscriber counts and recent signups.

---

## 4. Cart & Checkout

### 4.1 Cart Endpoints

| Method | Path                  | Notes                                             |
| ------ | --------------------- | ------------------------------------------------- |
| GET    | `/cart`               | Returns current cart                              |
| POST   | `/cart/items`         | Add or replace item `{ competitionId, quantity }` |
| PATCH  | `/cart/items/:itemId` | Update quantity                                   |
| DELETE | `/cart/items/:itemId` | Remove item                                       |
| DELETE | `/cart`               | Clear cart                                        |

**Sample response**

```json
{
  "success": true,
  "message": "Cart retrieved successfully",
  "data": {
    "id": "66514a860b8e3ceb12f20920",
    "currency": "GBP",
    "items": [
      {
        "id": "66514a860b8e3ceb12f20921",
        "competitionId": "6650d5a30b8e3ceb12f20701",
        "quantity": 5,
        "unitPrice": 299,
        "subtotal": 1495,
        "addedAt": "2024-11-09T12:20:54.000Z",
        "updatedAt": "2024-11-09T12:21:08.000Z",
        "competition": {
          "id": "6650d5a30b8e3ceb12f20701",
          "title": "Volvo XC40 D4 R-Design Pro",
          "slug": "volvo-xc40-d4-r-design-pro",
          "image": "https://cdn.example.com/competitions/volvo-1.jpg",
          "ticketPrice": 299,
          "maxTickets": 50000,
          "soldTickets": 15432,
          "status": "active",
          "isActive": true,
          "drawDate": "2024-12-24T22:30:00.000Z",
          "category": "Luxury Cars"
        }
      }
    ],
    "totals": {
      "items": 1,
      "subtotal": 1495,
      "totalTickets": 5
    },
    "updatedAt": "2024-11-09T12:21:08.000Z"
  }
}
```

Quantity is capped at 20 per competition; availability is checked on every mutation.

### 4.2 Checkout – Create Payment Intent

```json
POST /checkout/payment-intent
{
  "items": [
    { "competitionId": "6650d5a30b8e3ceb12f20701", "quantity": 5, "answer": "Cars" }
  ],
  "billingDetails": {
    "firstName": "Imogen",
    "lastName": "Boyle",
    "email": "imogen@example.com",
    "phone": "07123456789"
  },
  "billingAddress": {
    "line1": "221B Baker Street",
    "line2": "",
    "city": "London",
    "postalCode": "NW1 6XE",
    "country": "GB"
  },
  "orderId": "66514b480b8e3ceb12f20959"  // optional (re-using pending order)
}
```

**Response**

```json
{
  "success": true,
  "message": "Payment intent created",
  "data": {
    "order": {
      "id": "66514b480b8e3ceb12f20959",
      "orderNumber": "RCM7B5ZK5C7Q7I",
      "status": "pending",
      "paymentStatus": "pending",
      "subtotal": 1495,
      "total": 1495,
      "currency": "GBP",
      "items": [
        {
          "id": "66514b480b8e3ceb12f2095a",
          "competitionId": "6650d5a30b8e3ceb12f20701",
          "competitionTitle": "Volvo XC40 D4 R-Design Pro",
          "quantity": 5,
          "ticketPrice": 299,
          "total": 1495,
          "ticketNumbers": [],
          "answer": "Cars"
        }
      ],
      "billingDetails": {
        "firstName": "Imogen",
        "lastName": "Boyle",
        "email": "imogen@example.com",
        "phone": "07123456789"
      },
      "billingAddress": {
        "line1": "221B Baker Street",
        "line2": "",
        "city": "London",
        "postalCode": "NW1 6XE",
        "country": "GB"
      },
      "createdAt": "2024-11-09T12:21:30.000Z",
      "updatedAt": "2024-11-09T12:21:31.000Z"
    },
    "payment": {
      "clientSecret": "pi_3PjbeTAxk6k..._secret_Qp4t",
      "amount": 1495,
      "currency": "GBP"
    }
  }
}
```

### 4.3 Confirm Checkout

```json
POST /checkout/confirm
{
  "paymentIntentId": "pi_3PjbeTAxk6k2i1jF1rUEuXcD",
  "orderId": "66514b480b8e3ceb12f20959",
  "billingDetails": {
    "firstName": "Imogen",
    "lastName": "Boyle",
    "email": "imogen@example.com",
    "phone": "07123456789"
  },
  "billingAddress": {
    "line1": "221B Baker Street",
    "line2": "",
    "city": "London",
    "postalCode": "NW1 6XE",
    "country": "GB"
  },
  "shippingAddress": {
    "line1": "221B Baker Street",
    "line2": "",
    "city": "London",
    "postalCode": "NW1 6XE",
    "country": "GB"
  }
}
```

**Response**

```json
{
  "success": true,
  "message": "Order confirmed successfully",
  "data": {
    "order": {
      "id": "66514b480b8e3ceb12f20959",
      "orderNumber": "RCM7B5ZK5C7Q7I",
      "status": "completed",
      "paymentStatus": "paid",
      "subtotal": 1495,
      "total": 1495,
      "currency": "GBP",
      "paymentMethod": "card",
      "items": [
        {
          "id": "66514b480b8e3ceb12f2095a",
          "competitionId": "6650d5a30b8e3ceb12f20701",
          "competitionTitle": "Volvo XC40 D4 R-Design Pro",
          "quantity": 5,
          "ticketPrice": 299,
          "total": 1495,
          "ticketNumbers": [
            "RCM7B5ZK5C7QA8",
            "RCM7B5ZK5C7QA9",
            "RCM7B5ZK5C7QAA",
            "RCM7B5ZK5C7QAB",
            "RCM7B5ZK5C7QAC"
          ],
          "answer": "Cars"
        }
      ],
      "billingDetails": {
        "firstName": "Imogen",
        "lastName": "Boyle",
        "email": "imogen@example.com",
        "phone": "07123456789"
      },
      "billingAddress": {
        "line1": "221B Baker Street",
        "line2": "",
        "city": "London",
        "postalCode": "NW1 6XE",
        "country": "GB"
      },
      "shippingAddress": {
        "line1": "221B Baker Street",
        "line2": "",
        "city": "London",
        "postalCode": "NW1 6XE",
        "country": "GB"
      },
      "createdAt": "2024-11-09T12:21:30.000Z",
      "updatedAt": "2024-11-09T12:22:05.000Z"
    },
    "entries": [
      {
        "id": "66514b7e0b8e3ceb12f2096a",
        "competitionId": "6650d5a30b8e3ceb12f20701",
        "userId": "664fd4db0b8e3ceb12f20589",
        "ticketNumber": "RCM7B5ZK5C7QA8",
        "answer": "Cars",
        "isCorrect": true,
        "createdAt": "2024-11-09T12:22:05.000Z"
      }
    ]
  }
}
```

The cart is cleared automatically after confirmation.

---

## 5. Orders & Entries

### 5.1 Customer Orders

```http
GET /orders?page=1&limit=10&status=completed&paymentStatus=paid
```

```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": {
    "orders": [
      {
        "id": "66514b480b8e3ceb12f20959",
        "orderNumber": "RCM7B5ZK5C7Q7I",
        "status": "completed",
        "paymentStatus": "paid",
        "subtotal": 1495,
        "total": 1495,
        "currency": "GBP",
        "items": [
          {
            "id": "66514b480b8e3ceb12f2095a",
            "competitionId": "6650d5a30b8e3ceb12f20701",
            "competitionTitle": "Volvo XC40 D4 R-Design Pro",
            "quantity": 5,
            "ticketPrice": 299,
            "total": 1495,
            "ticketNumbers": [
              "RCM7B5ZK5C7QA8",
              "RCM7B5ZK5C7QA9",
              "RCM7B5ZK5C7QAA",
              "RCM7B5ZK5C7QAB",
              "RCM7B5ZK5C7QAC"
            ],
            "answer": "Cars"
          }
        ],
        "createdAt": "2024-11-09T12:21:30.000Z",
        "updatedAt": "2024-11-09T12:22:05.000Z"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalItems": 4,
      "totalPages": 1
    }
  }
}
```

Single order detail:

```http
GET /orders/66514b480b8e3ceb12f20959
```

Returns the same structure shown in confirmation.

### 5.2 Entries

```http
GET /users/me/entries?page=1&limit=20
```

```json
{
  "success": true,
  "message": "Entries retrieved successfully",
  "data": {
    "entries": [
      {
        "id": "66514b7e0b8e3ceb12f2096a",
        "competitionId": "6650d5a30b8e3ceb12f20701",
        "competitionTitle": "Volvo XC40 D4 R-Design Pro",
        "ticketNumber": "RCM7B5ZK5C7QA8",
        "answer": "Cars",
        "isCorrect": true,
        "createdAt": "2024-11-09T12:22:05.000Z"
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

## 6. Admin API (`/api/v1/admin`)

All admin routes require `protect` + `adminOnly`; some deletes require `superAdminOnly`.

### 6.1 Dashboard Summary

```http
GET /admin/dashboard/summary
```

```json
{
  "success": true,
  "message": "Dashboard summary retrieved",
  "data": {
    "competitions": { "total": 152, "active": 18 },
    "draws": { "total": 920 },
    "champions": { "total": 542, "featured": 24 },
    "users": { "total": 21045 },
    "revenue": {
      "amount": 12345678,
      "currency": "GBP",
      "formatted": "£123,456.78"
    },
    "recentActivity": [
      {
        "type": "draw_created",
        "description": "Draw completed for Volvo XC40 D4 R-Design Pro",
        "data": {
          "prizeName": "Volvo XC40 D4 R-Design Pro",
          "winnerName": "Imogen Boyle",
          "winnerLocation": "London"
        },
        "timestamp": "2024-12-24T22:45:01.000Z"
      },
      {
        "type": "order_paid",
        "description": "Order RCM7B5ZK5C7Q7I paid",
        "data": {
          "total": 1495,
          "currency": "GBP"
        },
        "timestamp": "2024-11-09T12:22:05.000Z"
      }
    ]
  }
}
```

### 6.2 Admin Competitions

| Method | Path                              | Notes                                               |
| ------ | --------------------------------- | --------------------------------------------------- |
| GET    | `/admin/competitions`             | Same filters as public but includes inactive/drafts |
| POST   | `/admin/competitions`             | Multipart (images) + JSON payload                   |
| GET    | `/admin/competitions/:id`         | Full editable payload                               |
| PUT    | `/admin/competitions/:id`         | Update competition                                  |
| PATCH  | `/admin/competitions/:id/status`  | `{ "status": "active" }`                            |
| GET    | `/admin/competitions/:id/entries` | Paginated entries for moderation                    |
| DELETE | `/admin/competitions/:id`         | Soft delete (super admin)                           |

Sample create payload:

```json
{
  "title": "£500 ASOS Voucher",
  "shortDescription": "Refresh your wardrobe with a £500 ASOS voucher!",
  "description": "...",
  "prize": "£500 ASOS Voucher",
  "prizeValue": 50000,
  "cashAlternative": 45000,
  "ticketPrice": 299,
  "maxTickets": 50000,
  "status": "active",
  "category": "Fashion & Watches",
  "featured": true,
  "question": {
    "question": "What do Dell manufacture?",
    "options": ["Computers", "Lawn Mowers", "Swimming Pools"],
    "correctAnswer": "Computers"
  },
  "startDate": "2024-11-01T00:00:00Z",
  "endDate": "2024-11-17T23:59:59Z",
  "drawDate": "2024-11-18T22:30:00Z"
}
```

### 6.3 Admin Draws & Champions

- `/admin/draws` – same payload as public create.
- `/admin/champions` – multipart forms with optional image updates.
- `/admin/orders` – paginated admin view identical to customer responses.
- `/admin/users` – search by name/email, filter by role/status; `PATCH /admin/users/:id` allows role, activation, and newsletter updates.

---

## 7. Router Map (`src/routes/index.ts`)

```
/auth
/users
/competitions
/draws
/champions
/orders
/payments
/newsletter
/upload
/cart
/checkout
/content
/reviews
/stats
/admin
```

Each router applies its own middleware (auth guards, upload handling, validation). Shared middleware (helmet, cors, express-mongo-sanitize, rate limiter) protects the entire API.

---

## 8. Data Models & Utilities

- **Competition** – supports slugs, advanced content fields, soft deletes (`deletedAt`), and helper methods (`getAvailableTickets`, `getSoldPercentage`).
- **Draw** – links competitions and winners, stores `prizeValue`, optional Cloudinary image refs.
- **Champion** – references `drawId`, `competitionId`, `winnerId`, stores Cloudinary image metadata.
- **Cart** – embedded items with unit price/subtotal; `getTotals()` returns summary.
- **Order** – includes `orderNumber`, `paymentStatus`, billing/shipping addresses, helper to calculate total tickets.
- **Entry** – per-ticket records referencing competition, order, and user.
- **Review** – stores testimonials, rating, optional `timeAgo` and `verified`.
- **SiteStat** – keyed counters used for marketing metrics.
- **Newsletter** – subscriber records with status tracking.
- **Payment** – Stripe metadata and status synchronisation.

Utility highlights:

- `ApiError` — consistent error representation with optional `errors` map.
- `ApiResponse` — consistent success/error envelopes.
- Validation middleware — strips unknown fields, returns 422 with field errors.
- Error handler — logs and normalises Mongoose/JWT errors.

---

## 9. Operational Notes

- **Authentication**: Axios must send requests with `withCredentials = true`; cookies hold session data.
- **Retries**: On `401`, call `/auth/refresh` once and retry the original request.
- **Caching**: Home content caches for 5 minutes (adjust in `content.controller.ts`). Bust cache after publishing new content.
- **Transactions**: Checkout confirmation relies on MongoDB transactions—use a replica set (MongoDB 4.0+).
- **Rate limiting**: `/api/v1` routes run behind shared rate limiter; adjust in `rateLimiter.middleware.ts` if required.
- **File uploads**: Cloudinary integration handles competition/champion imagery; ensure credentials are configured in environment variables.
- **Seed data**: `npm run seed:showcase` seeds competitions, draws and champions with showcase data (set `SEED_RESET=true` to clear existing records first).

---

This reference reflects the current backend implementation and fulfils the API contract described in the frontend integration guide. For additional examples or integration questions, refer to controller implementations under `src/controllers/` and schema definitions under `src/models/`.
