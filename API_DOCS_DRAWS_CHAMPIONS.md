# Draws & Champions API Documentation

## Overview

This documentation covers the CRUD operations for **Draws** and **Champions** endpoints in the Royal Competitions backend API. These endpoints allow you to manage completed competition draws and showcase winners (champions).

## Base URL

```
http://localhost:5000/api/v1
```

---

## 🔵 Draws API Endpoints

Draws represent completed competitions with winners. Each draw records the competition details, winner information, and draw execution data with full audit trail.

### 1. Get All Draws

**Endpoint:** `GET /draws`

**Access:** Public

**Query Parameters:**

- `page` (optional, default: 1) - Page number for pagination
- `limit` (optional, default: 10) - Number of items per page
- `competitionId` (optional) - Filter by competition ID
- `drawMethod` (optional) - Filter by draw method: `automatic`, `admin_triggered`, or `manual`

**Example Request:**

```bash
GET http://localhost:5000/api/v1/draws?page=1&limit=10
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
        "liveUrl": "https://www.youtube.com/watch?v=...",
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

**Note:** The response includes full competition data (images, category, etc.) and all winners associated with the draw. Each draw can have multiple winners (primary + reserves).

---

### 2. Get Single Draw

**Endpoint:** `GET /draws/:id`

**Access:** Public

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
      "liveUrl": "https://www.youtube.com/watch?v=...",
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

**Access:** Public

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

---

### 4. Get Competition Draws

**Endpoint:** `GET /competitions/:id/draws`

**Access:** Public

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

## 🔐 Admin Draw Endpoints

These endpoints are available at `/api/v1/admin/competitions/:id/` and require admin authentication.

### Run Draw (Admin)

**Endpoint:** `POST /api/v1/admin/competitions/:id/run-draw`

**Access:** Private (Admin only)

**Authentication:** Required (cookie-based)

**Path Parameters:**

- `id` (required) - Competition ID

**Request Body:**

```json
{
  "numWinners": 1,
  "reserveWinners": 3,
  "liveUrl": "https://www.youtube.com/watch?v=...",
  "urlType": "youtube",
  "notes": "Optional notes about the draw"
}
```

**Required Fields:**

- None (all fields are optional with defaults)

**Optional Fields:**

- `numWinners` (default: 1) - Number of primary winners
- `reserveWinners` (default: 3) - Number of reserve winners
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
  "liveUrl": "https://www.youtube.com/watch?v=abc123",
  "urlType": "youtube"
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

**Note:**

- This endpoint automatically closes the competition if it's still `live`
- Primary winners are automatically notified via email
- The competition status is updated to `drawn`
- Draws are created with full audit trail (seed, algorithm, snapshot)

---

### Add Manual Winner (Admin)

**Endpoint:** `POST /api/v1/admin/competitions/:id/add-winner`

**Access:** Private (Admin only)

**Authentication:** Required (cookie-based)

**Path Parameters:**

- `id` (required) - Competition ID

**Request Body:**

```json
{
  "ticketNumber": 1234,
  "notes": "Manual winner entry",
  "evidenceUrl": "https://example.com/draw-video.mp4",
  "liveUrl": "https://www.youtube.com/watch?v=...",
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
  "notes": "Winner selected manually",
  "evidenceUrl": "https://example.com/draw-video.mp4",
  "liveUrl": "https://www.youtube.com/watch?v=abc123",
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

**Note:**

- This creates a manual draw record with a single winner
- The winner is automatically notified if they have an email
- The competition status is updated to `drawn`

---

## 🏆 Champions API Endpoints

Champions are featured winners with testimonials. They showcase successful competition winners with their stories and prize details.

### 1. Get All Champions

**Endpoint:** `GET /champions`

**Access:** Public

**Query Parameters:**

- `page` (optional, default: 1) - Page number for pagination
- `limit` (optional, default: 12) - Number of items per page
- `featured` (optional, boolean) - Filter only featured champions
- `search` (optional, string) - Search by winner name, prize name, or location

**Example Request:**

```bash
GET http://localhost:5000/api/v1/champions?page=1&limit=12&featured=true
```

**Response:**

```json
{
  "success": true,
  "message": "Champions retrieved successfully",
  "data": {
    "champions": [
      {
        "_id": "champion_id",
        "drawId": "draw_id",
        "competitionId": "competition_id",
        "winnerId": "user_id",
        "winnerName": "John Smith",
        "winnerLocation": "London",
        "prizeName": "2 Bed Luxury Apartment In Liverpool or £150,000",
        "prizeValue": "£150,000",
        "testimonial": "\"Getting the call on that Sunday night from Peter to tell us that we had won the villa in Spain or 200k was a moment we will never forget and certainly a great way to start the week!\"",
        "image": {
          "url": "https://example.com/champion-image.jpg",
          "publicId": "cloudinary_public_id"
        },
        "featured": true,
        "isActive": true,
        "createdAt": "2024-11-18T10:30:15.000Z",
        "updatedAt": "2024-11-18T10:30:15.000Z"
      }
    ],
    "total": 25,
    "page": 1,
    "pages": 3
  }
}
```

---

### 2. Get Featured Champions

**Endpoint:** `GET /champions/featured`

**Access:** Public

**Description:** Returns up to 12 featured champions, typically used for homepage carousels.

**Example Request:**

```bash
GET http://localhost:5000/api/v1/champions/featured
```

**Response:**

```json
{
  "success": true,
  "message": "Featured champions retrieved",
  "data": {
    "champions": [
      {
        "_id": "champion_id",
        "winnerName": "John Smith",
        "winnerLocation": "London",
        "prizeName": "2 Bed Luxury Apartment In Liverpool or £150,000",
        "testimonial": "\"Very grateful for getting this big prize...\"",
        "image": {
          "url": "https://example.com/champion-image.jpg",
          "publicId": "cloudinary_public_id"
        },
        "featured": true,
        "createdAt": "2024-11-18T10:30:15.000Z"
      }
    ]
  }
}
```

---

### 3. Get Single Champion

**Endpoint:** `GET /champions/:id`

**Access:** Public

**Path Parameters:**

- `id` (required) - Champion ID

**Example Request:**

```bash
GET http://localhost:5000/api/v1/champions/507f1f77bcf86cd799439011
```

**Response:**

```json
{
  "success": true,
  "message": "Champion retrieved successfully",
  "data": {
    "champion": {
      "_id": "champion_id",
      "drawId": {
        "_id": "draw_id",
        "drawDate": "2024-11-18T10:30:00.000Z",
        "drawnAt": "2024-11-18T10:30:15.000Z"
      },
      "competitionId": {
        "_id": "competition_id",
        "title": "£500 ASOS Voucher",
        "category": "Fashion & Watches"
      },
      "winnerId": {
        "_id": "user_id",
        "firstName": "John",
        "lastName": "Smith",
        "email": "john@example.com",
        "phone": "+441234567890"
      },
      "winnerName": "John Smith",
      "winnerLocation": "London",
      "prizeName": "2 Bed Luxury Apartment In Liverpool or £150,000",
      "prizeValue": "£150,000",
      "testimonial": "\"Getting the call on that Sunday night from Peter to tell us that we had won the villa in Spain or 200k was a moment we will never forget and certainly a great way to start the week! The team have been absolutely amazing, sorting out travel arrangements and putting no pressure on what prize to choose.\"",
      "image": {
        "url": "https://example.com/champion-image.jpg",
        "publicId": "cloudinary_public_id"
      },
      "featured": true,
      "isActive": true,
      "createdAt": "2024-11-18T10:30:15.000Z",
      "updatedAt": "2024-11-18T10:30:15.000Z"
    }
  }
}
```

---

### 4. Create Champion

**Endpoint:** `POST /champions`

**Access:** Private (Admin only)

**Authentication:** Required (cookie-based)

**Request Body:** `multipart/form-data` (for image upload)

**Required Fields:**

- `drawId` - ID of the draw to create champion from
- `testimonial` - Winner's testimonial (max 1000 characters)
- `image` - Image file (JPEG, PNG, WebP)

**Optional Fields:**

- `winnerName` - Override winner name (defaults to draw's winnerName)
- `winnerLocation` - Override winner location (defaults to draw's winnerLocation)
- `prizeValue` - Prize value description (e.g., "£150,000")
- `featured` - Boolean to feature this champion (default: false)

**Example Request:**

```bash
POST http://localhost:5000/api/v1/champions
Content-Type: multipart/form-data
Cookie: authToken=your_token_here

drawId: 507f1f77bcf86cd799439011
testimonial: "Getting the call on that Sunday night from Peter to tell us that we had won the villa in Spain or 200k was a moment we will never forget!"
prizeValue: £150,000
featured: true
image: [binary file data]
```

**Using cURL:**

```bash
curl -X POST http://localhost:5000/api/v1/champions \
  -H "Cookie: authToken=your_token_here" \
  -F "drawId=507f1f77bcf86cd799439011" \
  -F "testimonial=Getting the call on that Sunday night..." \
  -F "prizeValue=£150,000" \
  -F "featured=true" \
  -F "image=@/path/to/image.jpg"
```

**Response:**

```json
{
  "success": true,
  "message": "Champion created successfully",
  "data": {
    "champion": {
      "_id": "new_champion_id",
      "drawId": "507f1f77bcf86cd799439011",
      "competitionId": "competition_id",
      "winnerId": "user_id",
      "winnerName": "John Smith",
      "winnerLocation": "London",
      "prizeName": "2 Bed Luxury Apartment In Liverpool or £150,000",
      "prizeValue": "£150,000",
      "testimonial": "Getting the call on that Sunday night...",
      "image": {
        "url": "https://res.cloudinary.com/.../champion-image.jpg",
        "publicId": "royal-competitions/champions/..."
      },
      "featured": true,
      "isActive": true,
      "createdAt": "2024-11-18T10:30:15.000Z"
    }
  }
}
```

**Note:**

- If no image is provided but the draw has an imageUrl, it will be used automatically
- The draw must exist and be valid
- Winner information is automatically pulled from the draw if not overridden

---

### 5. Update Champion

**Endpoint:** `PUT /champions/:id`

**Access:** Private (Admin only)

**Authentication:** Required (cookie-based)

**Path Parameters:**

- `id` (required) - Champion ID

**Request Body:** `multipart/form-data` (for optional image update)

**Optional Fields:**

- `winnerName` - Update winner name
- `winnerLocation` - Update winner location
- `prizeName` - Update prize name
- `prizeValue` - Update prize value
- `testimonial` - Update testimonial (max 1000 characters)
- `featured` - Toggle featured status
- `isActive` - Toggle active status
- `image` - New image file (if provided, old image is deleted from Cloudinary)

**Example Request:**

```bash
PUT http://localhost:5000/api/v1/champions/507f1f77bcf86cd799439011
Content-Type: multipart/form-data
Cookie: authToken=your_token_here

testimonial: "Updated testimonial text..."
featured: false
```

**Using cURL:**

```bash
curl -X PUT http://localhost:5000/api/v1/champions/507f1f77bcf86cd799439011 \
  -H "Cookie: authToken=your_token_here" \
  -F "testimonial=Updated testimonial..." \
  -F "featured=false"
```

**Response:**

```json
{
  "success": true,
  "message": "Champion updated successfully",
  "data": {
    "champion": {
      "_id": "champion_id",
      "testimonial": "Updated testimonial...",
      "featured": false,
      ...
    }
  }
}
```

---

### 6. Delete Champion

**Endpoint:** `DELETE /champions/:id`

**Access:** Private (Admin only)

**Authentication:** Required (cookie-based)

**Path Parameters:**

- `id` (required) - Champion ID

**Example Request:**

```bash
DELETE http://localhost:5000/api/v1/champions/507f1f77bcf86cd799439011
Cookie: authToken=your_token_here
```

**Response:**

```json
{
  "success": true,
  "message": "Champion deleted successfully",
  "data": null
}
```

**Note:**

- This performs a soft delete (sets `isActive` to `false`)
- The image is automatically deleted from Cloudinary
- Champion data is preserved for historical records

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

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
  withCredentials: true, // Important: Include cookies
});

// Create a draw
const createDraw = async (drawData) => {
  const response = await api.post('/draws', drawData);
  return response.data;
};

// Create a champion with image
const createChampion = async (formData) => {
  const response = await api.post('/champions', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
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
  "message": "Invalid winning ticket number"
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

**422 Validation Error:**

```json
{
  "success": false,
  "message": "Validation error",
  "errors": {
    "winnerName": "Winner name is required",
    "testimonial": "Testimonial cannot exceed 1000 characters"
  }
}
```

---

## 🔄 Typical Workflow

### Running a Draw and Creating a Champion

1. **Competition ends** (status changes to `closed` or `live`)
2. **Run a Draw** (Admin):

   **Automatic Draw:**
   - Draws run automatically if competition has `drawMode: 'automatic'`
   - No admin action required

   **Admin-Triggered Draw:**

   ```bash
   POST /api/v1/admin/competitions/:id/run-draw
   {
     "numWinners": 1,
     "reserveWinners": 3,
     "liveUrl": "https://www.youtube.com/watch?v=...",
     "urlType": "youtube"
   }
   ```

   **Manual Winner Entry:**

   ```bash
   POST /api/v1/admin/competitions/:id/add-winner
   {
     "ticketNumber": 1234,
     "evidenceUrl": "https://example.com/draw-video.mp4",
     "liveUrl": "https://www.youtube.com/watch?v=...",
     "urlType": "youtube"
   }
   ```

3. **Create a Champion** (optional, for featuring the winner):
   ```bash
   POST /api/v1/champions
   Form Data:
   - drawId: [draw_id from step 2]
   - testimonial: "Winner's testimonial..."
   - image: [winner photo]
   - featured: true
   ```

### Querying Draws and Champions

**Get all draws with pagination:**

```bash
GET /api/v1/draws?page=1&limit=10
```

**Get draws for a specific competition:**

```bash
GET /api/v1/competitions/:id/draws
```

**Get featured champions for carousel:**

```bash
GET /api/v1/champions/featured
```

**Search champions:**

```bash
GET /api/v1/champions?search=London&featured=true
```

---

## 📊 Data Relationships

### Draw Relationships:

- **competitionId** → Competition (one-to-many: one competition can have multiple draws)
- **initiatedBy** → User (one-to-one: admin who triggered the draw)
- **result** → Array of winners (one-to-many: primary + reserves)
- **winners** → Winner records (one-to-many: linked via `drawId`)

### Champion Relationships:

- **drawId** → Draw (one-to-one)
- **competitionId** → Competition (one-to-one)
- **winnerId** → User (one-to-one)

### Population:

All endpoints automatically populate related documents:

- **Draws** populate:
  - `competitionId` - Full competition data (title, images, category, etc.)
  - `initiatedBy` - Admin user who triggered the draw
  - `winners` - All winner records with user and ticket data

- **Champions** populate:
  - `drawId` - Draw information
  - `competitionId` - Competition details
  - `winnerId` - Winner user information

### Draw Methods:

- **`automatic`** - Draw runs automatically when competition ends
- **`admin_triggered`** - Admin manually triggers the draw
- **`manual`** - Admin manually enters a winner (for special cases)

---

## 🔍 Filtering & Search

### Draw Filters:

- Filter by `competitionId` - Get all draws for a specific competition
- Filter by `drawMethod` - Filter by draw method: `automatic`, `admin_triggered`, or `manual`

### Champion Filters:

- Filter by `featured` - Get only featured champions
- Search by `search` - Searches winner name, prize name, and location

---

## 📸 Image & Video Handling

### Draw Images & Videos:

- Draws include full competition data with images
- `evidenceUrl` - URL to draw video/evidence (for manual draws)
- `liveUrl` - URL to watch the draw live (YouTube, Vimeo, Twitch, etc.)
- `urlType` - Helps frontend render the URL correctly: `youtube`, `vimeo`, `twitch`, `custom`, or `other`
- Competition images are automatically included in draw responses

### Champion Images:

- **Required** when creating (unless draw has imageUrl)
- Automatically uploaded to Cloudinary
- Automatically deleted from Cloudinary when champion is deleted or image is updated
- Stored in `image.url` and `image.publicId` fields

---

## ⚡ Performance Tips

1. **Use pagination** - Always paginate list endpoints to improve performance
2. **Use specific endpoints** - Use `/competitions/:id/draws` to get draws for a specific competition
3. **Filter by drawMethod** - Filter draws by method (`automatic`, `admin_triggered`, `manual`) when needed
4. **Cache featured data** - Featured champions can be cached as they change infrequently
5. **Full competition data** - Draw endpoints return full competition data including images, so no need for separate competition API calls

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

**Get draws for a competition:**

```typescript
const getCompetitionDraws = async (competitionId: string) => {
  const response = await fetch(
    `http://localhost:5000/api/v1/competitions/${competitionId}/draws`,
    {
      credentials: 'include',
    }
  );
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

**Create a champion with image:**

```typescript
const createChampion = async (formData: FormData) => {
  const response = await fetch('http://localhost:5000/api/v1/champions', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  return await response.json();
};

// Usage
const formData = new FormData();
formData.append('drawId', 'draw_id');
formData.append('testimonial', 'Great experience...');
formData.append('featured', 'true');
formData.append('image', fileInput.files[0]);

const champion = await createChampion(formData);
```

---

## 📚 Additional Resources

- **Swagger Documentation:** `http://localhost:5000/api-docs`
- **Frontend Auth Docs:** See `FRONTEND_AUTH_DOCS.md` for authentication details
- **Competition API:** See existing competition endpoints documentation

---

## 🆘 Support

If you encounter issues:

1. Check authentication - Ensure you're logged in as admin
2. Verify input data - Check required fields and validation rules
3. Review error messages - They provide specific information about what went wrong
4. Check Swagger docs - Interactive API documentation at `/api-docs`

For additional help, contact the backend team or check the server logs.
