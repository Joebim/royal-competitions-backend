# Winner Endpoints Documentation

## Overview

This document outlines all winner-related endpoints, distinguishing between public, user (authenticated), and admin endpoints.

---

## Public Endpoints (No Authentication Required)

### 1. Get All Winners (Public List)

**Endpoint:** `GET /api/v1/winners`

**Description:** Get a paginated list of all winners (public display)

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `competitionId` (optional): Filter by competition ID

**Response:**

```json
{
  "success": true,
  "message": "Winners retrieved successfully",
  "data": {
    "winners": [
      {
        "id": "...",
        "competition": { ... },
        "ticketNumber": 12345,
        "prize": "£10,000 Cash",
        "claimed": false,
        "notified": true,
        ...
      }
    ]
  },
  "pagination": { ... }
}
```

---

### 2. Get Winner by ID

**Endpoint:** `GET /api/v1/winners/:id`

**Description:** Get detailed winner information by ID

**Response:**

```json
{
  "success": true,
  "message": "Winner retrieved successfully",
  "data": {
    "winner": {
      "_id": "...",
      "competitionId": { ... },
      "userId": { ... },
      "ticketNumber": 12345,
      "prize": "£10,000 Cash",
      "claimCode": "ABCD-1234",
      "claimed": false,
      ...
    }
  }
}
```

---

### 3. Claim Prize (Public - No Auth Required)

**Endpoint:** `POST /api/v1/winners/:id/claim`

**Description:** Claim a prize using the claim code from the winner notification email

**Request Body:**

```json
{
  "claimCode": "ABCD-1234"
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Prize claimed successfully",
  "data": {
    "winner": {
      "id": "...",
      "competitionId": "...",
      "ticketNumber": 12345,
      "prize": "£10,000 Cash",
      "prizeValue": 10000,
      "claimed": true,
      "claimedAt": "2025-11-22T23:30:00.000Z"
    }
  }
}
```

**Response (Error - Invalid Code):**

```json
{
  "success": false,
  "message": "Invalid claim code",
  "error": {
    "statusCode": 400,
    "message": "Invalid claim code"
  }
}
```

**Response (Error - Already Claimed):**

```json
{
  "success": false,
  "message": "Prize has already been claimed",
  "error": {
    "statusCode": 400,
    "message": "Prize has already been claimed"
  }
}
```

**Validation:**

- `claimCode` is required
- Format: `ABCD-1234` (4 uppercase letters/numbers, dash, 4 uppercase letters/numbers)
- Case-insensitive comparison

---

## User Endpoints (Authentication Required)

### 4. Get My Winners

**Endpoint:** `GET /api/v1/winners/my/list`

**Description:** Get all winners for the authenticated user

**Authentication:** Required (protected route)

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**

```json
{
  "success": true,
  "message": "My winners retrieved successfully",
  "data": {
    "winners": [
      {
        "id": "...",
        "competition": {
          "id": "...",
          "title": "Win £10,000 Cash",
          "prize": "£10,000 Cash",
          "prizeValue": 10000,
          "images": [...]
        },
        "ticketNumber": 12345,
        "prize": "£10,000 Cash",
        "prizeValue": 10000,
        "claimCode": "ABCD-1234",
        "drawTime": "2025-11-22T23:30:00.000Z",
        "notified": true,
        "claimed": false,
        "claimedAt": null,
        "createdAt": "2025-11-22T23:30:00.000Z"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

---

## Admin Endpoints (Admin Authentication Required)

### 5. Get All Winners (Admin)

**Endpoint:** `GET /api/v1/admin/winners`

**Description:** Get all winners with admin filters and full details

**Authentication:** Required (admin only)

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `competitionId` (optional): Filter by competition ID
- `userId` (optional): Filter by user ID
- `notified` (optional): Filter by notified status (true/false)
- `claimed` (optional): Filter by claimed status (true/false)
- `search` (optional): Search by claim code or ticket number

**Response:** Full winner details with all populated fields

---

### 6. Get Winner by ID (Admin)

**Endpoint:** `GET /api/v1/admin/winners/:id`

**Description:** Get detailed winner information (admin view with all fields)

**Authentication:** Required (admin only)

**Response:** Full winner object with all populated fields

---

### 7. Update Winner (Admin)

**Endpoint:** `PUT /api/v1/admin/winners/:id`

**Description:** Update winner details (admin only)

**Authentication:** Required (admin only)

**Request Body:**

```json
{
  "notified": true,
  "claimed": true,
  "proofImageUrl": "https://...",
  "drawVideoUrl": "https://...",
  "testimonial": {
    "text": "...",
    "rating": 5,
    "approved": true
  }
}
```

**Note:** This endpoint can be used to manually mark winners as claimed, but the public `POST /api/v1/winners/:id/claim` endpoint is preferred for user self-service.

---

### 8. Delete Winner (Admin)

**Endpoint:** `DELETE /api/v1/admin/winners/:id`

**Description:** Delete a winner record (admin only)

**Authentication:** Required (admin only)

---

## Frontend Integration Guide

### Recommended Approach

**For Claiming Prizes:**
Use the public claim endpoint (no authentication required):

```typescript
// ✅ RECOMMENDED: Public claim endpoint
async claimPrizeWithCode(winnerId: string, claimCode: string): Promise<Winner> {
  const response = await api.post<ApiResponse<WinnerPayload>>(
    `/winners/${winnerId}/claim`,
    { claimCode }
  );
  const { data } = unwrapResponse<WinnerPayload>(response);
  return data.winner;
}
```

**For Getting User's Winners:**
Use the authenticated user endpoint:

```typescript
// Get user's own winners
async getMyWinners(page: number = 1, limit: number = 20): Promise<Winner[]> {
  const response = await api.get<ApiResponse<{ winners: Winner[] }>>(
    `/winners/my/list?page=${page}&limit=${limit}`
  );
  const { data } = unwrapResponse<{ winners: Winner[] }>(response);
  return data.winners;
}
```

**For Viewing Any Winner:**
Use the public get endpoint:

```typescript
// Get winner details (public)
async getWinner(winnerId: string): Promise<Winner> {
  const response = await api.get<ApiResponse<WinnerPayload>>(
    `/winners/${winnerId}`
  );
  const { data } = unwrapResponse<WinnerPayload>(response);
  return data.winner;
}
```

### Deprecated Approach

**❌ NOT RECOMMENDED:** Using admin endpoint for claiming (requires authentication):

```typescript
// ❌ DEPRECATED: Admin endpoint (requires auth)
async claimPrize(winnerId: string): Promise<Winner> {
  const response = await api.put<ApiResponse<WinnerPayload>>(
    `/admin/winners/${winnerId}`,
    { claimed: true }
  );
  const { data } = unwrapResponse<WinnerPayload>(response);
  return data.winner;
}
```

**Why not use admin endpoint?**

- Requires user to be logged in
- Less secure (no claim code verification)
- Not the intended use case
- Public endpoint is more user-friendly

---

## Endpoint Summary

| Endpoint                    | Method | Auth  | Purpose                  |
| --------------------------- | ------ | ----- | ------------------------ |
| `/api/v1/winners`           | GET    | None  | Get public winners list  |
| `/api/v1/winners/:id`       | GET    | None  | Get winner details       |
| `/api/v1/winners/:id/claim` | POST   | None  | **Claim prize (public)** |
| `/api/v1/winners/my/list`   | GET    | User  | Get user's own winners   |
| `/api/v1/admin/winners`     | GET    | Admin | Get all winners (admin)  |
| `/api/v1/admin/winners/:id` | GET    | Admin | Get winner (admin)       |
| `/api/v1/admin/winners/:id` | PUT    | Admin | Update winner (admin)    |
| `/api/v1/admin/winners/:id` | DELETE | Admin | Delete winner (admin)    |

---

## Claim Code Format

- **Format:** `ABCD-1234`
- **Pattern:** 4 uppercase letters/numbers, dash, 4 uppercase letters/numbers
- **Example:** `ABCD-1234`, `XY9Z-5678`
- **Validation:** Case-insensitive (converted to uppercase for comparison)
- **Uniqueness:** Each winner has a unique claim code

---

## Security Notes

1. **Claim Endpoint:** Public but secure - requires valid claim code
2. **Claim Code:** Unique per winner, sent via email
3. **Duplicate Claims:** Prevented - returns error if already claimed
4. **User Winners:** Only returns winners for authenticated user
5. **Admin Endpoints:** Require admin role authentication

---

## Error Handling

### Common Errors

**400 Bad Request:**

- Missing claim code
- Invalid claim code format
- Invalid claim code (doesn't match)
- Prize already claimed

**401 Unauthorized:**

- Missing authentication (for protected routes)
- Invalid token

**403 Forbidden:**

- User not admin (for admin routes)

**404 Not Found:**

- Winner not found

---

## Testing Examples

### Claim Prize (Public)

```bash
curl -X POST http://localhost:5000/api/v1/winners/6922477809601ca6c1b2012b/claim \
  -H "Content-Type: application/json" \
  -d '{"claimCode": "ABCD-1234"}'
```

### Get My Winners (Authenticated)

```bash
curl -X GET "http://localhost:5000/api/v1/winners/my/list?page=1&limit=20" \
  -H "Cookie: authToken=..."
```

### Get Winner Details (Public)

```bash
curl -X GET http://localhost:5000/api/v1/winners/6922477809601ca6c1b2012b
```

---

**Last Updated:** November 22, 2025
