# Draw CRUD Operations API Documentation

## Overview

This documentation covers all CRUD (Create, Read, Update, Delete) operations for **Draws** in the Royal Competitions backend API. Draws represent completed competition draws with full audit trails, winner information, and draw execution data.

## Base URL

```
http://localhost:5000/api/v1
```

---

## 📋 Draw Model Schema

### Draw Fields

| Field                 | Type     | Required | Description                                        |
| --------------------- | -------- | -------- | -------------------------------------------------- |
| `_id`                 | ObjectId | Auto     | Draw unique identifier                             |
| `competitionId`       | ObjectId | ✅ Yes   | Reference to Competition                           |
| `drawTime`            | Date     | ✅ Yes   | When the draw occurred                             |
| `seed`                | String   | ✅ Yes   | Hex string seed for RNG (audit trail)              |
| `algorithm`           | String   | ✅ Yes   | Algorithm used (default: 'hmac-sha256-v1')         |
| `snapshotTicketCount` | Number   | ✅ Yes   | Number of tickets at snapshot time                 |
| `snapshotReference`   | String   | No       | Path/URL to snapshot file                          |
| `snapshot`            | Mixed    | No       | Embedded snapshot data (JSON)                      |
| `result`              | Array    | ✅ Yes   | Array of winners (primary + reserves)              |
| `drawMethod`          | Enum     | ✅ Yes   | `automatic`, `admin_triggered`, or `manual`        |
| `initiatedBy`         | ObjectId | No       | Admin who triggered (if admin_triggered)           |
| `notes`               | String   | No       | Manual entry notes                                 |
| `evidenceUrl`         | String   | No       | URL to draw video/evidence (for manual)            |
| `liveUrl`             | String   | No       | URL to watch the draw live (YouTube, Vimeo, etc.)  |
| `urlType`             | Enum     | No       | `youtube`, `vimeo`, `twitch`, `custom`, or `other` |
| `createdAt`           | Date     | Auto     | Creation timestamp                                 |
| `updatedAt`           | Date     | Auto     | Last update timestamp                              |

### Draw Result Structure

Each item in the `result` array contains:

```typescript
{
  ticketNumber: number;
  ticketId: ObjectId; // Reference to Ticket
  userId?: ObjectId;  // Reference to User (optional)
}
```

### Draw Methods

- **`automatic`** - Draw runs automatically when competition ends
- **`admin_triggered`** - Admin manually triggers the draw
- **`manual`** - Admin manually enters a winner (for special cases)

### URL Types

- **`youtube`** - YouTube video URL
- **`vimeo`** - Vimeo video URL
- **`twitch`** - Twitch stream URL
- **`custom`** - Custom video platform
- **`other`** - Other video platform

---

## 🔵 Public Endpoints

### 1. Get All Draws

**Endpoint:** `GET /draws`

**Access:** Public (No authentication required)

**Query Parameters:**

- `page` (optional, default: `1`) - Page number for pagination
- `limit` (optional, default: `10`) - Number of items per page
- `competitionId` (optional) - Filter by competition ID
- `drawMethod` (optional) - Filter by draw method: `automatic`, `admin_triggered`, or `manual`

**Example Request:**

```bash
GET http://localhost:5000/api/v1/draws?page=1&limit=10
GET http://localhost:5000/api/v1/draws?competitionId=507f1f77bcf86cd799439011
GET http://localhost:5000/api/v1/draws?drawMethod=automatic&page=1&limit=5
```

**Response:**

```json
{
  "success": true,
  "message": "Draws retrieved successfully",
  "data": {
    "draws": [
      {
        "id": "draw_id",
        "competitionId": {
          "_id": "competition_id",
          "title": "£500 ASOS Voucher",
          "shortDescription": "Win a £500 ASOS voucher",
          "description": "Full description...",
          "prize": "£500 ASOS Voucher",
          "prizeValue": "£500",
          "cashAlternative": "£400 cash",
          "images": [
            {
              "url": "https://res.cloudinary.com/.../image.jpg",
              "publicId": "royal-competitions/..."
            }
          ],
          "category": "Fashion & Watches",
          "slug": "500-asos-voucher",
          "status": "drawn",
          "ticketPricePence": 500,
          "ticketLimit": 2000,
          "ticketsSold": 1799,
          "drawAt": "2024-11-18T10:30:00.000Z",
          "drawnAt": "2024-11-18T10:30:15.000Z",
          "startDate": "2024-10-01T00:00:00.000Z",
          "endDate": "2024-11-18T10:30:00.000Z",
          "featured": true,
          "tags": ["fashion", "voucher"]
        },
        "competition": {
          "_id": "competition_id",
          "title": "£500 ASOS Voucher",
          "images": [...],
          "category": "Fashion & Watches",
          ...
        },
        "drawTime": "2024-11-18T10:30:15.000Z",
        "drawMethod": "automatic",
        "seed": "a1b2c3d4e5f6...",
        "algorithm": "hmac-sha256-v1",
        "snapshotTicketCount": 1799,
        "result": [
          {
            "ticketNumber": 1234,
            "ticketId": "ticket_id",
            "userId": "user_id"
          }
        ],
        "initiatedBy": {
          "_id": "admin_id",
          "firstName": "Admin",
          "lastName": "User"
        },
        "notes": "Draw completed automatically",
        "evidenceUrl": "https://example.com/draw-video.mp4",
        "liveUrl": "https://youtu.be/9tjYe__vGCw?si=kOhgSeEAvNvL9l3T",
        "urlType": "youtube",
        "winnersCount": 1,
        "winners": [
          {
            "id": "winner_id",
            "ticketNumber": 1234,
            "prize": "£500 ASOS Voucher",
            "claimed": false,
            "notified": true,
            "drawVideoUrl": "https://example.com/draw-video.mp4",
            "user": {
              "firstName": "John",
              "lastName": "Smith"
            }
          }
        ],
        "createdAt": "2024-11-18T10:30:15.000Z",
        "updatedAt": "2024-11-18T10:30:15.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

**Note:** The response includes full competition data (images, category, etc.) and all winners associated with each draw.

---

### 2. Get Single Draw

**Endpoint:** `GET /draws/:id`

**Access:** Public (No authentication required)

**Path Parameters:**

- `id` (required) - Draw ID

**Example Request:**

```bash
GET http://localhost:5000/api/v1/draws/507f1f77bcf86cd799439011
```

**Response:**

```json
{
  "success": true,
  "message": "Draw retrieved successfully",
  "data": {
    "draw": {
      "_id": "draw_id",
      "competitionId": {
        "_id": "competition_id",
        "title": "£500 ASOS Voucher",
        "prize": "£500 ASOS Voucher",
        "prizeValue": "£500"
      },
      "initiatedBy": {
        "_id": "admin_id",
        "firstName": "Admin",
        "lastName": "User",
        "email": "admin@example.com"
      },
      "drawTime": "2024-11-18T10:30:15.000Z",
      "seed": "a1b2c3d4e5f6...",
      "algorithm": "hmac-sha256-v1",
      "snapshotTicketCount": 1799,
      "snapshot": [
        {
          "ticketNumber": 1,
          "ticketId": "ticket_id_1",
          "userId": "user_id_1"
        },
        ...
      ],
      "result": [
        {
          "ticketNumber": 1234,
          "ticketId": "ticket_id",
          "userId": "user_id"
        }
      ],
      "drawMethod": "automatic",
      "notes": "Draw completed automatically",
      "evidenceUrl": "https://example.com/draw-video.mp4",
      "liveUrl": "https://youtu.be/9tjYe__vGCw?si=kOhgSeEAvNvL9l3T",
      "urlType": "youtube",
      "winners": [
        {
          "_id": "winner_id",
          "drawId": "draw_id",
          "competitionId": "competition_id",
          "ticketId": {
            "_id": "ticket_id",
            "ticketNumber": 1234
          },
          "userId": {
            "_id": "user_id",
            "firstName": "John",
            "lastName": "Smith",
            "email": "john@example.com"
          },
          "ticketNumber": 1234,
          "prize": "£500 ASOS Voucher",
          "notified": true,
          "claimed": false,
          "claimCode": "ABC123",
          "drawVideoUrl": "https://example.com/draw-video.mp4"
        }
      ],
      "audit": {
        "seed": "a1b2c3d4e5f6...",
        "algorithm": "hmac-sha256-v1",
        "snapshotTicketCount": 1799,
        "snapshot": [...],
        "result": [...]
      },
      "createdAt": "2024-11-18T10:30:15.000Z",
      "updatedAt": "2024-11-18T10:30:15.000Z"
    }
  }
}
```

**Note:** The single draw endpoint includes full audit information (seed, algorithm, snapshot) for transparency and verification purposes.

---

### 3. Verify Draw

**Endpoint:** `GET /draws/:id/verify`

**Access:** Public (No authentication required)

**Description:** Verifies the integrity of a draw by checking the seed, algorithm, and snapshot data.

**Path Parameters:**

- `id` (required) - Draw ID

**Example Request:**

```bash
GET http://localhost:5000/api/v1/draws/507f1f77bcf86cd799439011/verify
```

**Response:**

```json
{
  "success": true,
  "message": "Draw verification passed",
  "data": {
    "drawId": "507f1f77bcf86cd799439011",
    "isValid": true
  }
}
```

**Error Response (if verification fails):**

```json
{
  "success": true,
  "message": "Draw verification failed",
  "data": {
    "drawId": "507f1f77bcf86cd799439011",
    "isValid": false
  }
}
```

---

### 4. Get Competition Draws

**Endpoint:** `GET /competitions/:id/draws`

**Access:** Public (No authentication required)

**Description:** Get all draws for a specific competition.

**Path Parameters:**

- `id` (required) - Competition ID

**Example Request:**

```bash
GET http://localhost:5000/api/v1/competitions/507f1f77bcf86cd799439011/draws
```

**Response:**

```json
{
  "success": true,
  "message": "Draws retrieved successfully",
  "data": {
    "draws": [
      {
        "_id": "draw_id",
        "competitionId": "competition_id",
        "drawTime": "2024-11-18T10:30:15.000Z",
        "drawMethod": "automatic",
        "initiatedBy": {
          "_id": "admin_id",
          "firstName": "Admin",
          "lastName": "User"
        },
        "liveUrl": "https://youtu.be/9tjYe__vGCw?si=kOhgSeEAvNvL9l3T",
        "urlType": "youtube",
        ...
      }
    ],
    "winners": [
      {
        "_id": "winner_id",
        "drawId": "draw_id",
        "competitionId": "competition_id",
        "ticketNumber": 1234,
        "userId": {
          "_id": "user_id",
          "firstName": "John",
          "lastName": "Smith"
        },
        ...
      }
    ]
  }
}
```

---

## 🔐 Admin Endpoints

All admin endpoints require authentication via cookie-based authentication and admin privileges.

### 1. Get All Draws (Admin)

**Endpoint:** `GET /admin/draws`

**Access:** Private (Admin only)

**Authentication:** Required (cookie-based)

**Query Parameters:**

- `page` (optional, default: `1`) - Page number for pagination
- `limit` (optional, default: `10`) - Number of items per page
- `competitionId` (optional) - Filter by competition ID
- `drawMethod` (optional) - Filter by draw method: `automatic`, `admin_triggered`, or `manual`
- `search` (optional) - Search by competition title

**Example Request:**

```bash
GET http://localhost:5000/api/v1/admin/draws?page=1&limit=10
GET http://localhost:5000/api/v1/admin/draws?search=ASOS&drawMethod=automatic
```

**Response:**

```json
{
  "success": true,
  "message": "Draws retrieved successfully",
  "data": {
    "draws": [
      {
        "_id": "draw_id",
        "competitionId": {
          "_id": "competition_id",
          "title": "£500 ASOS Voucher",
          "prize": "£500 ASOS Voucher",
          "prizeValue": "£500"
        },
        "initiatedBy": {
          "_id": "admin_id",
          "firstName": "Admin",
          "lastName": "User",
          "email": "admin@example.com"
        },
        "drawTime": "2024-11-18T10:30:15.000Z",
        "drawMethod": "automatic",
        "seed": "a1b2c3d4e5f6...",
        "algorithm": "hmac-sha256-v1",
        "snapshotTicketCount": 1799,
        "result": [...],
        "notes": "Draw completed automatically",
        "evidenceUrl": "https://example.com/draw-video.mp4",
        "liveUrl": "https://youtu.be/9tjYe__vGCw?si=kOhgSeEAvNvL9l3T",
        "urlType": "youtube",
        "winners": [
          {
            "_id": "winner_id",
            "drawId": "draw_id",
            "competitionId": "competition_id",
            "ticketId": {
              "_id": "ticket_id",
              "ticketNumber": 1234
            },
            "userId": {
              "_id": "user_id",
              "firstName": "John",
              "lastName": "Smith",
              "email": "john@example.com"
            },
            "ticketNumber": 1234,
            "prize": "£500 ASOS Voucher",
            "notified": true,
            "claimed": false,
            "claimCode": "ABC123"
          }
        ],
        "winnerCount": 1,
        "createdAt": "2024-11-18T10:30:15.000Z",
        "updatedAt": "2024-11-18T10:30:15.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### 2. Get Single Draw (Admin)

**Endpoint:** `GET /admin/draws/:id`

**Access:** Private (Admin only)

**Authentication:** Required (cookie-based)

**Path Parameters:**

- `id` (required) - Draw ID

**Example Request:**

```bash
GET http://localhost:5000/api/v1/admin/draws/507f1f77bcf86cd799439011
```

**Response:** Same as public `GET /draws/:id` endpoint.

---

### 3. Verify Draw (Admin)

**Endpoint:** `GET /admin/draws/:id/verify`

**Access:** Private (Admin only)

**Authentication:** Required (cookie-based)

**Path Parameters:**

- `id` (required) - Draw ID

**Example Request:**

```bash
GET http://localhost:5000/api/v1/admin/draws/507f1f77bcf86cd799439011/verify
```

**Response:** Same as public `GET /draws/:id/verify` endpoint.

---

### 4. Run Draw (Admin-Triggered)

**Endpoint:** `POST /admin/competitions/:id/run-draw`

**Access:** Private (Admin only)

**Authentication:** Required (cookie-based)

**Description:** Manually trigger a draw for a competition. This creates a draw record, selects winners, and updates the competition status.

**Path Parameters:**

- `id` (required) - Competition ID

**Request Body:**

```json
{
  "numWinners": 1,
  "reserveWinners": 3,
  "liveUrl": "https://youtu.be/9tjYe__vGCw?si=kOhgSeEAvNvL9l3T",
  "urlType": "youtube",
  "notes": "Optional notes about the draw"
}
```

**Required Fields:**

- None (all fields are optional with defaults)

**Optional Fields:**

- `numWinners` (default: `1`) - Number of primary winners
- `reserveWinners` (default: `3`) - Number of reserve winners
- `liveUrl` - URL to watch the draw live (YouTube, Vimeo, etc.)
- `urlType` - Type of URL: `youtube`, `vimeo`, `twitch`, `custom`, or `other`
- `notes` - Optional notes about the draw

**Example Request:**

```bash
POST http://localhost:5000/api/v1/admin/competitions/507f1f77bcf86cd799439011/run-draw
Content-Type: application/json
Cookie: authToken=your_token_here

{
  "numWinners": 1,
  "reserveWinners": 3,
  "liveUrl": "https://youtu.be/9tjYe__vGCw?si=kOhgSeEAvNvL9l3T",
  "urlType": "youtube",
  "notes": "Draw completed via admin panel"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Draw completed successfully",
  "data": {
    "draw": {
      "id": "draw_id",
      "competitionId": "competition_id",
      "drawTime": "2024-11-18T10:30:15.000Z",
      "seed": "a1b2c3d4e5f6...",
      "algorithm": "hmac-sha256-v1",
      "snapshotTicketCount": 1799,
      "result": [
        {
          "ticketNumber": 1234,
          "ticketId": "ticket_id",
          "userId": "user_id"
        }
      ],
      "winners": [
        {
          "id": "winner_id",
          "ticketNumber": 1234,
          "claimCode": "ABC123",
          "notified": true
        }
      ]
    }
  }
}
```

**Notes:**

- This endpoint automatically closes the competition if it's still `live`
- Primary winners are automatically notified via email
- The competition status is updated to `drawn`
- Draws are created with full audit trail (seed, algorithm, snapshot)
- Uses MongoDB transactions to ensure data consistency

**Error Responses:**

**400 Bad Request - Competition already drawn:**

```json
{
  "success": false,
  "message": "Competition has already been drawn"
}
```

**400 Bad Request - Competition not ready:**

```json
{
  "success": false,
  "message": "Competition must be closed or live to draw"
}
```

---

### 5. Add Manual Winner

**Endpoint:** `POST /admin/competitions/:id/add-winner`

**Access:** Private (Admin only)

**Authentication:** Required (cookie-based)

**Description:** Manually enter a winner for a competition. This creates a manual draw record with a single winner.

**Path Parameters:**

- `id` (required) - Competition ID

**Request Body:**

```json
{
  "ticketNumber": 1234,
  "notes": "Manual winner entry",
  "evidenceUrl": "https://example.com/draw-video.mp4",
  "liveUrl": "https://youtu.be/9tjYe__vGCw?si=kOhgSeEAvNvL9l3T",
  "urlType": "youtube"
}
```

**Required Fields:**

- `ticketNumber` - The winning ticket number

**Optional Fields:**

- `notes` - Notes about the manual entry
- `evidenceUrl` - URL to draw video/evidence
- `liveUrl` - URL to watch the draw live
- `urlType` - Type of URL: `youtube`, `vimeo`, `twitch`, `custom`, or `other`

**Example Request:**

```bash
POST http://localhost:5000/api/v1/admin/competitions/507f1f77bcf86cd799439011/add-winner
Content-Type: application/json
Cookie: authToken=your_token_here

{
  "ticketNumber": 1234,
  "notes": "Winner selected manually from live draw",
  "evidenceUrl": "https://example.com/draw-video.mp4",
  "liveUrl": "https://youtu.be/9tjYe__vGCw?si=kOhgSeEAvNvL9l3T",
  "urlType": "youtube"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Manual winner added successfully",
  "data": {
    "draw": {
      "id": "draw_id",
      "competitionId": "competition_id",
      "drawTime": "2024-11-18T10:30:15.000Z",
      "drawMethod": "manual",
      "result": [
        {
          "ticketNumber": 1234,
          "ticketId": "ticket_id",
          "userId": "user_id"
        }
      ]
    },
    "winner": {
      "id": "winner_id",
      "ticketNumber": 1234,
      "claimCode": "ABC123"
    }
  }
}
```

**Notes:**

- This creates a manual draw record with a single winner
- The winner is automatically notified if they have an email
- The competition status is updated to `drawn`
- Uses MongoDB transactions to ensure data consistency

**Error Responses:**

**404 Not Found - Ticket not found:**

```json
{
  "success": false,
  "message": "Ticket not found"
}
```

**400 Bad Request - Missing ticket number:**

```json
{
  "success": false,
  "message": "Ticket number is required"
}
```

---

## 🔄 Draw Creation Flow

Draws are created through three methods:

### 1. Automatic Draws

- Triggered automatically when a competition ends (if `drawMode: 'automatic'`)
- No admin action required
- Creates 1 primary winner + 3 reserve winners
- No `liveUrl` or `urlType` (set to `undefined`)

### 2. Admin-Triggered Draws

- Admin manually triggers via `POST /admin/competitions/:id/run-draw`
- Can specify number of primary and reserve winners
- Can include `liveUrl` and `urlType`
- Competition must be `closed` or `live`

### 3. Manual Winner Entry

- Admin manually enters a winner via `POST /admin/competitions/:id/add-winner`
- Used for special cases (e.g., external draws)
- Requires `ticketNumber`
- Can include `evidenceUrl`, `liveUrl`, and `urlType`

---

## 📊 Data Relationships

### Draw Relationships:

- **competitionId** → Competition (one-to-many: one competition can have multiple draws)
- **initiatedBy** → User (one-to-one: admin who triggered the draw)
- **result** → Array of winners (one-to-many: primary + reserves)
- **winners** → Winner records (one-to-many: linked via `drawId`)

### Population:

All endpoints automatically populate related documents:

- **Draws** populate:
  - `competitionId` - Full competition data (title, images, category, etc.)
  - `initiatedBy` - Admin user who triggered the draw
  - `winners` - All winner records with user and ticket data

---

## 🔍 Filtering & Search

### Public Endpoints:

- Filter by `competitionId` - Get all draws for a specific competition
- Filter by `drawMethod` - Filter by draw method: `automatic`, `admin_triggered`, or `manual`

### Admin Endpoints:

- Filter by `competitionId` - Get all draws for a specific competition
- Filter by `drawMethod` - Filter by draw method
- Search by `search` - Searches competition title

---

## 🔐 Authentication

All admin endpoints require authentication via cookie-based authentication.

### How to Authenticate

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

### Frontend Example (Axios):

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
  withCredentials: true, // Important: Include cookies
});

// Run a draw
const runDraw = async (competitionId: string, drawData: any) => {
  const response = await api.post(
    `/admin/competitions/${competitionId}/run-draw`,
    drawData
  );
  return response.data;
};

// Add manual winner
const addManualWinner = async (
  competitionId: string,
  ticketNumber: number,
  options?: any
) => {
  const response = await api.post(
    `/admin/competitions/${competitionId}/add-winner`,
    {
      ticketNumber,
      notes: options?.notes,
      evidenceUrl: options?.evidenceUrl,
      liveUrl: options?.liveUrl,
      urlType: options?.urlType,
    }
  );
  return response.data;
};
```

---

## 📝 Error Handling

### Common Error Responses

**400 Bad Request:**

```json
{
  "success": false,
  "message": "Competition has already been drawn"
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
  "message": "Draw not found"
}
```

---

## 🧪 Testing Examples

### JavaScript/TypeScript Examples

**Get all draws:**

```typescript
const getDraws = async (page = 1, limit = 10) => {
  const response = await fetch(
    `http://localhost:5000/api/v1/draws?page=${page}&limit=${limit}`,
    {
      credentials: 'include',
    }
  );
  const data = await response.json();
  return data;
};
```

**Get single draw:**

```typescript
const getDraw = async (drawId: string) => {
  const response = await fetch(`http://localhost:5000/api/v1/draws/${drawId}`, {
    credentials: 'include',
  });
  const data = await response.json();
  return data;
};
```

**Run a draw (Admin):**

```typescript
const runDraw = async (competitionId: string, drawData: any) => {
  const response = await fetch(
    `http://localhost:5000/api/v1/admin/competitions/${competitionId}/run-draw`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        numWinners: 1,
        reserveWinners: 3,
        liveUrl: drawData.liveUrl,
        urlType: drawData.urlType,
        notes: drawData.notes,
      }),
    }
  );
  return await response.json();
};
```

**Add manual winner (Admin):**

```typescript
const addManualWinner = async (
  competitionId: string,
  ticketNumber: number,
  options?: any
) => {
  const response = await fetch(
    `http://localhost:5000/api/v1/admin/competitions/${competitionId}/add-winner`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        ticketNumber,
        notes: options?.notes,
        evidenceUrl: options?.evidenceUrl,
        liveUrl: options?.liveUrl,
        urlType: options?.urlType,
      }),
    }
  );
  return await response.json();
};
```

**Verify draw:**

```typescript
const verifyDraw = async (drawId: string) => {
  const response = await fetch(
    `http://localhost:5000/api/v1/draws/${drawId}/verify`,
    {
      credentials: 'include',
    }
  );
  const data = await response.json();
  return data;
};
```

---

## ⚡ Performance Tips

1. **Use pagination** - Always paginate list endpoints to improve performance
2. **Use specific endpoints** - Use `/competitions/:id/draws` to get draws for a specific competition
3. **Filter by drawMethod** - Filter draws by method when needed
4. **Full competition data** - Draw endpoints return full competition data including images, so no need for separate competition API calls

---

## 🔒 Security & Audit Trail

### Audit Information

Every draw includes full audit information:

- **Seed** - Cryptographic seed used for random number generation
- **Algorithm** - Algorithm used (e.g., 'hmac-sha256-v1')
- **Snapshot** - Complete snapshot of all tickets at draw time
- **Snapshot Ticket Count** - Total number of tickets at snapshot time
- **Result** - Array of winning tickets

### Verification

Use the `/draws/:id/verify` endpoint to verify the integrity of any draw. This ensures:

- The seed matches the result
- The algorithm was applied correctly
- The snapshot is valid
- The result is reproducible

---

## 📚 Additional Resources

- **Swagger Documentation:** `http://localhost:5000/api-docs`
- **Draws & Champions API:** See `API_DOCS_DRAWS_CHAMPIONS.md` for related endpoints
- **Competition API:** See competition endpoints documentation

---

## 🆘 Support

If you encounter issues:

1. Check authentication - Ensure you're logged in as admin for admin endpoints
2. Verify input data - Check required fields and validation rules
3. Review error messages - They provide specific information about what went wrong
4. Check Swagger docs - Interactive API documentation at `/api-docs`

For additional help, contact the backend team or check the server logs.
