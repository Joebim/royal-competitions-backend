# Winner CRUD Operations API Documentation

## Overview

This documentation covers all CRUD (Create, Read, Update, Delete) operations for **Winners** in the Royal Competitions backend API. Winners represent users who have won competitions through the draw process.

## Base URL

```
http://localhost:5000/api/v1
```

---

## 📋 Winner Model Schema

### Winner Fields

| Field                  | Type     | Required | Description                                          |
| ---------------------- | -------- | -------- | ---------------------------------------------------- |
| `_id`                  | ObjectId | Auto     | Winner unique identifier                             |
| `drawId`               | ObjectId | ✅ Yes   | Reference to Draw                                    |
| `competitionId`        | ObjectId | ✅ Yes   | Reference to Competition                             |
| `ticketId`             | ObjectId | ✅ Yes   | Reference to Ticket (unique)                         |
| `userId`               | ObjectId | No       | Reference to User (winner)                           |
| `ticketNumber`         | Number   | ✅ Yes   | The winning ticket number                            |
| `prize`                | String   | ✅ Yes   | Prize name/description                               |
| `notified`             | Boolean  | ✅ Yes   | Whether winner has been notified (default: false)    |
| `notifiedAt`           | Date     | No       | Timestamp when winner was notified                   |
| `claimed`              | Boolean  | ✅ Yes   | Whether prize has been claimed (default: false)      |
| `claimedAt`            | Date     | No       | Timestamp when prize was claimed                     |
| `claimCode`            | String   | ✅ Yes   | Unique code for winner verification (auto-generated) |
| `proofImageUrl`        | String   | No       | URL to winner proof image                            |
| `drawVideoUrl`         | String   | No       | URL to draw video                                    |
| `testimonial`          | Object   | No       | Winner testimonial object                            |
| `testimonial.text`     | String   | No       | Testimonial text                                     |
| `testimonial.rating`   | Number   | No       | Rating (1-5)                                         |
| `testimonial.approved` | Boolean  | No       | Whether testimonial is approved (default: false)     |
| `createdAt`            | Date     | Auto     | Creation timestamp                                   |
| `updatedAt`            | Date     | Auto     | Last update timestamp                                |

### Claim Code Format

Claim codes are automatically generated in the format: `ABCD-1234`

- 4 uppercase letters/numbers (excluding I, O, 0, 1)
- Hyphen separator
- 4 uppercase letters/numbers

### Indexes

- `competitionId` + `createdAt` (compound index)
- `userId` (single index)
- `notified` + `claimed` (compound index)
- `ticketId` (unique index)
- `claimCode` (unique index)

---

## 🔵 Public Endpoints

### 1. Get All Winners

**Endpoint:** `GET /winners`

**Access:** Public (No authentication required)

**Query Parameters:**

- `page` (optional, default: `1`) - Page number for pagination
- `limit` (optional, default: `20`) - Number of items per page
- `competitionId` (optional) - Filter by competition ID

**Example Request:**

```bash
GET http://localhost:5000/api/v1/winners?page=1&limit=20
GET http://localhost:5000/api/v1/winners?competitionId=507f1f77bcf86cd799439011
```

**Response:**

```json
{
  "success": true,
  "message": "Winners retrieved successfully",
  "data": {
    "winners": [
      {
        "id": "winner_id",
        "competition": {
          "id": "competition_id",
          "title": "£500 ASOS Voucher",
          "prize": "£500 ASOS Voucher",
          "images": [
            {
              "url": "https://res.cloudinary.com/.../image.jpg",
              "publicId": "royal-competitions/..."
            }
          ]
        },
        "ticketNumber": 1234,
        "claimCode": "ABCD-1234",
        "drawTime": "2024-11-18T10:30:15.000Z",
        "drawMethod": "automatic",
        "proofImageUrl": "https://example.com/proof.jpg",
        "drawVideoUrl": "https://example.com/draw-video.mp4",
        "notified": true,
        "claimed": false,
        "createdAt": "2024-11-18T10:30:15.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 50,
      "totalPages": 3
    }
  }
}
```

**Note:** The public endpoint returns formatted data without sensitive user information.

---

### 2. Get Single Winner

**Endpoint:** `GET /winners/:id`

**Access:** Public (No authentication required)

**Path Parameters:**

- `id` (required) - Winner ID

**Example Request:**

```bash
GET http://localhost:5000/api/v1/winners/507f1f77bcf86cd799439011
```

**Response:**

```json
{
  "success": true,
  "message": "Winner retrieved successfully",
  "data": {
    "winner": {
      "_id": "winner_id",
      "drawId": {
        "_id": "draw_id",
        "drawTime": "2024-11-18T10:30:15.000Z",
        "drawMethod": "automatic",
        "seed": "a1b2c3d4e5f6...",
        "algorithm": "hmac-sha256-v1",
        "snapshotTicketCount": 1799
      },
      "competitionId": {
        "_id": "competition_id",
        "title": "£500 ASOS Voucher",
        "prize": "£500 ASOS Voucher",
        "prizeValue": "£500",
        "images": [
          {
            "url": "https://res.cloudinary.com/.../image.jpg",
            "publicId": "royal-competitions/..."
          }
        ]
      },
      "userId": {
        "_id": "user_id",
        "firstName": "John",
        "lastName": "Smith",
        "email": "john@example.com"
      },
      "ticketId": {
        "_id": "ticket_id",
        "ticketNumber": 1234
      },
      "ticketNumber": 1234,
      "prize": "£500 ASOS Voucher",
      "notified": true,
      "notifiedAt": "2024-11-18T10:30:20.000Z",
      "claimed": false,
      "claimedAt": null,
      "claimCode": "ABCD-1234",
      "proofImageUrl": "https://example.com/proof.jpg",
      "drawVideoUrl": "https://example.com/draw-video.mp4",
      "testimonial": {
        "text": "Amazing experience!",
        "rating": 5,
        "approved": true
      },
      "createdAt": "2024-11-18T10:30:15.000Z",
      "updatedAt": "2024-11-18T10:30:15.000Z"
    }
  }
}
```

**Note:** The single winner endpoint includes full details with populated relationships.

---

### 3. Get Competition Winners

**Endpoint:** `GET /competitions/:id/winners`

**Access:** Public (No authentication required)

**Description:** Get all winners for a specific competition, including draw information.

**Path Parameters:**

- `id` (required) - Competition ID

**Example Request:**

```bash
GET http://localhost:5000/api/v1/competitions/507f1f77bcf86cd799439011/winners
```

**Response:**

```json
{
  "success": true,
  "message": "Winners retrieved successfully",
  "data": {
    "competition": {
      "id": "competition_id",
      "title": "£500 ASOS Voucher",
      "prize": "£500 ASOS Voucher",
      "prizeValue": "£500",
      "drawnAt": "2024-11-18T10:30:15.000Z"
    },
    "draw": {
      "id": "draw_id",
      "drawTime": "2024-11-18T10:30:15.000Z",
      "drawMethod": "automatic",
      "algorithm": "hmac-sha256-v1",
      "snapshotTicketCount": 1799,
      "evidenceUrl": "https://example.com/draw-video.mp4"
    },
    "winners": [
      {
        "id": "winner_id",
        "ticketNumber": 1234,
        "claimCode": "ABCD-1234",
        "notified": true,
        "claimed": false,
        "proofImageUrl": "https://example.com/proof.jpg",
        "drawVideoUrl": "https://example.com/draw-video.mp4",
        "testimonial": {
          "text": "Amazing experience!",
          "rating": 5,
          "approved": true
        },
        "user": {
          "firstName": "John",
          "lastName": "Smith",
          "email": "john@example.com"
        },
        "createdAt": "2024-11-18T10:30:15.000Z"
      }
    ]
  }
}
```

**Note:** Winners are sorted by creation date (primary winner first).

---

## 🔐 Admin Endpoints

> **Note:** Admin-specific CRUD endpoints for winners are not yet implemented. Currently, winners are managed through:
>
> - **Draw operations** - Winners are automatically created when draws are executed
> - **Manual winner entry** - Via `POST /admin/competitions/:id/add-winner` (see Draw API documentation)
>
> The following admin endpoints are planned but not yet available:
>
> - `GET /admin/winners` - Get all winners with admin filters
> - `PUT /admin/winners/:id` - Update winner details
> - `DELETE /admin/winners/:id` - Delete winner record
>
> For now, use the public endpoints or manage winners through draw operations.

---

## 🎯 Winner Creation

Winners are **not created directly** through a dedicated endpoint. Instead, they are automatically created when:

1. **Admin-triggered draw** - Via `POST /admin/competitions/:id/run-draw`
2. **Manual winner entry** - Via `POST /admin/competitions/:id/add-winner`
3. **Automatic draw** - When competition ends (if `drawMode: 'automatic'`)

### Winner Creation Flow

When a draw is executed:

1. Draw record is created
2. Winning tickets are identified
3. Winner records are automatically created for each winning ticket
4. Tickets are marked as `WINNER` status
5. Primary winners are automatically notified via email
6. Claim codes are auto-generated

---

## 📊 Data Relationships

### Winner Relationships:

- **drawId** → Draw (many-to-one: multiple winners can belong to one draw)
- **competitionId** → Competition (many-to-one: multiple winners per competition)
- **ticketId** → Ticket (one-to-one: unique constraint)
- **userId** → User (many-to-one: user can have multiple wins)

### Population:

All endpoints automatically populate related documents:

- **Winners** populate:
  - `drawId` - Draw information (drawTime, drawMethod, seed, algorithm)
  - `competitionId` - Competition details (title, prize, images, prizeValue)
  - `userId` - User information (firstName, lastName, email)
  - `ticketId` - Ticket information (ticketNumber)

---

## 🔍 Filtering & Search

### Public Endpoints:

- Filter by `competitionId` - Get all winners for a specific competition

### Future Admin Endpoints (Planned):

- Filter by `competitionId` - Get all winners for a specific competition
- Filter by `userId` - Get all wins for a specific user
- Filter by `notified` - Filter by notification status
- Filter by `claimed` - Filter by claim status
- Search by `search` - Searches claim code or ticket number

---

## 🔐 Authentication

> **Note:** Currently, all winner endpoints are public. Admin endpoints for winner management are planned but not yet implemented.

### Public Endpoints

Public endpoints do not require authentication. Simply make requests without any authentication headers or cookies.

### Future Admin Endpoints

When admin endpoints are implemented, they will require cookie-based authentication:

1. **Login first:**

```bash
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}
```

2. **Cookies are automatically set** - No need to manually handle tokens

3. **Make authenticated requests:**
   - Cookies are automatically sent with requests when using `credentials: 'include'` or `withCredentials: true`
   - No `Authorization` header needed

---

## 📝 Error Handling

### Common Error Responses

**400 Bad Request:**

```json
{
  "success": false,
  "message": "Invalid testimonial rating"
}
```

**401 Unauthorized:**

```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

**403 Forbidden:**

```json
{
  "success": false,
  "message": "Admin access required"
}
```

**404 Not Found:**

```json
{
  "success": false,
  "message": "Winner not found"
}
```

---

## 🧪 Testing Examples

### JavaScript/TypeScript Examples

**Get all winners (public):**

```typescript
const getWinners = async (page = 1, limit = 20) => {
  const response = await fetch(
    `http://localhost:5000/api/v1/winners?page=${page}&limit=${limit}`,
    {
      credentials: 'include',
    }
  );
  const data = await response.json();
  return data;
};
```

**Get single winner:**

```typescript
const getWinner = async (winnerId: string) => {
  const response = await fetch(
    `http://localhost:5000/api/v1/winners/${winnerId}`,
    {
      credentials: 'include',
    }
  );
  const data = await response.json();
  return data;
};
```

**Get competition winners:**

```typescript
const getCompetitionWinners = async (competitionId: string) => {
  const response = await fetch(
    `http://localhost:5000/api/v1/competitions/${competitionId}/winners`,
    {
      credentials: 'include',
    }
  );
  const data = await response.json();
  return data;
};
```

**Note:** Admin update and delete endpoints are not yet implemented. Winners are currently managed through draw operations.

---

## ⚡ Performance Tips

1. **Use pagination** - Always paginate list endpoints to improve performance
2. **Use specific endpoints** - Use `/competitions/:id/winners` to get winners for a specific competition
3. **Filter by status** - Filter by `notified` or `claimed` status when needed
4. **Indexes** - Winner queries are optimized with indexes on `competitionId`, `userId`, `notified`, and `claimed`

---

## 🔒 Security & Claim Codes

### Claim Code System

- **Auto-generated** - Claim codes are automatically generated when winners are created
- **Unique** - Each claim code is unique across all winners
- **Format** - `ABCD-1234` (4 chars, hyphen, 4 chars)
- **Purpose** - Used for winner verification and prize claiming

### Winner Notification

- Winners are automatically notified via email when created (for primary winners)
- `notified` flag tracks notification status
- `notifiedAt` timestamp records when notification was sent

### Prize Claiming

- `claimed` flag tracks if prize has been claimed
- `claimedAt` timestamp records when prize was claimed
- Claim codes can be used to verify winners before prize delivery

---

## 📚 Additional Resources

- **Swagger Documentation:** `http://localhost:5000/api-docs`
- **Draw API:** See `DRAW_CRUD_API.md` for draw operations
- **Competition API:** See competition endpoints documentation

---

## 🆘 Support

If you encounter issues:

1. Check authentication - Ensure you're logged in as admin for admin endpoints
2. Verify input data - Check required fields and validation rules
3. Review error messages - They provide specific information about what went wrong
4. Check Swagger docs - Interactive API documentation at `/api-docs`

For additional help, contact the backend team or check the server logs.
