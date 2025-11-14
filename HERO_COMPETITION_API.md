# Hero Competition Management API

This document describes the endpoints for managing the hero competition displayed on the home page.

**Base URL:** `/api/v1`

---

## Overview

The hero competition is the featured competition displayed prominently on the home page. By default, the system automatically selects:
1. The first featured competition with `status: 'live'`
2. Or the first live competition if no featured competition exists

You can manually override this selection by setting a specific competition as the hero using the admin endpoints below.

---

## Admin Endpoints (Authentication Required)

### Update Hero Competition

Manually set a specific competition as the hero competition for the home page.

**Endpoint:** `PATCH /api/v1/admin/content/hero`

**Authentication:** Required (Admin or Super Admin)

**Request Body:**

```json
{
  "competitionId": "507f1f77bcf86cd799439011"
}
```

**Request Body Fields:**

- `competitionId` (required) - The MongoDB ObjectId of the competition to set as hero

**Response:**

```json
{
  "success": true,
  "message": "Hero competition updated successfully",
  "data": {
    "heroCompetition": {
      "id": "507f1f77bcf86cd799439011",
      "title": "Luxury Car Giveaway",
      "slug": "luxury-car-giveaway",
      "image": "https://example.com/image.jpg",
      "ticketPrice": "5.00",
      "maxTickets": 1000,
      "soldTickets": 750,
      "progress": {
        "soldTickets": 750,
        "maxTickets": 1000,
        "entriesRemaining": 250,
        "percentage": 75
      },
      "drawDate": "2024-02-15T10:00:00.000Z",
      "category": "Cars",
      "featured": true
    }
  }
}
```

**Error Responses:**

- `400` - Competition ID is required
- `404` - Competition not found
- `401` - Not authorized
- `403` - Admin access required

**Example Request:**

```bash
curl -X PATCH https://api.royalcompetitions.co.uk/api/v1/admin/content/hero \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "competitionId": "507f1f77bcf86cd799439011"
  }'
```

**Notes:**

- The competition will be immediately set as the hero competition
- The home content cache is automatically cleared to force a refresh
- The manually set hero takes precedence over automatic selection
- The competition does not need to be featured or live to be set as hero (but it's recommended)

---

### Remove Hero Competition

Remove the manually set hero competition and reset to automatic selection.

**Endpoint:** `DELETE /api/v1/admin/content/hero`

**Authentication:** Required (Admin or Super Admin)

**Request Body:** None

**Response:**

```json
{
  "success": true,
  "message": "Hero competition reset to automatic selection",
  "data": null
}
```

**Error Responses:**

- `401` - Not authorized
- `403` - Admin access required

**Example Request:**

```bash
curl -X DELETE https://api.royalcompetitions.co.uk/api/v1/admin/content/hero \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Notes:**

- After removal, the system will automatically select the hero from featured/live competitions
- The home content cache is automatically cleared to force a refresh

---

## How Hero Selection Works

The hero competition selection follows this priority order:

1. **Manually Set Hero** (if set via PATCH endpoint)
   - The competition specified in the `HERO_COMPETITION_ID` SiteStat entry
   - Takes highest priority

2. **Featured Competition** (automatic)
   - First competition with `featured: true`, `isActive: true`, and `status: 'live'`
   - Sorted by `createdAt` descending

3. **First Live Competition** (automatic fallback)
   - First competition with `isActive: true` and `status: 'live'`
   - Sorted by `createdAt` descending

4. **Null** (if no competitions match)
   - Returns `null` for hero if no competitions are available

---

## Home Content Endpoint

The hero competition is returned as part of the home content endpoint.

**Endpoint:** `GET /api/v1/content/home`

**Response Structure:**

```json
{
  "success": true,
  "message": "Home content retrieved",
  "data": {
    "hero": {
      "id": "507f1f77bcf86cd799439011",
      "title": "Luxury Car Giveaway",
      "slug": "luxury-car-giveaway",
      "image": "https://example.com/image.jpg",
      "ticketPrice": "5.00",
      "maxTickets": 1000,
      "soldTickets": 750,
      "progress": {
        "soldTickets": 750,
        "maxTickets": 1000,
        "entriesRemaining": 250,
        "percentage": 75
      },
      "drawDate": "2024-02-15T10:00:00.000Z",
      "category": "Cars",
      "featured": true
    },
    "competitions": [...],
    "champions": [...],
    "stats": [...],
    "recentDraws": [...],
    "reviews": [...]
  }
}
```

**Note:** The `hero` field will be `null` if no competition is available.

---

## Frontend Integration Examples

### Update Hero Competition

```javascript
const updateHeroCompetition = async (competitionId) => {
  const response = await fetch('/api/v1/admin/content/hero', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      competitionId,
    }),
  });

  const data = await response.json();
  return data.data.heroCompetition;
};
```

### Remove Hero Competition

```javascript
const removeHeroCompetition = async () => {
  const response = await fetch('/api/v1/admin/content/hero', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  const data = await response.json();
  return data;
};
```

### Get Home Content (with Hero)

```javascript
const getHomeContent = async () => {
  const response = await fetch('/api/v1/content/home');
  const data = await response.json();
  return data.data.hero; // Returns the hero competition or null
};
```

---

## Summary Table

| Endpoint                          | Method | Description                    | Auth Required | Role Required |
| --------------------------------- | ------ | ------------------------------ | ------------- | ------------- |
| `PATCH /admin/content/hero`       | PATCH  | Update hero competition        | Yes           | Admin         |
| `DELETE /admin/content/hero`      | DELETE | Remove hero (reset to auto)    | Yes           | Admin         |
| `GET /content/home`               | GET    | Get home content with hero     | No            | -             |

---

## Important Notes

1. **Cache Management**: The home content cache is automatically cleared when the hero is updated or removed, ensuring immediate changes are reflected.

2. **Competition Validation**: The system validates that the competition exists before setting it as hero. If the competition is deleted later, the hero will fall back to automatic selection.

3. **Priority System**: Manually set hero competitions always take precedence over automatic selection, even if a better match exists.

4. **No Status Requirements**: You can set any competition as hero, regardless of its status (draft, live, closed, etc.). However, it's recommended to only set live competitions as hero for better user experience.

5. **Automatic Fallback**: If the manually set competition becomes inactive or is deleted, the system will automatically fall back to the default selection logic.

6. **Home Content Caching**: The home content is cached for 5 minutes. When you update the hero, the cache is cleared, but subsequent requests within 5 minutes will use the cached version.

---

## Use Cases

### Use Case 1: Promote a Specific Competition

You want to highlight a specific competition that's not featured:

```bash
PATCH /api/v1/admin/content/hero
{
  "competitionId": "507f1f77bcf86cd799439011"
}
```

### Use Case 2: Reset to Automatic Selection

You want to remove the manual override and let the system automatically select:

```bash
DELETE /api/v1/admin/content/hero
```

### Use Case 3: Check Current Hero

Get the current hero competition from the home content:

```bash
GET /api/v1/content/home
# Check the "hero" field in the response
```

---

## Error Handling

All endpoints return standard error responses:

```json
{
  "success": false,
  "message": "Error message",
  "errors": {
    "field": ["Error details"]
  }
}
```

Common error scenarios:

- **400 Bad Request**: Missing or invalid `competitionId`
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: User does not have admin privileges
- **404 Not Found**: Competition with the provided ID does not exist

---

## Best Practices

1. **Set Live Competitions**: Only set competitions with `status: 'live'` as hero for the best user experience.

2. **Monitor Performance**: Check that the hero competition has available tickets and is actively selling.

3. **Regular Updates**: Update the hero competition regularly to keep the home page fresh and engaging.

4. **Use Featured Flag**: Consider using the `featured` flag on competitions instead of manually setting hero if you want automatic rotation.

5. **Clear Cache**: Remember that the cache is automatically cleared, but you may want to verify changes by calling the home content endpoint.

