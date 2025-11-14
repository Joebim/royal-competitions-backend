# Draw Management API Endpoints

This document describes all available endpoints for managing draws and winners.

**Base URL:** `/api/v1`

---

## Public Endpoints (No Authentication Required)

### Get All Draws

Get all draws with pagination and filtering.

**Endpoint:** `GET /api/v1/draws`

**Authentication:** Not required (Public)

**Query Parameters:**

- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 10)
- `competitionId` (optional) - Filter by competition ID
- `drawMethod` (optional) - Filter by draw method: `automatic`, `admin_triggered`, `manual`

**Response:**

```json
{
  "success": true,
  "message": "Draws retrieved successfully",
  "data": {
    "draws": [
      {
        "id": "draw_id",
        "competitionId": "competition_id",
        "competition": {
          "_id": "competition_id",
          "title": "Luxury Car Giveaway",
          "shortDescription": "Win a luxury car",
          "description": "Full description of the competition",
          "prize": "Luxury Car",
          "prizeValue": 50000,
          "cashAlternative": 45000,
          "images": [
            {
              "url": "https://example.com/image.jpg",
              "publicId": "image_public_id",
              "thumbnail": "https://example.com/thumbnail.jpg"
            }
          ],
          "category": "Cars",
          "slug": "luxury-car-giveaway",
          "status": "drawn",
          "ticketPricePence": 500,
          "ticketLimit": 1000,
          "ticketsSold": 1000,
          "drawAt": "2024-01-15T10:00:00.000Z",
          "drawnAt": "2024-01-15T10:00:00.000Z",
          "startDate": "2024-01-01T00:00:00.000Z",
          "endDate": "2024-01-15T00:00:00.000Z",
          "featured": true,
          "tags": ["luxury", "car", "giveaway"]
        },
        "drawTime": "2024-01-15T10:00:00.000Z",
        "drawMethod": "automatic",
        "seed": "random_seed_string",
        "algorithm": "hmac-sha256-v1",
        "snapshotTicketCount": 1000,
        "result": [
          {
            "ticketNumber": 1001,
            "ticketId": "ticket_id",
            "userId": "user_id"
          }
        ],
        "initiatedBy": {
          "_id": "admin_user_id",
          "firstName": "Admin",
          "lastName": "User"
        },
        "notes": "Draw completed successfully",
        "evidenceUrl": "https://example.com/video.mp4",
        "liveUrl": "https://www.youtube.com/watch?v=example",
        "urlType": "youtube",
        "winnersCount": 1,
        "winners": [
          {
            "id": "winner_id",
            "ticketNumber": 1001,
            "prize": "Luxury Car",
            "claimed": false,
            "notified": true,
            "drawVideoUrl": "https://example.com/video.mp4",
            "user": {
              "firstName": "John",
              "lastName": "Doe"
            }
          }
        ],
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### Get Draw by ID

Get detailed information about a specific draw.

**Endpoint:** `GET /api/v1/draws/:id`

**Authentication:** Not required (Public)

**Parameters:**

- `id` (path) - Draw ID

**Response:**

```json
{
  "success": true,
  "message": "Draw retrieved successfully",
  "data": {
    "draw": {
      "id": "draw_id",
      "competitionId": "competition_id",
      "competition": {
        "_id": "competition_id",
        "title": "Luxury Car Giveaway",
        "shortDescription": "Win a luxury car",
        "description": "Full description of the competition",
        "prize": "Luxury Car",
        "prizeValue": 50000,
        "cashAlternative": 45000,
        "images": [
          {
            "url": "https://example.com/image.jpg",
            "publicId": "image_public_id",
            "thumbnail": "https://example.com/thumbnail.jpg"
          }
        ],
        "category": "Cars",
        "slug": "luxury-car-giveaway",
        "status": "drawn",
        "ticketPricePence": 500,
        "ticketLimit": 1000,
        "ticketsSold": 1000,
        "drawAt": "2024-01-15T10:00:00.000Z",
        "drawnAt": "2024-01-15T10:00:00.000Z",
        "startDate": "2024-01-01T00:00:00.000Z",
        "endDate": "2024-01-15T00:00:00.000Z",
        "featured": true,
        "tags": ["luxury", "car", "giveaway"]
      },
      "drawTime": "2024-01-15T10:00:00.000Z",
      "drawMethod": "automatic",
      "seed": "random_seed_string",
      "algorithm": "hmac-sha256-v1",
      "snapshotTicketCount": 1000,
      "snapshot": [
        {
          "ticketNumber": 1001,
          "ticketId": "ticket_id",
          "userId": "user_id"
        }
      ],
      "result": [
        {
          "ticketNumber": 1001,
          "ticketId": "ticket_id",
          "userId": "user_id"
        }
      ],
      "initiatedBy": {
        "_id": "admin_user_id",
        "firstName": "Admin",
        "lastName": "User",
        "email": "admin@example.com"
      },
      "notes": "Draw completed successfully",
      "evidenceUrl": "https://example.com/video.mp4",
      "liveUrl": "https://www.youtube.com/watch?v=example",
      "urlType": "youtube",
      "winners": [
        {
          "id": "winner_id",
          "ticketNumber": 1001,
          "prize": "Luxury Car",
          "claimed": false,
          "notified": true,
          "drawVideoUrl": "https://example.com/video.mp4",
          "user": {
            "firstName": "John",
            "lastName": "Doe",
            "email": "john@example.com"
          }
        }
      ],
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

---

### Verify Draw

Verify the integrity and fairness of a draw using its seed and snapshot.

**Endpoint:** `GET /api/v1/draws/:id/verify`

**Authentication:** Not required (Public)

**Parameters:**

- `id` (path) - Draw ID

**Response:**

```json
{
  "success": true,
  "message": "Draw verification completed",
  "data": {
    "draw": {
      "id": "draw_id",
      "competitionId": "competition_id",
      "method": "automatic",
      "seed": "random_seed_string",
      "snapshot": [...],
      "results": [...]
    },
    "verification": {
      "isValid": true,
      "snapshotMatches": true,
      "resultsMatch": true,
      "message": "Draw is valid and verifiable"
    }
  }
}
```

---

### Get Competition Draws

Get all draws for a specific competition.

**Endpoint:** `GET /api/v1/competitions/:id/draws`

**Authentication:** Not required (Public)

**Parameters:**

- `id` (path) - Competition ID

**Query Parameters:**

- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 10)

**Response:**

```json
{
  "success": true,
  "message": "Draws retrieved successfully",
  "data": {
    "draws": [
      {
        "id": "draw_id",
        "competitionId": "competition_id",
        "method": "automatic",
        "seed": "random_seed_string",
        "winnersCount": 1,
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalItems": 1,
      "totalPages": 1
    }
  }
}
```

---

## Admin Endpoints (Authentication Required)

### Get All Draws (Admin)

Get all draws in the system with pagination and filtering.

**Endpoint:** `GET /api/v1/admin/draws`

**Authentication:** Required (Admin or Super Admin)

**Query Parameters:**

- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 50)
- `competitionId` (optional) - Filter by competition ID
- `method` (optional) - Filter by draw method: `automatic`, `admin_triggered`, `manual`

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
          "id": "competition_id",
          "title": "Luxury Car Giveaway"
        },
        "method": "automatic",
        "seed": "random_seed_string",
        "winnersCount": 1,
        "createdBy": {
          "id": "admin_user_id",
          "firstName": "Admin",
          "lastName": "User"
        },
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 50,
      "totalItems": 25,
      "totalPages": 1
    }
  }
}
```

---

### Run Draw for Competition (Admin)

Manually trigger a draw for a competition. This creates winners based on random selection.

**Endpoint:** `POST /api/v1/admin/competitions/:id/run-draw`

**Authentication:** Required (Admin or Super Admin)

**Parameters:**

- `id` (path) - Competition ID

**Request Body:**

```json
{
  "numWinners": 1,
  "reserveWinners": 3,
  "notes": "Manual draw triggered by admin",
  "liveUrl": "https://www.youtube.com/watch?v=example",
  "urlType": "youtube"
}
```

**Request Body Fields:**

- `numWinners` (optional) - Number of primary winners (default: 1)
- `reserveWinners` (optional) - Number of reserve winners (default: 3)
- `notes` (optional) - Notes about the draw
- `liveUrl` (optional) - URL to watch the draw live (e.g., YouTube, Vimeo, custom URL)
- `urlType` (optional) - Type of URL to help frontend render correctly. Valid values: `youtube`, `vimeo`, `twitch`, `custom`, `other`

**Response:**

```json
{
  "success": true,
  "message": "Draw completed successfully",
  "data": {
    "draw": {
      "id": "draw_id",
      "competitionId": "competition_id",
      "method": "admin_triggered",
      "seed": "random_seed_string",
      "winnersCount": 4,
      "createdAt": "2024-01-15T10:00:00.000Z"
    },
    "winners": [
      {
        "id": "winner_id",
        "ticketNumber": 1001,
        "prize": "Luxury Car",
        "isPrimary": true,
        "user": {
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com"
        }
      },
      {
        "id": "winner_id_2",
        "ticketNumber": 2001,
        "prize": "Luxury Car",
        "isPrimary": false,
        "user": {
          "firstName": "Jane",
          "lastName": "Smith",
          "email": "jane@example.com"
        }
      }
    ]
  }
}
```

**Error Responses:**

- `400` - Competition already drawn, competition not in valid state
- `404` - Competition not found
- `401` - Not authorized
- `403` - Admin access required

**Notes:**

- Competition must be `closed` or `live` to run a draw
- If competition is `live`, it will be automatically closed before drawing
- Winners are selected randomly from active tickets
- Reserve winners are selected in case primary winners don't claim their prize

---

### Add Manual Winner (Admin)

Manually add a winner to a competition (for special cases or corrections).

**Endpoint:** `POST /api/v1/admin/competitions/:id/add-winner`

**Authentication:** Required (Admin or Super Admin)

**Parameters:**

- `id` (path) - Competition ID

**Request Body:**

```json
{
  "ticketNumber": 1001,
  "notes": "Manual winner entry - special circumstances",
  "evidenceUrl": "https://evidence-url.com/video.mp4",
  "liveUrl": "https://www.youtube.com/watch?v=example",
  "urlType": "youtube"
}
```

**Required Fields:**

- `ticketNumber` - Ticket number of the winner

**Optional Fields:**

- `notes` - Notes about why this is a manual winner
- `evidenceUrl` - URL to evidence/video of the draw
- `liveUrl` - URL to watch the draw live (e.g., YouTube, Vimeo, custom URL)
- `urlType` - Type of URL to help frontend render correctly. Valid values: `youtube`, `vimeo`, `twitch`, `custom`, `other`

**Response:**

```json
{
  "success": true,
  "message": "Manual winner added successfully",
  "data": {
    "draw": {
      "id": "draw_id",
      "competitionId": "competition_id",
      "method": "manual",
      "seed": "random_seed_string",
      "winnersCount": 1,
      "createdAt": "2024-01-15T10:00:00.000Z"
    },
    "winner": {
      "id": "winner_id",
      "ticketNumber": 1001,
      "prize": "Luxury Car",
      "claimCode": "ABCD-1234",
      "user": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "notified": true,
      "notifiedAt": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

**Error Responses:**

- `400` - Ticket number is required, ticket not found
- `404` - Competition not found, ticket not found
- `401` - Not authorized
- `403` - Admin access required

**Notes:**

- Creates a draw record with method "manual"
- Automatically notifies the winner via email/Klaviyo
- Competition status is updated to "drawn"

---

### Get Draw by ID (Admin)

Get detailed draw information (admin version with additional details).

**Endpoint:** `GET /api/v1/admin/draws/:id`

**Authentication:** Required (Admin or Super Admin)

**Parameters:**

- `id` (path) - Draw ID

**Response:**
Same as public `GET /api/v1/draws/:id` but may include additional admin-only information.

---

### Verify Draw (Admin)

Verify draw integrity (admin version).

**Endpoint:** `GET /api/v1/admin/draws/:id/verify`

**Authentication:** Required (Admin or Super Admin)

**Parameters:**

- `id` (path) - Draw ID

**Response:**
Same as public `GET /api/v1/draws/:id/verify`.

---

## Draw Methods

Draws can be created using different methods:

- **`automatic`** - Automatically triggered by system (e.g., when competition closes)
- **`admin_triggered`** - Manually triggered by admin using `runDraw` endpoint
- **`manual`** - Manually added winner using `addManualWinner` endpoint

---

## Draw Verification

All draws are verifiable using the `verify` endpoint. The verification process:

1. Checks that the snapshot matches the actual tickets at draw time
2. Verifies that results were generated from the seed and snapshot
3. Ensures draw integrity and fairness

This provides transparency and allows anyone to verify that draws were conducted fairly.

---

## Summary Table

| Endpoint                                  | Method | Description              | Auth Required | Role Required |
| ----------------------------------------- | ------ | ------------------------ | ------------- | ------------- |
| **Public Endpoints**                      |
| `GET /draws`                              | GET    | Get all draws            | No            | -             |
| `GET /draws/:id`                          | GET    | Get draw by ID           | No            | -             |
| `GET /draws/:id/verify`                   | GET    | Verify draw integrity    | No            | -             |
| `GET /competitions/:id/draws`             | GET    | Get competition draws    | No            | -             |
| **Admin Endpoints**                       |
| `GET /admin/draws`                        | GET    | Get all draws            | Yes           | Admin         |
| `POST /admin/competitions/:id/run-draw`   | POST   | Run draw for competition | Yes           | Admin         |
| `POST /admin/competitions/:id/add-winner` | POST   | Add manual winner        | Yes           | Admin         |
| `GET /admin/draws/:id`                    | GET    | Get draw by ID (admin)   | Yes           | Admin         |
| `GET /admin/draws/:id/verify`             | GET    | Verify draw (admin)      | Yes           | Admin         |

---

## Frontend Integration Examples

### Get All Draws

```javascript
const getAllDraws = async (page = 1, limit = 10, competitionId, drawMethod) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (competitionId) params.append('competitionId', competitionId);
  if (drawMethod) params.append('drawMethod', drawMethod);

  const response = await fetch(`/api/v1/draws?${params.toString()}`);
  const data = await response.json();
  return data.data;
};
```

### Get Draw Details

```javascript
const getDraw = async (drawId) => {
  const response = await fetch(`/api/v1/draws/${drawId}`, {
    headers: {
      Authorization: `Bearer ${token}`, // Optional for public endpoint
    },
  });
  const data = await response.json();
  return data.data.draw;
};
```

### Verify Draw

```javascript
const verifyDraw = async (drawId) => {
  const response = await fetch(`/api/v1/draws/${drawId}/verify`);
  const data = await response.json();
  return data.data.verification;
};
```

### Get Competition Draws

```javascript
const getCompetitionDraws = async (competitionId, page = 1) => {
  const response = await fetch(
    `/api/v1/competitions/${competitionId}/draws?page=${page}`
  );
  const data = await response.json();
  return data.data.draws;
};
```

### Run Draw (Admin)

```javascript
const runDraw = async (
  competitionId,
  numWinners = 1,
  reserveWinners = 3,
  liveUrl,
  urlType
) => {
  const response = await fetch(
    `/api/v1/admin/competitions/${competitionId}/run-draw`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        numWinners,
        reserveWinners,
        notes: 'Draw triggered by admin',
        liveUrl, // Optional: URL to watch draw live
        urlType, // Optional: 'youtube', 'vimeo', 'twitch', 'custom', 'other'
      }),
    }
  );
  const data = await response.json();
  return data.data;
};
```

### Add Manual Winner (Admin)

```javascript
const addManualWinner = async (
  competitionId,
  ticketNumber,
  notes,
  evidenceUrl,
  liveUrl,
  urlType
) => {
  const response = await fetch(
    `/api/v1/admin/competitions/${competitionId}/add-winner`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ticketNumber,
        notes,
        evidenceUrl,
        liveUrl, // Optional: URL to watch draw live
        urlType, // Optional: 'youtube', 'vimeo', 'twitch', 'custom', 'other'
      }),
    }
  );
  const data = await response.json();
  return data.data;
};
```

---

## Live Draw URL

Draws can include a live URL for watching the draw in real-time or viewing a recording. The `liveUrl` field accepts any valid URL (YouTube, Vimeo, Twitch, custom streaming platforms, etc.), and the `urlType` field helps the frontend determine how to render the URL:

- **`youtube`** - YouTube video or live stream URL
- **`vimeo`** - Vimeo video URL
- **`twitch`** - Twitch stream URL
- **`custom`** - Custom streaming platform or website
- **`other`** - Other video/streaming platforms

**Example Usage:**

```javascript
// YouTube live stream
{
  "liveUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "urlType": "youtube"
}

// Vimeo video
{
  "liveUrl": "https://vimeo.com/123456789",
  "urlType": "vimeo"
}

// Custom streaming platform
{
  "liveUrl": "https://custom-platform.com/stream/123",
  "urlType": "custom"
}
```

The frontend can use the `urlType` to:

- Embed YouTube/Vimeo videos using their respective embed APIs
- Display appropriate video players
- Show custom UI for different platforms
- Handle URL parsing and validation

## Important Notes

1. **Draw Transparency**: All draws are verifiable using the seed and snapshot, ensuring fairness and transparency.

2. **Automatic Draws**: Draws can be automatically triggered when competitions close (if configured).

3. **Reserve Winners**: When running a draw, you can specify reserve winners who will be contacted if primary winners don't claim their prize.

4. **Winner Notification**: Winners are automatically notified via email/Klaviyo when a draw is completed.

5. **Draw Methods**: The draw method is recorded for audit purposes (automatic, admin_triggered, or manual).

6. **Competition Status**: After a draw is completed, the competition status is updated to "drawn".

7. **Ticket Status**: Winning tickets are marked with status "winner".

8. **Verification**: Anyone can verify a draw's integrity using the verify endpoint, providing transparency to users.
