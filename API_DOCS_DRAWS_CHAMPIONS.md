# Draws & Champions API Documentation

## Overview

This documentation covers the CRUD operations for **Draws** and **Champions** endpoints in the Royal Competitions backend API. These endpoints allow you to manage completed competition draws and showcase winners (champions).

## Base URL

```
http://localhost:5000/api/v1
```

---

## 🔵 Draws API Endpoints

Draws represent completed competitions with winners. Each draw records the competition details, winner information, and draw execution data.

### 1. Get All Draws

**Endpoint:** `GET /draws`

**Access:** Public

**Query Parameters:**

- `page` (optional, default: 1) - Page number for pagination
- `limit` (optional, default: 10) - Number of items per page
- `competitionId` (optional) - Filter by competition ID
- `winnerId` (optional) - Filter by winner/user ID

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
        "_id": "draw_id",
        "competitionId": "competition_id",
        "competitionTitle": "£500 ASOS Voucher",
        "prizeName": "£500 ASOS Voucher",
        "winnerId": "user_id",
        "winnerName": "John Smith",
        "winnerLocation": "London",
        "drawDate": "2024-11-18T10:30:00.000Z",
        "drawnAt": "2024-11-18T10:30:15.000Z",
        "totalTickets": 1799,
        "winningTicketNumber": 1234,
        "imageUrl": "https://example.com/draw-image.jpg",
        "isActive": true,
        "createdAt": "2024-11-18T10:30:15.000Z",
        "updatedAt": "2024-11-18T10:30:15.000Z"
      }
    ],
    "total": 50,
    "page": 1,
    "pages": 5
  }
}
```

---

### 2. Get Recent Draws

**Endpoint:** `GET /draws/recent`

**Access:** Public

**Query Parameters:**

- `limit` (optional, default: 4) - Number of recent draws to retrieve

**Example Request:**

```bash
GET http://localhost:5000/api/v1/draws/recent?limit=4
```

**Response:**

```json
{
  "success": true,
  "message": "Recent draws retrieved",
  "data": {
    "draws": [
      {
        "_id": "draw_id",
        "winnerName": "John Smith",
        "winnerLocation": "London",
        "prizeName": "£500 ASOS Voucher",
        "drawDate": "2024-11-18T10:30:00.000Z",
        "drawnAt": "2024-11-18T10:30:15.000Z",
        "totalTickets": 1799,
        "winningTicketNumber": 1234,
        "imageUrl": "https://example.com/draw-image.jpg"
      }
    ]
  }
}
```

---

### 3. Get Single Draw

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
        "category": "Fashion & Watches"
      },
      "winnerId": {
        "_id": "user_id",
        "firstName": "John",
        "lastName": "Smith",
        "email": "john@example.com",
        "phone": "+441234567890"
      },
      "competitionTitle": "£500 ASOS Voucher",
      "prizeName": "£500 ASOS Voucher",
      "winnerName": "John Smith",
      "winnerLocation": "London",
      "drawDate": "2024-11-18T10:30:00.000Z",
      "drawnAt": "2024-11-18T10:30:15.000Z",
      "totalTickets": 1799,
      "winningTicketNumber": 1234,
      "imageUrl": "https://example.com/draw-image.jpg",
      "isActive": true,
      "createdAt": "2024-11-18T10:30:15.000Z",
      "updatedAt": "2024-11-18T10:30:15.000Z"
    }
  }
}
```

---

### 4. Create Draw

**Endpoint:** `POST /draws`

**Access:** Private (Admin only)

**Authentication:** Required (cookie-based)

**Request Body:**

```json
{
  "competitionId": "507f1f77bcf86cd799439011",
  "winnerId": "507f191e810c19729de860ea",
  "winnerName": "John Smith",
  "winnerLocation": "London",
  "totalTickets": 1799,
  "winningTicketNumber": 1234,
  "drawDate": "2024-11-18T10:30:00.000Z",
  "imageUrl": "https://example.com/draw-image.jpg",
  "publicId": "cloudinary_public_id"
}
```

**Required Fields:**

- `competitionId` - ID of the completed competition
- `winnerId` - ID of the winning user
- `winnerName` - Full name of the winner
- `winnerLocation` - Location of the winner (e.g., "London", "Dublin")
- `totalTickets` - Total number of tickets sold (must be ≥ 1)
- `winningTicketNumber` - The winning ticket number (must be ≥ 1 and ≤ totalTickets)

**Optional Fields:**

- `drawDate` - Date of the draw (defaults to current date if not provided)
- `imageUrl` - URL of the draw image
- `publicId` - Cloudinary public ID for the image

**Example Request:**

```bash
POST http://localhost:5000/api/v1/draws
Content-Type: application/json
Cookie: authToken=your_token_here

{
  "competitionId": "507f1f77bcf86cd799439011",
  "winnerId": "507f191e810c19729de860ea",
  "winnerName": "John Smith",
  "winnerLocation": "London",
  "totalTickets": 1799,
  "winningTicketNumber": 1234
}
```

**Response:**

```json
{
  "success": true,
  "message": "Draw created successfully",
  "data": {
    "draw": {
      "_id": "new_draw_id",
      "competitionId": "507f1f77bcf86cd799439011",
      "competitionTitle": "£500 ASOS Voucher",
      "prizeName": "£500 ASOS Voucher",
      "winnerId": "507f191e810c19729de860ea",
      "winnerName": "John Smith",
      "winnerLocation": "London",
      "drawDate": "2024-11-18T10:30:00.000Z",
      "drawnAt": "2024-11-18T10:30:15.000Z",
      "totalTickets": 1799,
      "winningTicketNumber": 1234,
      "isActive": true,
      "createdAt": "2024-11-18T10:30:15.000Z"
    }
  }
}
```

**Note:** Creating a draw automatically updates the competition status to `completed` and sets the winner.

---

### 5. Update Draw

**Endpoint:** `PUT /draws/:id`

**Access:** Private (Admin only)

**Authentication:** Required (cookie-based)

**Path Parameters:**

- `id` (required) - Draw ID

**Request Body:** (All fields optional)

```json
{
  "winnerName": "Jane Doe",
  "winnerLocation": "Dublin",
  "drawDate": "2024-11-18T10:30:00.000Z",
  "totalTickets": 2000,
  "winningTicketNumber": 1500,
  "imageUrl": "https://example.com/new-image.jpg",
  "publicId": "new_cloudinary_id",
  "isActive": true
}
```

**Example Request:**

```bash
PUT http://localhost:5000/api/v1/draws/507f1f77bcf86cd799439011
Content-Type: application/json
Cookie: authToken=your_token_here

{
  "winnerName": "Jane Doe",
  "winnerLocation": "Dublin"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Draw updated successfully",
  "data": {
    "draw": {
      "_id": "draw_id",
      "winnerName": "Jane Doe",
      "winnerLocation": "Dublin",
      ...
    }
  }
}
```

---

### 6. Delete Draw

**Endpoint:** `DELETE /draws/:id`

**Access:** Private (Admin only)

**Authentication:** Required (cookie-based)

**Path Parameters:**

- `id` (required) - Draw ID

**Example Request:**

```bash
DELETE http://localhost:5000/api/v1/draws/507f1f77bcf86cd799439011
Cookie: authToken=your_token_here
```

**Response:**

```json
{
  "success": true,
  "message": "Draw deleted successfully",
  "data": null
}
```

**Note:** This performs a soft delete (sets `isActive` to `false`), so the draw data is preserved but hidden from public endpoints.

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

### Creating a Draw and Champion

1. **Complete a competition** (usually done automatically when competition ends)
2. **Create a Draw:**

   ```bash
   POST /api/v1/draws
   {
     "competitionId": "...",
     "winnerId": "...",
     "winnerName": "John Smith",
     "winnerLocation": "London",
     "totalTickets": 1799,
     "winningTicketNumber": 1234
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

**Get recent draws for homepage:**

```bash
GET /api/v1/draws/recent?limit=4
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

- **competitionId** → Competition (one-to-one)
- **winnerId** → User (one-to-one)

### Champion Relationships:

- **drawId** → Draw (one-to-one)
- **competitionId** → Competition (one-to-one)
- **winnerId** → User (one-to-one)

### Population:

All endpoints automatically populate related documents when fetching single items:

- Draws populate `competitionId` and `winnerId`
- Champions populate `drawId`, `competitionId`, and `winnerId`

---

## 🔍 Filtering & Search

### Draw Filters:

- Filter by `competitionId` - Get all draws for a specific competition
- Filter by `winnerId` - Get all draws won by a specific user

### Champion Filters:

- Filter by `featured` - Get only featured champions
- Search by `search` - Searches winner name, prize name, and location

---

## 📸 Image Handling

### Draw Images:

- Optional image URL can be provided when creating/updating
- Stored as `imageUrl` and `publicId` fields
- No automatic Cloudinary upload for draws

### Champion Images:

- **Required** when creating (unless draw has imageUrl)
- Automatically uploaded to Cloudinary
- Automatically deleted from Cloudinary when champion is deleted or image is updated
- Stored in `image.url` and `image.publicId` fields

---

## ⚡ Performance Tips

1. **Use pagination** - Always paginate list endpoints to improve performance
2. **Use specific endpoints** - Use `/draws/recent` and `/champions/featured` instead of filtering all records
3. **Limit fields** - List endpoints return essential fields only; use single item endpoints for full details
4. **Cache featured data** - Featured champions/draws can be cached as they change infrequently

---

## 🧪 Testing Examples

### JavaScript/TypeScript Examples

**Get all draws:**

```typescript
const getDraws = async () => {
  const response = await fetch(
    'http://localhost:5000/api/v1/draws?page=1&limit=10',
    {
      credentials: 'include',
    }
  );
  const data = await response.json();
  return data;
};
```

**Create a draw:**

```typescript
const createDraw = async (drawData: any) => {
  const response = await fetch('http://localhost:5000/api/v1/draws', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(drawData),
  });
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
