# Home Page Sections Management API Documentation

## Overview

This API allows admins to manage the home page sections dynamically. You can reorder sections, add/remove sections, and edit headings/subheadings for each section. The Hero section remains fixed at the top and is managed separately.

## Base URL

```
http://localhost:5000/api/v1
```

## Authentication

All admin endpoints require authentication. Include authentication cookies in your requests.

---

## Public Endpoint

### Get Home Content

**Endpoint:** `GET /content/home`

**Description:** Retrieves the home page content including hero and all configured sections.

**Response Format:**

```json
{
  "success": true,
  "message": "Home content retrieved",
  "data": {
    "hero": {
      "id": "competition_id",
      "title": "Competition Title",
      "slug": "competition-slug",
      "image": "https://...",
      "ticketPrice": "3.25",
      "maxTickets": 1000,
      "soldTickets": 500,
      "progress": {
        "soldTickets": 500,
        "maxTickets": 1000,
        "entriesRemaining": 500,
        "percentage": 50
      },
      "drawDate": "2025-12-25T21:00:00.000Z",
      "category": "cars",
      "featured": true
    },
    "sections": [
      {
        "type": "competitions",
        "heading": "Live Competitions",
        "subheading": "Enter now for your chance to win",
        "competitions": [
          {
            "id": "competition_id",
            "title": "Competition Title",
            "slug": "competition-slug",
            "image": "https://...",
            "ticketPrice": "3.25",
            "maxTickets": 1000,
            "soldTickets": 500,
            "progress": {
              "soldTickets": 500,
              "maxTickets": 1000,
              "entriesRemaining": 500,
              "percentage": 50
            },
            "drawDate": "2025-12-25T21:00:00.000Z",
            "category": "cars",
            "featured": false
          }
        ]
      },
      {
        "type": "champions",
        "heading": "Our Champions",
        "subheading": "Meet our recent winners",
        "champions": [
          {
            "id": "champion_id",
            "winnerName": "John Doe",
            "winnerLocation": "UK",
            "prizeName": "Ferrari F8 Tributo",
            "prizeValue": 238000,
            "testimonial": "Amazing experience!",
            "image": "https://...",
            "featured": true
          }
        ]
      },
      {
        "type": "stats",
        "heading": "Our Impact",
        "subheading": "Join thousands of happy winners",
        "stats": [
          {
            "key": "competitions",
            "label": "Competitions",
            "value": "1.2K+"
          },
          {
            "key": "champions",
            "label": "Champions",
            "value": "500+"
          },
          {
            "key": "draws",
            "label": "Draws",
            "value": "2.5K+"
          },
          {
            "key": "users",
            "label": "Users",
            "value": "10K+"
          }
        ]
      },
      {
        "type": "recentDraws",
        "heading": "Recent Draws",
        "subheading": "See who won recently",
        "recentDraws": [
          {
            "id": "draw_id",
            "winner": "John Doe",
            "location": "UK",
            "prize": "Ferrari F8 Tributo",
            "prizeValue": 238000,
            "ticketNumber": "123",
            "drawDate": "2025-12-01T21:00:00.000Z",
            "image": "https://..."
          }
        ]
      },
      {
        "type": "reviews",
        "heading": "What Our Customers Say",
        "subheading": "Real reviews from real winners",
        "reviews": [
          {
            "id": "review_id",
            "title": "Amazing Experience",
            "body": "I won a car and it was amazing!",
            "rating": 5,
            "reviewer": "John Doe",
            "location": "UK",
            "timeAgo": "2 days ago",
            "verified": true
          }
        ]
      }
    ],
    // Legacy format (still included for backward compatibility)
    "competitions": [...],
    "champions": [...],
    "stats": [...],
    "recentDraws": [...],
    "reviews": [...]
  }
}
```

**Notes:**
- Sections are ordered by the `order` field (ascending)
- Only active sections (`isActive: true`) are included
- The `sections` array contains the new structured format with headings/subheadings
- Legacy flat format is still included for backward compatibility

---

## Admin Endpoints

### 1. Get All Sections

**Endpoint:** `GET /admin/content/home/sections`

**Description:** Retrieves all home page sections (including inactive ones) for admin management.

**Response:**

```json
{
  "success": true,
  "message": "Home page sections retrieved successfully",
  "data": {
    "sections": [
      {
        "_id": "section_id",
        "type": "competitions",
        "order": 0,
        "heading": "Live Competitions",
        "subheading": "Enter now for your chance to win",
        "isActive": true,
        "createdAt": "2025-12-01T00:00:00.000Z",
        "updatedAt": "2025-12-01T00:00:00.000Z"
      },
      {
        "_id": "section_id",
        "type": "champions",
        "order": 1,
        "heading": "Our Champions",
        "subheading": "Meet our recent winners",
        "isActive": true,
        "createdAt": "2025-12-01T00:00:00.000Z",
        "updatedAt": "2025-12-01T00:00:00.000Z"
      }
      // ... more sections
    ]
  }
}
```

---

### 2. Get Single Section by Type

**Endpoint:** `GET /admin/content/home/sections/:type`

**Description:** Retrieves a specific section by its type.

**Path Parameters:**
- `type` (string, required): One of `competitions`, `champions`, `stats`, `recentDraws`, `reviews`

**Example Request:**
```
GET /admin/content/home/sections/competitions
```

**Response:**

```json
{
  "success": true,
  "message": "Home page section retrieved successfully",
  "data": {
    "section": {
      "_id": "section_id",
      "type": "competitions",
      "order": 0,
      "heading": "Live Competitions",
      "subheading": "Enter now for your chance to win",
      "isActive": true,
      "createdAt": "2025-12-01T00:00:00.000Z",
      "updatedAt": "2025-12-01T00:00:00.000Z"
    }
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Section with type 'competitions' does not exist",
  "errors": {
    "type": ["Section with type 'competitions' does not exist"]
  }
}
```

---

### 3. Create Section

**Endpoint:** `POST /admin/content/home/sections`

**Description:** Creates a new home page section. Note: Only one section of each type can exist.

**Request Body:**

```json
{
  "type": "competitions",
  "order": 0,
  "heading": "Live Competitions",
  "subheading": "Enter now for your chance to win",
  "isActive": true
}
```

**Field Descriptions:**
- `type` (string, required): One of `competitions`, `champions`, `stats`, `recentDraws`, `reviews`
- `order` (number, required): Display order (0 = first after hero, 1 = second, etc.). Must be >= 0
- `heading` (string, optional): Section heading (max 200 characters)
- `subheading` (string, optional): Section subheading (max 500 characters)
- `isActive` (boolean, optional): Whether section is visible (default: true)

**Response (201):**

```json
{
  "success": true,
  "message": "Home page section created successfully",
  "data": {
    "section": {
      "_id": "section_id",
      "type": "competitions",
      "order": 0,
      "heading": "Live Competitions",
      "subheading": "Enter now for your chance to win",
      "isActive": true,
      "createdAt": "2025-12-01T00:00:00.000Z",
      "updatedAt": "2025-12-01T00:00:00.000Z"
    }
  }
}
```

**Error Response (409 - Section already exists):**
```json
{
  "success": false,
  "message": "Section with type 'competitions' already exists",
  "errors": {
    "type": ["Section with type 'competitions' already exists"]
  }
}
```

---

### 4. Update Section

**Endpoint:** `PUT /admin/content/home/sections/:type`

**Description:** Updates an existing section's heading, subheading, order, or active status.

**Path Parameters:**
- `type` (string, required): One of `competitions`, `champions`, `stats`, `recentDraws`, `reviews`

**Request Body (all fields optional):**

```json
{
  "order": 1,
  "heading": "Updated Heading",
  "subheading": "Updated subheading",
  "isActive": true
}
```

**Field Descriptions:**
- `order` (number, optional): New display order (must be >= 0)
- `heading` (string, optional): New heading (max 200 characters). Use `null` or empty string to clear
- `subheading` (string, optional): New subheading (max 500 characters). Use `null` or empty string to clear
- `isActive` (boolean, optional): Whether section is visible

**Example Request:**
```
PUT /admin/content/home/sections/competitions
Content-Type: application/json

{
  "heading": "Featured Competitions",
  "subheading": "Don't miss out on these amazing prizes"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Home page section updated successfully",
  "data": {
    "section": {
      "_id": "section_id",
      "type": "competitions",
      "order": 0,
      "heading": "Featured Competitions",
      "subheading": "Don't miss out on these amazing prizes",
      "isActive": true,
      "createdAt": "2025-12-01T00:00:00.000Z",
      "updatedAt": "2025-12-01T12:00:00.000Z"
    }
  }
}
```

---

### 5. Reorder Sections

**Endpoint:** `PATCH /admin/content/home/sections/reorder`

**Description:** Reorders multiple sections at once. Useful for drag-and-drop reordering in the admin UI.

**Request Body:**

```json
{
  "sections": [
    {
      "id": "section_id_1",
      "order": 0
    },
    {
      "id": "section_id_2",
      "order": 1
    },
    {
      "id": "section_id_3",
      "order": 2
    }
  ]
}
```

**Field Descriptions:**
- `sections` (array, required): Array of section objects with `id` and `order`
  - `id` (string, required): Section MongoDB `_id`
  - `order` (number, required): New order value (must be >= 0)

**Example Request:**
```
PATCH /admin/content/home/sections/reorder
Content-Type: application/json

{
  "sections": [
    { "id": "67890abcdef1234567890123", "order": 0 },
    { "id": "12345abcdef6789012345678", "order": 1 },
    { "id": "abcdef12345678901234567", "order": 2 }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Home page sections reordered successfully",
  "data": {
    "sections": [
      {
        "_id": "67890abcdef1234567890123",
        "type": "competitions",
        "order": 0,
        "heading": "Live Competitions",
        "subheading": "Enter now for your chance to win",
        "isActive": true
      },
      {
        "_id": "12345abcdef6789012345678",
        "type": "champions",
        "order": 1,
        "heading": "Our Champions",
        "subheading": "Meet our recent winners",
        "isActive": true
      }
      // ... more sections in new order
    ]
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Sections array is required and must not be empty",
  "errors": {
    "sections": ["Sections array is required and must not be empty"]
  }
}
```

---

### 6. Delete Section (Soft Delete)

**Endpoint:** `DELETE /admin/content/home/sections/:type`

**Description:** Soft deletes a section by setting `isActive` to `false`. The section will no longer appear on the home page but can be restored by updating `isActive` to `true`.

**Path Parameters:**
- `type` (string, required): One of `competitions`, `champions`, `stats`, `recentDraws`, `reviews`

**Example Request:**
```
DELETE /admin/content/home/sections/reviews
```

**Response:**

```json
{
  "success": true,
  "message": "Home page section deleted successfully",
  "data": null
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Section with type 'reviews' does not exist",
  "errors": {
    "type": ["Section with type 'reviews' does not exist"]
  }
}
```

---

## Section Types

The following section types are available:

| Type | Description | Data Field |
|------|-------------|------------|
| `competitions` | Live competitions list | `competitions` |
| `champions` | Recent winners/champions | `champions` |
| `stats` | Site statistics | `stats` |
| `recentDraws` | Recent draw results | `recentDraws` |
| `reviews` | Customer reviews | `reviews` |

---

## Frontend Implementation Guide

### 1. Fetching Home Content

```typescript
// Fetch home content
const response = await fetch('/api/v1/content/home');
const { data } = await response.json();

// Use the new sections format
const { hero, sections } = data;

// Render hero (fixed at top)
<HeroSection hero={hero} />

// Render sections in order
{sections.map((section) => (
  <Section
    key={section.type}
    type={section.type}
    heading={section.heading}
    subheading={section.subheading}
    data={section[section.type]} // e.g., section.competitions, section.champions
  />
))}
```

### 2. Admin: Get All Sections

```typescript
const response = await fetch('/api/v1/admin/content/home/sections', {
  credentials: 'include' // Include auth cookies
});
const { data } = await response.json();
const { sections } = data;

// Display sections in admin UI
sections.forEach((section) => {
  console.log(`${section.type}: Order ${section.order}, Active: ${section.isActive}`);
});
```

### 3. Admin: Update Section Heading/Subheading

```typescript
const updateSection = async (type: string, heading: string, subheading: string) => {
  const response = await fetch(`/api/v1/admin/content/home/sections/${type}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      heading,
      subheading,
    }),
  });
  
  const result = await response.json();
  return result;
};

// Usage
await updateSection('competitions', 'Featured Competitions', 'Win amazing prizes');
```

### 4. Admin: Reorder Sections

```typescript
const reorderSections = async (sections: Array<{ id: string; order: number }>) => {
  const response = await fetch('/api/v1/admin/content/home/sections/reorder', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ sections }),
  });
  
  const result = await response.json();
  return result;
};

// Usage (e.g., after drag-and-drop)
const newOrder = [
  { id: 'section1', order: 0 },
  { id: 'section2', order: 1 },
  { id: 'section3', order: 2 },
];
await reorderSections(newOrder);
```

### 5. Admin: Toggle Section Visibility

```typescript
const toggleSection = async (type: string, isActive: boolean) => {
  const response = await fetch(`/api/v1/admin/content/home/sections/${type}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ isActive }),
  });
  
  const result = await response.json();
  return result;
};

// Hide a section
await toggleSection('reviews', false);

// Show a section
await toggleSection('reviews', true);
```

### 6. Admin: Delete Section

```typescript
const deleteSection = async (type: string) => {
  const response = await fetch(`/api/v1/admin/content/home/sections/${type}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  
  const result = await response.json();
  return result;
};

// Usage
await deleteSection('reviews'); // Soft delete (sets isActive to false)
```

---

## Error Handling

All endpoints follow a consistent error format:

```json
{
  "success": false,
  "message": "Error message",
  "errors": {
    "fieldName": ["Error message for this field"]
  }
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (not admin)
- `404` - Not Found
- `409` - Conflict (e.g., section type already exists)
- `500` - Internal Server Error

---

## Cache Behavior

- The home content endpoint caches responses for 5 minutes
- Cache is automatically cleared when sections are created, updated, reordered, or deleted
- No manual cache clearing is needed

---

## Default Sections

On first use, the system automatically creates default sections with the following configuration:

| Type | Order | Heading | Subheading |
|------|-------|---------|------------|
| `competitions` | 0 | "Live Competitions" | "Enter now for your chance to win" |
| `champions` | 1 | "Our Champions" | "Meet our recent winners" |
| `stats` | 2 | "Our Impact" | "Join thousands of happy winners" |
| `recentDraws` | 3 | "Recent Draws" | "See who won recently" |
| `reviews` | 4 | "What Our Customers Say" | "Real reviews from real winners" |

These defaults can be modified or deleted through the admin endpoints.

---

## Notes

1. **Hero Section**: The hero section is managed separately via the existing `/admin/content/hero` endpoint and is always fixed at the top.

2. **Section Uniqueness**: Only one section of each type can exist. Attempting to create a duplicate will return a 409 error.

3. **Order Values**: Order values can be any non-negative integer. Sections are sorted by order in ascending order (0, 1, 2, ...).

4. **Soft Delete**: Deleting a section sets `isActive` to `false` but doesn't remove it from the database. To restore, update `isActive` to `true`.

5. **Backward Compatibility**: The home endpoint still returns the legacy flat format (`competitions`, `champions`, etc.) for backward compatibility, but the new `sections` array format is recommended.

---

## Example: Complete Admin Flow

```typescript
// 1. Get all sections
const sectionsResponse = await fetch('/api/v1/admin/content/home/sections', {
  credentials: 'include'
});
const { data: { sections } } = await sectionsResponse.json();

// 2. Update a section's heading
await fetch('/api/v1/admin/content/home/sections/competitions', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    heading: 'Featured Competitions',
    subheading: 'Win amazing prizes today!'
  })
});

// 3. Reorder sections (move champions to first position)
await fetch('/api/v1/admin/content/home/sections/reorder', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    sections: [
      { id: sections.find(s => s.type === 'champions')._id, order: 0 },
      { id: sections.find(s => s.type === 'competitions')._id, order: 1 },
      { id: sections.find(s => s.type === 'stats')._id, order: 2 },
      { id: sections.find(s => s.type === 'recentDraws')._id, order: 3 },
      { id: sections.find(s => s.type === 'reviews')._id, order: 4 }
    ]
  })
});

// 4. Hide reviews section
await fetch('/api/v1/admin/content/home/sections/reviews', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ isActive: false })
});
```

---

## Support

For issues or questions, contact the backend team or refer to the main API documentation.

