# Draws, Winners & Tickets API Documentation

## Overview

This comprehensive documentation covers all API endpoints for **Draws**, **Winners**, and **Tickets** in the Royal Competitions backend API. These three entities are closely related and form the core of the competition draw system.

**Base URL:** `/api/v1`

---

## Table of Contents

1. [Entity Relationships](#entity-relationships)
2. [Draws API](#draws-api)
3. [Winners API](#winners-api)
4. [Tickets API](#tickets-api)
5. [Recent API Changes](#recent-api-changes)
6. [Error Handling](#error-handling)
7. [Code Examples](#code-examples)

---

## Entity Relationships

### Relationship Map

```
Competition
    |
    | 1-to-many
    v
Ticket (user entries)
    |
    | grouped for a draw
    v
Draw (automatic or admin-triggered)
    |
    | selects
    v
Winner (belongs to user + competition + ticket)
```

### Key Relationships

- **Competition → Tickets**: One competition has many tickets
- **Tickets → Draw**: Draw contains pool of tickets in `result` array
- **Draw → Winner**: Draw selects winner(s) from tickets
- **Winner → User**: Winner belongs to a user (optional for guest entries)
- **Winner → Ticket**: Winner is linked to specific winning ticket
- **Winner → Competition**: Winner belongs to a competition
- **Winner → Draw**: Winner is created from a draw event

---

## Draws API

### Draw Model Schema

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

---

### Public Draw Endpoints

#### 1. Get All Draws

**Endpoint:** `GET /draws`

**Access:** Public (No authentication required)

**Query Parameters:**

- `page` (optional, default: `1`) - Page number for pagination
- `limit` (optional, default: `10`) - Number of items per page
- `competitionId` (optional) - Filter by competition ID
- `drawMethod` (optional) - Filter by draw method: `automatic`, `admin_triggered`, or `manual`

**Example Request:**

```bash
GET /api/v1/draws?page=1&limit=10
GET /api/v1/draws?competitionId=507f1f77bcf86cd799439011
GET /api/v1/draws?drawMethod=automatic&page=1&limit=5
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
          "id": "competition_id",
          "title": "£500 ASOS Voucher",
          "prize": "£500 ASOS Voucher",
          "prizeValue": 500
        },
        "drawTime": "2025-11-15T14:30:00.000Z",
        "drawMethod": "admin_triggered",
        "result": [
          {
            "ticketNumber": 1234,
            "ticketId": "ticket_id",
            "userId": "user_id"
          }
        ],
        "liveUrl": "https://youtu.be/9tjYe__vGCw",
        "urlType": "youtube",
        "evidenceUrl": "https://example.com/draw-video.mp4",
        "snapshotTicketCount": 5000,
        "createdAt": "2025-11-15T14:30:00.000Z"
      }
    ],
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

#### 2. Get Single Draw

**Endpoint:** `GET /draws/:id`

**Access:** Public (No authentication required)

**Example Request:**

```bash
GET /api/v1/draws/507f1f77bcf86cd799439011
```

**Response:**

```json
{
  "success": true,
  "message": "Draw retrieved successfully",
  "data": {
    "draw": {
      "id": "draw_id",
      "competitionId": {
        "id": "competition_id",
        "title": "£500 ASOS Voucher",
        "prize": "£500 ASOS Voucher",
        "prizeValue": 500
      },
      "drawTime": "2025-11-15T14:30:00.000Z",
      "seed": "a1b2c3d4e5f6...",
      "algorithm": "hmac-sha256-v1",
      "snapshotTicketCount": 5000,
      "result": [
        {
          "ticketNumber": 1234,
          "ticketId": "ticket_id",
          "userId": "user_id"
        }
      ],
      "drawMethod": "admin_triggered",
      "initiatedBy": {
        "id": "admin_id",
        "firstName": "Admin",
        "lastName": "User",
        "email": "admin@example.com"
      },
      "notes": "Draw performed manually",
      "evidenceUrl": "https://example.com/draw-video.mp4",
      "liveUrl": "https://youtu.be/9tjYe__vGCw",
      "urlType": "youtube",
      "winners": [
        {
          "id": "winner_id",
          "userId": {
            "firstName": "John",
            "lastName": "Doe",
            "email": "john@example.com"
          },
          "ticketId": {
            "ticketNumber": 1234
          },
          "ticketNumber": 1234,
          "prize": "£500 ASOS Voucher",
          "prizeValue": 500,
          "verified": true,
          "publicAnnouncement": "Congratulations to John Doe!",
          "notified": true,
          "claimed": false
        }
      ],
      "audit": {
        "createdAt": "2025-11-15T14:30:00.000Z",
        "updatedAt": "2025-11-15T14:30:00.000Z"
      },
      "createdAt": "2025-11-15T14:30:00.000Z",
      "updatedAt": "2025-11-15T14:30:00.000Z"
    }
  }
}
```

---

#### 3. Verify Draw

**Endpoint:** `GET /draws/:id/verify`

**Access:** Public (No authentication required)

**Description:** Verifies the integrity of a draw by re-running the draw algorithm with the stored seed.

**Example Request:**

```bash
GET /api/v1/draws/507f1f77bcf86cd799439011/verify
```

**Response:**

```json
{
  "success": true,
  "message": "Draw verified successfully",
  "data": {
    "verified": true,
    "matches": true,
    "drawId": "draw_id",
    "verificationDetails": {
      "seed": "a1b2c3d4e5f6...",
      "algorithm": "hmac-sha256-v1",
      "snapshotTicketCount": 5000,
      "recomputedResult": [
        {
          "ticketNumber": 1234,
          "ticketId": "ticket_id"
        }
      ],
      "originalResult": [
        {
          "ticketNumber": 1234,
          "ticketId": "ticket_id"
        }
      ]
    }
  }
}
```

---

### Admin Draw Endpoints

#### 1. Get All Draws (Admin)

**Endpoint:** `GET /admin/draws`

**Access:** Private/Admin

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Query Parameters:**

- `page` (optional, default: `1`)
- `limit` (optional, default: `20`)
- `competitionId` (optional)
- `drawMethod` (optional)
- `search` (optional) - Search by competition title

**Example Request:**

```bash
GET /api/v1/admin/draws?page=1&limit=20
Authorization: Bearer <admin_token>
```

**Response:** Same structure as public endpoint but includes all draws regardless of status.

---

#### 2. Get Single Draw (Admin)

**Endpoint:** `GET /admin/draws/:id`

**Access:** Private/Admin

**Response:** Same as public endpoint but may include additional admin-only fields.

---

#### 3. Run Draw (Admin-Triggered)

**Endpoint:** `POST /admin/competitions/:id/run-draw`

**Access:** Private/Admin

**Description:** Manually trigger a draw for a competition. This creates a draw record and winner(s).

**Request Body:**

```json
{
  "numWinners": 1,
  "reserveWinners": 3,
  "notes": "Draw performed manually by admin",
  "liveUrl": "https://youtu.be/9tjYe__vGCw",
  "urlType": "youtube"
}
```

**Fields:**

- `numWinners` (optional, default: `1`) - Number of primary winners
- `reserveWinners` (optional, default: `3`) - Number of reserve winners
- `notes` (optional) - Notes about the draw
- `liveUrl` (optional) - URL to watch the draw live
- `urlType` (optional) - Type of URL: `youtube`, `vimeo`, `twitch`, `custom`, `other`

**Response:**

```json
{
  "success": true,
  "message": "Draw completed successfully",
  "data": {
    "draw": {
      "id": "draw_id",
      "competitionId": "competition_id",
      "drawTime": "2025-11-15T14:30:00.000Z",
      "seed": "a1b2c3d4e5f6...",
      "numWinners": 1,
      "reserveWinners": 3,
      "winners": [
        {
          "id": "winner_id",
          "ticketNumber": 1234,
          "userId": "user_id",
          "isPrimary": true
        }
      ]
    }
  }
}
```

**What Happens:**

1. Fetches all active tickets for the competition
2. Generates random seed
3. Selects winner(s) using deterministic algorithm
4. Creates Draw record
5. Creates Winner record(s)
6. Marks tickets as `WINNER` status
7. Updates competition status to `DRAWN`
8. Sends notifications to winners
9. Creates event logs

---

#### 4. Add Manual Winner

**Endpoint:** `POST /admin/competitions/:id/add-winner`

**Access:** Private/Admin

**Description:** Manually add a winner for a competition (for external draws, live events, etc.).

**Request Body:**

```json
{
  "ticketNumber": 1234,
  "notes": "Winner selected at live event",
  "evidenceUrl": "https://example.com/draw-video.mp4",
  "liveUrl": "https://youtu.be/9tjYe__vGCw",
  "urlType": "youtube"
}
```

**Fields:**

- `ticketNumber` (required) - The winning ticket number
- `notes` (optional) - Notes about the manual entry
- `evidenceUrl` (optional) - URL to draw video/evidence
- `liveUrl` (optional) - URL to watch the draw live
- `urlType` (optional) - Type of URL

**Response:**

```json
{
  "success": true,
  "message": "Manual winner added successfully",
  "data": {
    "draw": {
      "id": "draw_id",
      "competitionId": "competition_id",
      "drawMethod": "manual",
      "drawTime": "2025-11-15T14:30:00.000Z"
    },
    "winner": {
      "id": "winner_id",
      "ticketNumber": 1234,
      "prize": "£500 ASOS Voucher",
      "prizeValue": 500,
      "claimCode": "ABCD-1234"
    }
  }
}
```

---

#### 5. Update Draw

**Endpoint:** `PUT /admin/draws/:id`

**Access:** Private/Admin

**Description:** Update draw details (draw time, notes, evidence URL, live URL, URL type).

**Request Body:**

```json
{
  "drawTime": "2025-11-15T14:30:00.000Z",
  "notes": "Updated notes",
  "evidenceUrl": "https://example.com/new-video.mp4",
  "liveUrl": "https://youtu.be/new-video",
  "urlType": "youtube"
}
```

**Fields:**

- `drawTime` (optional) - When the draw occurred
- `notes` (optional) - Notes about the draw
- `evidenceUrl` (optional) - URL to draw video/evidence
- `liveUrl` (optional) - URL to watch the draw live
- `urlType` (optional) - Type of URL: `youtube`, `vimeo`, `twitch`, `custom`, `other`

**Response:**

```json
{
  "success": true,
  "message": "Draw updated successfully",
  "data": {
    "draw": {
      "id": "draw_id",
      "drawTime": "2025-11-15T14:30:00.000Z",
      "notes": "Updated notes",
      "evidenceUrl": "https://example.com/new-video.mp4",
      "liveUrl": "https://youtu.be/new-video",
      "urlType": "youtube",
      "winners": [/* ... */],
      "audit": {/* ... */}
    }
  }
}
```

---

#### 6. Verify Draw (Admin)

**Endpoint:** `GET /admin/draws/:id/verify`

**Access:** Private/Admin

**Description:** Same as public verify endpoint but with additional admin context.

---

## Winners API

### Winner Model Schema

| Field                  | Type     | Required | Description                                          |
| ---------------------- | -------- | -------- | ---------------------------------------------------- |
| `_id`                  | ObjectId | Auto     | Winner unique identifier                             |
| `drawId`               | ObjectId | ✅ Yes   | Reference to Draw                                    |
| `competitionId`        | ObjectId | ✅ Yes   | Reference to Competition                             |
| `ticketId`             | ObjectId | ✅ Yes   | Reference to Ticket (unique)                         |
| `userId`               | ObjectId | No       | Reference to User (winner)                           |
| `ticketNumber`         | Number   | ✅ Yes   | The winning ticket number                            |
| `prize`                | String   | ✅ Yes   | Prize name/description                               |
| `prizeValue`           | Number   | No       | Prize value for display (✅ **NEW**)                 |
| `notified`             | Boolean  | ✅ Yes   | Whether winner has been notified (default: false)    |
| `notifiedAt`           | Date     | No       | Timestamp when winner was notified                   |
| `claimed`              | Boolean  | ✅ Yes   | Whether prize has been claimed (default: false)      |
| `claimedAt`            | Date     | No       | Timestamp when prize was claimed                     |
| `claimCode`            | String   | ✅ Yes   | Unique code for winner verification (auto-generated)  |
| `verified`             | Boolean  | ✅ Yes   | Verification status (✅ **NEW**, default: false)      |
| `verifiedAt`           | Date     | No       | When winner was verified (✅ **NEW**)                |
| `publicAnnouncement`   | String   | No       | Public announcement text (✅ **NEW**, max 500 chars)  |
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

---

### Public Winner Endpoints

#### 1. Get All Winners

**Endpoint:** `GET /winners`

**Access:** Public (No authentication required)

**Query Parameters:**

- `page` (optional, default: `1`) - Page number for pagination
- `limit` (optional, default: `20`) - Number of items per page
- `competitionId` (optional) - Filter by competition ID

**Example Request:**

```bash
GET /api/v1/winners?page=1&limit=20
GET /api/v1/winners?competitionId=507f1f77bcf86cd799439011
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
          "prizeValue": 500,
          "images": [
            {
              "url": "https://res.cloudinary.com/.../image.jpg",
              "publicId": "royal-competitions/..."
            }
          ]
        },
        "ticketNumber": 1234,
        "prize": "£500 ASOS Voucher",
        "prizeValue": 500,
        "claimCode": "ABCD-1234",
        "drawTime": "2025-11-15T14:30:00.000Z",
        "drawMethod": "admin_triggered",
        "verified": true,
        "publicAnnouncement": "Congratulations to our winner!",
        "proofImageUrl": "https://example.com/proof.jpg",
        "drawVideoUrl": "https://youtu.be/draw-video",
        "notified": true,
        "claimed": false,
        "createdAt": "2025-11-15T14:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 150,
      "totalPages": 8
    }
  }
}
```

---

#### 2. Get Winner by ID

**Endpoint:** `GET /winners/:id`

**Access:** Public (No authentication required)

**Example Request:**

```bash
GET /api/v1/winners/507f1f77bcf86cd799439011
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
        "drawTime": "2025-11-15T14:30:00.000Z",
        "drawMethod": "admin_triggered",
        "seed": "a1b2c3d4e5f6...",
        "algorithm": "hmac-sha256-v1",
        "snapshotTicketCount": 5000
      },
      "competitionId": {
        "_id": "competition_id",
        "title": "£500 ASOS Voucher",
        "prize": "£500 ASOS Voucher",
        "prizeValue": 500,
        "images": [/* ... */]
      },
      "userId": {
        "_id": "user_id",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "ticketId": {
        "_id": "ticket_id",
        "ticketNumber": 1234
      },
      "ticketNumber": 1234,
      "prize": "£500 ASOS Voucher",
      "prizeValue": 500,
      "notified": true,
      "notifiedAt": "2025-11-15T14:35:00.000Z",
      "claimed": false,
      "claimCode": "ABCD-1234",
      "verified": true,
      "verifiedAt": "2025-11-15T14:40:00.000Z",
      "publicAnnouncement": "Congratulations to John Doe!",
      "proofImageUrl": "https://example.com/proof.jpg",
      "drawVideoUrl": "https://youtu.be/draw-video",
      "testimonial": {
        "text": "Amazing experience!",
        "rating": 5,
        "approved": true
      },
      "createdAt": "2025-11-15T14:30:00.000Z",
      "updatedAt": "2025-11-15T14:40:00.000Z"
    }
  }
}
```

---

#### 3. Get Competition Winners

**Endpoint:** `GET /competitions/:id/winners`

**Access:** Public (No authentication required)

**Example Request:**

```bash
GET /api/v1/competitions/507f1f77bcf86cd799439011/winners
```

**Response:**

```json
{
  "success": true,
  "message": "Competition winners retrieved successfully",
  "data": {
    "competition": {
      "id": "competition_id",
      "title": "£500 ASOS Voucher",
      "status": "drawn"
    },
    "draw": {
      "id": "draw_id",
      "drawTime": "2025-11-15T14:30:00.000Z",
      "drawMethod": "admin_triggered",
      "evidenceUrl": "https://example.com/draw-video.mp4"
    },
    "winners": [
      {
        "id": "winner_id",
        "userId": {
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com"
        },
        "ticketId": {
          "ticketNumber": 1234
        },
        "ticketNumber": 1234,
        "prize": "£500 ASOS Voucher",
        "prizeValue": 500,
        "verified": true,
        "publicAnnouncement": "Congratulations!",
        "notified": true,
        "claimed": false,
        "createdAt": "2025-11-15T14:30:00.000Z"
      }
    ]
  }
}
```

---

### Admin Winner Endpoints

#### 1. Get All Winners (Admin)

**Endpoint:** `GET /admin/winners`

**Access:** Private/Admin

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Query Parameters:**

- `page` (optional, default: `1`)
- `limit` (optional, default: `20`)
- `competitionId` (optional)
- `notified` (optional) - Filter by notification status
- `claimed` (optional) - Filter by claim status
- `verified` (optional) - Filter by verification status (✅ **NEW**)
- `search` (optional) - Search by ticket number, claim code, or user name

**Example Request:**

```bash
GET /api/v1/admin/winners?page=1&limit=20&verified=true
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "success": true,
  "message": "Winners retrieved successfully",
  "data": {
    "winners": [
      {
        "_id": "winner_id",
        "drawId": "draw_id",
        "competitionId": {
          "_id": "competition_id",
          "title": "£500 ASOS Voucher"
        },
        "userId": {
          "_id": "user_id",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com"
        },
        "ticketId": "ticket_id",
        "ticketNumber": 1234,
        "prize": "£500 ASOS Voucher",
        "prizeValue": 500,
        "notified": true,
        "notifiedAt": "2025-11-15T14:35:00.000Z",
        "claimed": false,
        "claimCode": "ABCD-1234",
        "verified": true,
        "verifiedAt": "2025-11-15T14:40:00.000Z",
        "publicAnnouncement": "Congratulations to John Doe!",
        "proofImageUrl": "https://example.com/proof.jpg",
        "drawVideoUrl": "https://youtu.be/draw-video",
        "testimonial": {
          "text": "Amazing experience!",
          "rating": 5,
          "approved": true
        },
        "createdAt": "2025-11-15T14:30:00.000Z",
        "updatedAt": "2025-11-15T14:40:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 150,
      "totalPages": 8
    }
  }
}
```

---

#### 2. Get Winner by ID (Admin)

**Endpoint:** `GET /admin/winners/:id`

**Access:** Private/Admin

**Response:** Same structure as public endpoint but includes all fields.

---

#### 3. Update Winner (Admin)

**Endpoint:** `PUT /admin/winners/:id`

**Access:** Private/Admin

**Description:** Update winner details including notification status, claim status, verification, and public announcement.

**Request Body:**

```json
{
  "notified": true,
  "notifiedAt": "2025-11-15T14:35:00.000Z",
  "claimed": true,
  "claimedAt": "2025-11-15T15:00:00.000Z",
  "verified": true,
  "verifiedAt": "2025-11-15T14:40:00.000Z",
  "publicAnnouncement": "Congratulations to our winner!",
  "prizeValue": 500,
  "proofImageUrl": "https://example.com/proof.jpg",
  "drawVideoUrl": "https://youtu.be/draw-video",
  "testimonial": {
    "text": "Amazing experience!",
    "rating": 5,
    "approved": true
  }
}
```

**Fields:**

- `notified` (optional) - Whether winner has been notified
- `notifiedAt` (optional) - Timestamp when notified
- `claimed` (optional) - Whether prize has been claimed
- `claimedAt` (optional) - Timestamp when claimed
- `verified` (optional) - Verification status (✅ **NEW**)
- `verifiedAt` (optional) - When winner was verified (✅ **NEW**)
- `publicAnnouncement` (optional) - Public announcement text (✅ **NEW**, max 500 chars)
- `prizeValue` (optional) - Prize value for display (✅ **NEW**)
- `proofImageUrl` (optional) - URL to winner proof image
- `drawVideoUrl` (optional) - URL to draw video
- `testimonial` (optional) - Testimonial object

**Response:**

```json
{
  "success": true,
  "message": "Winner updated successfully",
  "data": {
    "winner": {
      "_id": "winner_id",
      "notified": true,
      "claimed": true,
      "verified": true,
      "publicAnnouncement": "Congratulations to our winner!",
      "prizeValue": 500,
      /* ... other fields ... */
    }
  }
}
```

---

#### 4. Delete Winner (Admin)

**Endpoint:** `DELETE /admin/winners/:id`

**Access:** Private/Admin

**Description:** Soft delete a winner record. This should be used carefully as it affects the draw audit trail.

**Response:**

```json
{
  "success": true,
  "message": "Winner deleted successfully",
  "data": null
}
```

---

## Tickets API

### Ticket Model Schema

| Field           | Type     | Required | Description                                    |
| --------------- | -------- | -------- | ---------------------------------------------- |
| `_id`            | ObjectId | Auto     | Ticket unique identifier                       |
| `competitionId`  | ObjectId | ✅ Yes   | Reference to Competition                       |
| `ticketNumber`   | Number   | ✅ Yes   | Sequential ticket number (unique per competition) |
| `userId`         | ObjectId | No       | Reference to User (optional for guest entries) |
| `orderId`        | ObjectId | No       | Reference to Order                             |
| `status`         | Enum     | ✅ Yes   | `reserved`, `active`, `cancelled`, `winner`, `refunded`, `invalid` |
| `reservedUntil`  | Date     | No       | Expiration time for reserved tickets (TTL)     |
| `createdAt`      | Date     | Auto     | Creation timestamp                             |
| `updatedAt`      | Date     | Auto     | Last update timestamp                          |

### Ticket Statuses

- **`reserved`** - Ticket is reserved but not yet purchased (expires after 15 minutes)
- **`active`** - Ticket is active and part of the draw pool
- **`cancelled`** - Ticket was cancelled
- **`winner`** - Ticket won the competition (✅ **NEW** - set automatically after draw)
- **`refunded`** - Ticket was refunded
- **`invalid`** - Ticket is invalid (✅ **NEW**)

---

### Public Ticket Endpoints

#### 1. Hold/Reserve Tickets

**Endpoint:** `POST /competitions/:id/hold`

**Access:** Private (Authentication required)

**Description:** Reserve tickets for a competition before purchase. Tickets are reserved for 15 minutes.

**Request Body:**

```json
{
  "qty": 5
}
```

**Fields:**

- `qty` (required) - Number of tickets to reserve (min: 1)

**Response:**

```json
{
  "success": true,
  "message": "Tickets reserved successfully",
  "data": {
    "reservationId": "res_1699876543210_abc123",
    "reservedTickets": [1, 2, 3, 4, 5],
    "reservedUntil": "2025-11-15T14:45:00.000Z",
    "costPence": 500,
    "costGBP": "5.00",
    "competition": {
      "id": "competition_id",
      "title": "£500 ASOS Voucher",
      "ticketPricePence": 100,
      "remainingTickets": 4995
    }
  }
}
```

**Notes:**

- Tickets are automatically released after 15 minutes if not purchased
- Reservation prevents other users from reserving the same tickets
- Use the `reservedTickets` array when creating the order

---

#### 2. Get Competition Entry List

**Endpoint:** `GET /competitions/:id/entry-list`

**Access:** Public (No authentication required)

**Description:** Get list of all entries (tickets) for a competition. User information is anonymized for non-admin users.

**Query Parameters:**

- `anonymize` (optional, default: `true`) - Set to `false` to show user details (admin only)

**Example Request:**

```bash
GET /api/v1/competitions/507f1f77bcf86cd799439011/entry-list
GET /api/v1/competitions/507f1f77bcf86cd799439011/entry-list?anonymize=false
```

**Response (Public - Anonymized):**

```json
{
  "success": true,
  "message": "Entry list retrieved successfully",
  "data": {
    "competition": {
      "id": "competition_id",
      "title": "£500 ASOS Voucher",
      "totalTickets": 5000
    },
    "entries": [
      {
        "ticketNumber": 1,
        "createdAt": "2025-11-15T10:00:00.000Z"
      },
      {
        "ticketNumber": 2,
        "createdAt": "2025-11-15T10:01:00.000Z"
      }
    ]
  }
}
```

**Response (Admin - Not Anonymized):**

```json
{
  "success": true,
  "message": "Entry list retrieved successfully",
  "data": {
    "competition": {
      "id": "competition_id",
      "title": "£500 ASOS Voucher",
      "totalTickets": 5000
    },
    "entries": [
      {
        "ticketNumber": 1,
        "user": {
          "name": "John Doe",
          "email": "john@example.com"
        },
        "createdAt": "2025-11-15T10:00:00.000Z"
      }
    ]
  }
}
```

---

### Admin Ticket Endpoints

#### 1. Get Competition Tickets (Admin)

**Endpoint:** `GET /admin/competitions/:id/tickets`

**Access:** Private/Admin

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Query Parameters:**

- `page` (optional, default: `1`)
- `limit` (optional, default: `50`)
- `status` (optional) - Filter by status: `reserved`, `active`, `cancelled`, `winner`, `refunded`, `invalid`

**Example Request:**

```bash
GET /api/v1/admin/competitions/507f1f77bcf86cd799439011/tickets?page=1&limit=50&status=active
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "success": true,
  "message": "Tickets retrieved successfully",
  "data": {
    "tickets": [
      {
        "_id": "ticket_id",
        "competitionId": "competition_id",
        "ticketNumber": 1234,
        "userId": {
          "_id": "user_id",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com",
          "phone": "+44123456789"
        },
        "orderId": {
          "_id": "order_id",
          "paymentStatus": "paid"
        },
        "status": "active",
        "createdAt": "2025-11-15T10:00:00.000Z",
        "updatedAt": "2025-11-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "totalItems": 5000,
      "totalPages": 100
    }
  }
}
```

---

#### 2. Get User Tickets

**Endpoint:** `GET /users/:id/tickets`

**Access:** Private (Users can view their own tickets, admins can view any user's tickets)

**Headers:**

```
Authorization: Bearer <token>
```

**Query Parameters:**

- `competitionId` (optional) - Filter by competition ID

**Example Request:**

```bash
GET /api/v1/users/507f1f77bcf86cd799439011/tickets?competitionId=competition_id
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "message": "Tickets retrieved successfully",
  "data": {
    "tickets": [
      {
        "competition": {
          "id": "competition_id",
          "title": "£500 ASOS Voucher",
          "prize": "£500 ASOS Voucher",
          "images": [/* ... */],
          "drawAt": "2025-11-20T14:00:00.000Z",
          "status": "live"
        },
        "tickets": [
          {
            "id": "ticket_id",
            "ticketNumber": 1234,
            "status": "active",
            "createdAt": "2025-11-15T10:00:00.000Z"
          },
          {
            "id": "ticket_id_2",
            "ticketNumber": 1235,
            "status": "active",
            "createdAt": "2025-11-15T10:00:00.000Z"
          }
        ]
      }
    ]
  }
}
```

**Notes:**

- Tickets are grouped by competition
- Only shows `active` and `winner` status tickets
- Users can only view their own tickets (unless admin)

---

## Recent API Changes

### ✅ **New Fields Added**

#### Winner Model

1. **`prizeValue`** (Number, optional)
   - Prize value for display
   - Automatically set from competition when winner is created
   - Can be updated by admin

2. **`verified`** (Boolean, default: false)
   - Verification status of the winner
   - Set to `true` when admin verifies the winner
   - Used for filtering and display

3. **`verifiedAt`** (Date, optional)
   - Timestamp when winner was verified
   - Automatically set when `verified` is set to `true`

4. **`publicAnnouncement`** (String, optional, max 500 chars)
   - Public announcement text for winners page
   - Can be customized by admin
   - Displayed on public winners page

#### Ticket Model

1. **`INVALID` Status** (✅ **NEW**)
   - New ticket status: `invalid`
   - Used for tickets that are invalid for any reason
   - Can be set by admin

### ✅ **Updated Behaviors**

#### Winner Creation

- **Automatic `prizeValue` Assignment**: When a winner is created (via draw or manual entry), the `prizeValue` is now automatically copied from the competition's `prizeValue` field.

**Before:**
```typescript
{
  prize: competition.prize,
  // prizeValue was missing
}
```

**After:**
```typescript
{
  prize: competition.prize,
  prizeValue: competition.prizeValue, // ✅ Now included
}
```

#### Winner Responses

- Public winner endpoints now include:
  - `prizeValue` in winner object
  - `prizeValue` in nested competition object
  - `verified` status
  - `publicAnnouncement` text

#### Ticket Status Flow

- After a draw, winning tickets are automatically marked as `WINNER` status
- New `INVALID` status available for admin use

---

## Error Handling

### Common Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Not authorized",
  "statusCode": 401
}
```
**Cause:** Missing or invalid authentication token.

#### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied. Admin privileges required.",
  "statusCode": 403
}
```
**Cause:** User does not have admin or super admin role.

#### 404 Not Found
```json
{
  "success": false,
  "message": "Draw not found",
  "statusCode": 404
}
```
**Cause:** Resource with specified ID does not exist.

#### 422 Unprocessable Entity
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "ticketNumber": ["ticketNumber is required"],
    "publicAnnouncement": ["publicAnnouncement cannot exceed 500 characters"]
  },
  "statusCode": 422
}
```
**Cause:** Request body validation failed.

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "statusCode": 500
}
```
**Cause:** Unexpected server error. Check server logs for details.

---

## Code Examples

### JavaScript/TypeScript Examples

#### Get All Winners

```typescript
const getWinners = async (page = 1, limit = 20) => {
  const response = await fetch(
    `/api/v1/winners?page=${page}&limit=${limit}`
  );
  const data = await response.json();
  return data;
};
```

#### Get Competition Draw

```typescript
const getCompetitionDraw = async (competitionId: string) => {
  const response = await fetch(
    `/api/v1/competitions/${competitionId}/draws`
  );
  const data = await response.json();
  return data;
};
```

#### Admin: Run Draw

```typescript
const runDraw = async (
  competitionId: string,
  numWinners = 1,
  reserveWinners = 3
) => {
  const response = await fetch(
    `/api/v1/admin/competitions/${competitionId}/run-draw`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        numWinners,
        reserveWinners,
        liveUrl: 'https://youtu.be/9tjYe__vGCw',
        urlType: 'youtube',
      }),
    }
  );
  return await response.json();
};
```

#### Admin: Update Winner

```typescript
const updateWinner = async (
  winnerId: string,
  updates: {
    verified?: boolean;
    publicAnnouncement?: string;
    prizeValue?: number;
  }
) => {
  const response = await fetch(
    `/api/v1/admin/winners/${winnerId}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    }
  );
  return await response.json();
};
```

#### Reserve Tickets

```typescript
const reserveTickets = async (
  competitionId: string,
  quantity: number
) => {
  const response = await fetch(
    `/api/v1/competitions/${competitionId}/hold`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ qty: quantity }),
    }
  );
  return await response.json();
};
```

#### Get User Tickets

```typescript
const getMyTickets = async (userId: string) => {
  const response = await fetch(
    `/api/v1/users/${userId}/tickets`,
    {
      headers: {
        'Authorization': `Bearer ${userToken}`,
      },
    }
  );
  return await response.json();
};
```

---

## Best Practices

### For Frontend Developers

1. **Error Handling**: Always handle 404 errors gracefully (draws/winners might not exist yet)
2. **Loading States**: Show loading indicators while fetching data
3. **Pagination**: Implement pagination for large lists (winners, tickets)
4. **Real-time Updates**: Consider polling or WebSocket for draw status updates
5. **Ticket Reservation**: Reserve tickets before showing checkout to prevent conflicts
6. **Winner Display**: Show `verified` status and `publicAnnouncement` when available

### For Backend Developers

1. **Transaction Safety**: Draw creation uses transactions to ensure data consistency
2. **Audit Trail**: All draws include seed and algorithm for verification
3. **Status Management**: Tickets are automatically updated to `WINNER` status after draw
4. **Notification**: Winners are automatically notified via Klaviyo
5. **Validation**: Always validate ticket numbers and competition status before draws

---

## Support

For issues or questions regarding the Draws, Winners, and Tickets API, please contact the development team or refer to the main API documentation.

---

**Last Updated:** November 15, 2025  
**API Version:** v1  
**Documentation Version:** 2.0

