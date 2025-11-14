# Content Management API Documentation

_Generated: 2025-01-27_

This document provides comprehensive API documentation for content management endpoints including Legal Pages (Terms & Conditions, Privacy Policy, etc.) and Frequently Asked Questions (FAQs).

---

## Base URL

All endpoints are prefixed with:

```
http://localhost:5000/api/v1
```

Or use the environment variable:

```
VITE_API_BASE_URL
```

---

## Authentication

### Public Endpoints
- `GET /content/pages/:slug` - No authentication required
- `GET /content/faqs` - No authentication required

### Admin Endpoints
All admin endpoints require authentication via:
- Cookie: `authToken` (preferred)
- Header: `Authorization: Bearer <token>`

Admin endpoints require the user to have `ADMIN` or `SUPER_ADMIN` role.

---

## Response Format

All endpoints follow the standard API response envelope:

**Success Response:**

```json
{
  "success": true,
  "data": { ... },
  "message": "optional human readable note"
}
```

**Error Response:**

```json
{
  "success": false,
  "message": "Error message",
  "errors": {
    "field": ["validation error message"]
  }
}
```

---

## Legal Pages API

### Public Endpoints

#### 1. Get Legal Page by Slug

Retrieves content for a specific legal/support page.

**Endpoint:**

```
GET /content/pages/:slug
```

**Authentication:** Not required (public endpoint)

**URL Parameters:**

- `slug` (string, required) - The page identifier. Valid slugs:
  - `terms-and-conditions`
  - `terms-of-use`
  - `acceptable-use`
  - `privacy-policy`
  - `complaints-procedure`
  - `how-it-works`

**Response Status:** `200 OK`

**Response Body:**

```json
{
  "success": true,
  "data": {
    "page": {
      "slug": "terms-and-conditions",
      "title": "Terms & Conditions",
      "subtitle": "Please read these terms carefully before participating in any competition.",
      "updatedAt": "2025-01-15T10:30:00.000Z",
      "sections": [
        {
          "heading": "Eligibility",
          "body": [
            "Royal Competitions is open to residents of the United Kingdom and Ireland aged 18+.",
            "We reserve the right to request proof of age at any time.",
            "Participants must have a valid email address and phone number."
          ],
          "list": {
            "title": "Ineligible participants include:",
            "items": [
              "Employees of Royal Competitions and their immediate family members.",
              "Employees of any company involved in the administration of competitions.",
              "Anyone under the age of 18."
            ]
          }
        },
        {
          "heading": "Entry Requirements",
          "body": [
            "To enter a competition, you must answer a skill-based question correctly.",
            "Each entry requires the purchase of a ticket at the specified ticket price.",
            "Maximum ticket purchases per competition may be limited."
          ]
        }
      ]
    }
  },
  "message": "Page content retrieved successfully"
}
```

**Example Request:**

```bash
curl -X GET "http://localhost:5000/api/v1/content/pages/terms-and-conditions" \
  -H "Content-Type: application/json"
```

**Example Response (404 Not Found):**

```json
{
  "success": false,
  "message": "Page with slug 'invalid-slug' does not exist",
  "errors": {
    "slug": ["Page with slug 'invalid-slug' does not exist"]
  }
}
```

---

### Admin Endpoints

#### 2. Get All Legal Pages

Retrieves all legal pages (including inactive ones).

**Endpoint:**

```
GET /admin/content/pages
```

**Authentication:** Required (Admin)

**Response Status:** `200 OK`

**Response Body:**

```json
{
  "success": true,
  "data": {
    "pages": [
      {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
        "slug": "terms-and-conditions",
        "title": "Terms & Conditions",
        "subtitle": "Please read these terms carefully...",
        "sections": [...],
        "isActive": true,
        "createdAt": "2025-01-10T10:00:00.000Z",
        "updatedAt": "2025-01-15T10:30:00.000Z",
        "createdBy": "65a1b2c3d4e5f6g7h8i9j0k2",
        "updatedBy": "65a1b2c3d4e5f6g7h8i9j0k2"
      }
    ]
  },
  "message": "Legal pages retrieved successfully"
}
```

**Example Request:**

```bash
curl -X GET "http://localhost:5000/api/v1/admin/content/pages" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

---

#### 3. Get Legal Page by Slug (Admin)

Retrieves a single legal page by slug (including inactive pages).

**Endpoint:**

```
GET /admin/content/pages/:slug
```

**Authentication:** Required (Admin)

**URL Parameters:**

- `slug` (string, required) - The page slug

**Response Status:** `200 OK`

**Response Body:**

```json
{
  "success": true,
  "data": {
    "page": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "slug": "terms-and-conditions",
      "title": "Terms & Conditions",
      "subtitle": "Please read these terms carefully...",
      "sections": [...],
      "isActive": true,
      "createdAt": "2025-01-10T10:00:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z",
      "createdBy": "65a1b2c3d4e5f6g7h8i9j0k2",
      "updatedBy": "65a1b2c3d4e5f6g7h8i9j0k2"
    }
  },
  "message": "Legal page retrieved successfully"
}
```

---

#### 4. Create Legal Page

Creates a new legal page.

**Endpoint:**

```
POST /admin/content/pages
```

**Authentication:** Required (Admin)

**Request Body:**

```json
{
  "slug": "terms-and-conditions",
  "title": "Terms & Conditions",
  "subtitle": "Please read these terms carefully before participating in any competition.",
  "sections": [
    {
      "heading": "Eligibility",
      "body": [
        "Royal Competitions is open to residents of the United Kingdom and Ireland aged 18+.",
        "We reserve the right to request proof of age at any time."
      ],
      "list": {
        "title": "Ineligible participants include:",
        "items": [
          "Employees of Royal Competitions and their immediate family members.",
          "Anyone under the age of 18."
        ]
      }
    },
    {
      "heading": "Entry Requirements",
      "body": [
        "To enter a competition, you must answer a skill-based question correctly.",
        "Each entry requires the purchase of a ticket at the specified ticket price."
      ]
    }
  ],
  "isActive": true
}
```

**Validation Rules:**

- `slug` (required): Must be lowercase, alphanumeric with hyphens, must be one of the valid slugs
- `title` (required): 1-200 characters
- `subtitle` (optional): Max 500 characters
- `sections` (required): Array with at least one section
  - Each section must have:
    - `heading` (required): 1-200 characters
    - `body` (required): Array of strings, at least one paragraph
    - `list` (optional): Object with `title` (optional) and `items` (array of strings)

**Response Status:** `201 Created`

**Response Body:**

```json
{
  "success": true,
  "data": {
    "page": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "slug": "terms-and-conditions",
      "title": "Terms & Conditions",
      "subtitle": "Please read these terms carefully...",
      "sections": [...],
      "isActive": true,
      "createdAt": "2025-01-27T10:00:00.000Z",
      "updatedAt": "2025-01-27T10:00:00.000Z",
      "createdBy": "65a1b2c3d4e5f6g7h8i9j0k2",
      "updatedBy": "65a1b2c3d4e5f6g7h8i9j0k2"
    }
  },
  "message": "Legal page created successfully"
}
```

**Example Request:**

```bash
curl -X POST "http://localhost:5000/api/v1/admin/content/pages" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "terms-and-conditions",
    "title": "Terms & Conditions",
    "subtitle": "Please read these terms carefully...",
    "sections": [...]
  }'
```

**Example Response (409 Conflict - Duplicate Slug):**

```json
{
  "success": false,
  "message": "Page with slug 'terms-and-conditions' already exists",
  "errors": {
    "slug": ["Page with slug 'terms-and-conditions' already exists"]
  }
}
```

---

#### 5. Update Legal Page

Updates an existing legal page.

**Endpoint:**

```
PUT /admin/content/pages/:slug
```

**Authentication:** Required (Admin)

**URL Parameters:**

- `slug` (string, required) - The page slug to update

**Request Body:**

```json
{
  "title": "Updated Terms & Conditions",
  "subtitle": "Updated subtitle",
  "sections": [...],
  "isActive": false
}
```

**Validation Rules:**

- All fields are optional
- Same validation rules as create endpoint apply

**Response Status:** `200 OK`

**Response Body:**

```json
{
  "success": true,
  "data": {
    "page": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "slug": "terms-and-conditions",
      "title": "Updated Terms & Conditions",
      "subtitle": "Updated subtitle",
      "sections": [...],
      "isActive": false,
      "updatedAt": "2025-01-27T11:00:00.000Z",
      "updatedBy": "65a1b2c3d4e5f6g7h8i9j0k2"
    }
  },
  "message": "Legal page updated successfully"
}
```

**Example Request:**

```bash
curl -X PUT "http://localhost:5000/api/v1/admin/content/pages/terms-and-conditions" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Terms & Conditions",
    "isActive": false
  }'
```

---

#### 6. Delete Legal Page

Soft deletes a legal page by setting `isActive` to `false`.

**Endpoint:**

```
DELETE /admin/content/pages/:slug
```

**Authentication:** Required (Admin)

**URL Parameters:**

- `slug` (string, required) - The page slug to delete

**Response Status:** `200 OK`

**Response Body:**

```json
{
  "success": true,
  "data": null,
  "message": "Legal page deleted successfully"
}
```

**Example Request:**

```bash
curl -X DELETE "http://localhost:5000/api/v1/admin/content/pages/terms-and-conditions" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

**Example Response (404 Not Found):**

```json
{
  "success": false,
  "message": "Page with slug 'invalid-slug' does not exist",
  "errors": {
    "slug": ["Page with slug 'invalid-slug' does not exist"]
  }
}
```

---

## FAQs API

### Public Endpoints

#### 1. Get All FAQs

Retrieves all frequently asked questions, optionally filtered by category.

**Endpoint:**

```
GET /content/faqs
```

**Authentication:** Not required (public endpoint)

**Query Parameters:**

- `category` (string, optional) - Filter FAQs by category. Valid categories:
  - `General`
  - `Competitions`
  - `Draws`
  - `Payments`
  - `Account`
  - `Prizes`
  - `Technical`

  Category matching is case-insensitive.

**Response Status:** `200 OK`

**Response Body:**

```json
{
  "success": true,
  "data": {
    "faqs": [
      {
        "id": "faq-001",
        "category": "General",
        "question": "How do I enter a competition?",
        "answer": "To enter a competition, select your desired competition from the homepage or competitions page. Answer the skill-based qualifying question correctly, choose your ticket quantity (up to 20 tickets per competition), and complete the checkout process. Once payment is confirmed, your entries will be registered."
      },
      {
        "id": "faq-002",
        "category": "Draws",
        "question": "How are winners selected?",
        "answer": "Winners are selected through a random draw process using independent random number generation software. All draws are conducted fairly and transparently, and we broadcast every draw live to ensure complete transparency. The winning ticket number is randomly selected from all valid entries."
      }
    ]
  },
  "message": "FAQs retrieved successfully"
}
```

**Example Request (All FAQs):**

```bash
curl -X GET "http://localhost:5000/api/v1/content/faqs" \
  -H "Content-Type: application/json"
```

**Example Request (Filtered by Category):**

```bash
curl -X GET "http://localhost:5000/api/v1/content/faqs?category=Payments" \
  -H "Content-Type: application/json"
```

**Example Response (Empty Result):**

```json
{
  "success": true,
  "data": {
    "faqs": []
  },
  "message": "No FAQs found for the specified category"
}
```

---

### Admin Endpoints

#### 2. Get All FAQs (Admin)

Retrieves all FAQs including inactive ones.

**Endpoint:**

```
GET /admin/content/faqs
```

**Authentication:** Required (Admin)

**Response Status:** `200 OK`

**Response Body:**

```json
{
  "success": true,
  "data": {
    "faqs": [
      {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
        "id": "faq-001",
        "question": "How do I enter a competition?",
        "answer": "To enter a competition...",
        "category": "General",
        "order": 0,
        "isActive": true,
        "createdAt": "2025-01-10T10:00:00.000Z",
        "updatedAt": "2025-01-15T10:30:00.000Z",
        "createdBy": "65a1b2c3d4e5f6g7h8i9j0k2",
        "updatedBy": "65a1b2c3d4e5f6g7h8i9j0k2"
      }
    ]
  },
  "message": "FAQs retrieved successfully"
}
```

---

#### 3. Get FAQ by ID (Admin)

Retrieves a single FAQ by its public ID.

**Endpoint:**

```
GET /admin/content/faqs/:id
```

**Authentication:** Required (Admin)

**URL Parameters:**

- `id` (string, required) - The FAQ ID (format: `faq-XXX`, e.g., `faq-001`)

**Response Status:** `200 OK`

**Response Body:**

```json
{
  "success": true,
  "data": {
    "faq": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "id": "faq-001",
      "question": "How do I enter a competition?",
      "answer": "To enter a competition...",
      "category": "General",
      "order": 0,
      "isActive": true,
      "createdAt": "2025-01-10T10:00:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    }
  },
  "message": "FAQ retrieved successfully"
}
```

---

#### 4. Create FAQ

Creates a new FAQ.

**Endpoint:**

```
POST /admin/content/faqs
```

**Authentication:** Required (Admin)

**Request Body:**

```json
{
  "id": "faq-001",
  "question": "How do I enter a competition?",
  "answer": "To enter a competition, select your desired competition from the homepage or competitions page. Answer the skill-based qualifying question correctly, choose your ticket quantity (up to 20 tickets per competition), and complete the checkout process. Once payment is confirmed, your entries will be registered.",
  "category": "General",
  "order": 0,
  "isActive": true
}
```

**Validation Rules:**

- `id` (required): Must match pattern `faq-XXX` where XXX is 3 digits (e.g., `faq-001`)
- `question` (required): 1-500 characters
- `answer` (required): 1-5000 characters
- `category` (optional): Must be one of: `General`, `Competitions`, `Draws`, `Payments`, `Account`, `Prizes`, `Technical`
- `order` (optional): Integer >= 0 (default: 0)
- `isActive` (optional): Boolean (default: true)

**Response Status:** `201 Created`

**Response Body:**

```json
{
  "success": true,
  "data": {
    "faq": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "id": "faq-001",
      "question": "How do I enter a competition?",
      "answer": "To enter a competition...",
      "category": "General",
      "order": 0,
      "isActive": true,
      "createdAt": "2025-01-27T10:00:00.000Z",
      "updatedAt": "2025-01-27T10:00:00.000Z",
      "createdBy": "65a1b2c3d4e5f6g7h8i9j0k2",
      "updatedBy": "65a1b2c3d4e5f6g7h8i9j0k2"
    }
  },
  "message": "FAQ created successfully"
}
```

**Example Request:**

```bash
curl -X POST "http://localhost:5000/api/v1/admin/content/faqs" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "faq-001",
    "question": "How do I enter a competition?",
    "answer": "To enter a competition...",
    "category": "General",
    "order": 0
  }'
```

**Example Response (409 Conflict - Duplicate ID):**

```json
{
  "success": false,
  "message": "FAQ with ID 'faq-001' already exists",
  "errors": {
    "id": ["FAQ with ID 'faq-001' already exists"]
  }
}
```

---

#### 5. Update FAQ

Updates an existing FAQ.

**Endpoint:**

```
PUT /admin/content/faqs/:id
```

**Authentication:** Required (Admin)

**URL Parameters:**

- `id` (string, required) - The FAQ ID (format: `faq-XXX`)

**Request Body:**

```json
{
  "question": "Updated question?",
  "answer": "Updated answer...",
  "category": "Competitions",
  "order": 1,
  "isActive": false
}
```

**Validation Rules:**

- All fields are optional
- Same validation rules as create endpoint apply

**Response Status:** `200 OK`

**Response Body:**

```json
{
  "success": true,
  "data": {
    "faq": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "id": "faq-001",
      "question": "Updated question?",
      "answer": "Updated answer...",
      "category": "Competitions",
      "order": 1,
      "isActive": false,
      "updatedAt": "2025-01-27T11:00:00.000Z",
      "updatedBy": "65a1b2c3d4e5f6g7h8i9j0k2"
    }
  },
  "message": "FAQ updated successfully"
}
```

**Example Request:**

```bash
curl -X PUT "http://localhost:5000/api/v1/admin/content/faqs/faq-001" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Updated question?",
    "isActive": false
  }'
```

---

#### 6. Delete FAQ

Soft deletes an FAQ by setting `isActive` to `false`.

**Endpoint:**

```
DELETE /admin/content/faqs/:id
```

**Authentication:** Required (Admin)

**URL Parameters:**

- `id` (string, required) - The FAQ ID (format: `faq-XXX`)

**Response Status:** `200 OK`

**Response Body:**

```json
{
  "success": true,
  "data": null,
  "message": "FAQ deleted successfully"
}
```

**Example Request:**

```bash
curl -X DELETE "http://localhost:5000/api/v1/admin/content/faqs/faq-001" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

---

## TypeScript Interfaces

### Legal Page Interfaces

```typescript
interface LegalPageContent {
  slug: string;
  title: string;
  subtitle?: string;
  updatedAt?: string;
  sections: LegalSection[];
}

interface LegalSection {
  heading: string;
  body: string[];
  list?: {
    title?: string;
    items: string[];
  };
}

interface LegalPageFull {
  _id: string;
  slug: string;
  title: string;
  subtitle?: string;
  sections: LegalSection[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}
```

### FAQ Interfaces

```typescript
interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

interface FAQFull {
  _id: string;
  id: string;
  question: string;
  answer: string;
  category?: string;
  order?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}
```

---

## Error Handling

### Common Error Responses

**400 Bad Request:**

```json
{
  "success": false,
  "message": "Invalid request parameters",
  "errors": {
    "slug": ["Slug must be a valid string"]
  }
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
  "message": "Page with slug 'invalid-slug' does not exist",
  "errors": {
    "slug": ["Page with slug 'invalid-slug' does not exist"]
  }
}
```

**409 Conflict:**

```json
{
  "success": false,
  "message": "Page with slug 'terms-and-conditions' already exists",
  "errors": {
    "slug": ["Page with slug 'terms-and-conditions' already exists"]
  }
}
```

**422 Validation Error:**

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "title": ["Title is required"],
    "sections": ["Sections must contain at least one section"]
  }
}
```

**500 Internal Server Error:**

```json
{
  "success": false,
  "message": "An internal server error occurred. Please try again later."
}
```

---

## Validation Rules

### Legal Page Slug Validation

- Must be lowercase
- Can contain hyphens and numbers
- Valid slugs: `terms-and-conditions`, `terms-of-use`, `acceptable-use`, `privacy-policy`, `complaints-procedure`, `how-it-works`
- Invalid slugs will return 404 or validation error

### FAQ ID Validation

- Must match pattern: `faq-XXX` where XXX is exactly 3 digits
- Examples: `faq-001`, `faq-123`, `faq-999`
- Must be unique across all FAQs

### FAQ Category Validation

- Case-insensitive matching for query parameters
- Valid categories: `General`, `Competitions`, `Draws`, `Payments`, `Account`, `Prizes`, `Technical`
- If category doesn't exist in query, returns empty array (not an error)
- Category field in request body must match exactly (case-sensitive)

---

## Soft Delete Behavior

Both Legal Pages and FAQs use soft delete:

- Delete operations set `isActive: false` instead of removing the record
- Public endpoints only return items where `isActive: true`
- Admin endpoints can see and manage all items regardless of `isActive` status
- Deleted items can be restored by updating `isActive: true`

---

## Audit Trail

All create and update operations track:

- `createdBy`: User ID who created the record
- `updatedBy`: User ID who last updated the record
- `createdAt`: Timestamp when record was created
- `updatedAt`: Timestamp when record was last updated

These fields are automatically managed by the system.

---

## Sorting and Ordering

### Legal Pages

- Admin list: Sorted by `createdAt` descending (newest first)

### FAQs

- Public list: Sorted by `order` ascending, then `createdAt` descending
- Admin list: Same sorting as public

---

## Rate Limiting

All endpoints are subject to rate limiting as configured in the application. Rate limit headers are included in responses:

- `X-RateLimit-Limit`: Maximum number of requests
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when rate limit resets

---

## Testing Examples

### Test Legal Page Operations

```bash
# Get public page
curl -X GET "http://localhost:5000/api/v1/content/pages/terms-and-conditions"

# Get all pages (admin)
curl -X GET "http://localhost:5000/api/v1/admin/content/pages" \
  -H "Authorization: Bearer <token>"

# Create page (admin)
curl -X POST "http://localhost:5000/api/v1/admin/content/pages" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "terms-and-conditions",
    "title": "Terms & Conditions",
    "sections": [{
      "heading": "Test",
      "body": ["Test content"]
    }]
  }'

# Update page (admin)
curl -X PUT "http://localhost:5000/api/v1/admin/content/pages/terms-and-conditions" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title"}'

# Delete page (admin)
curl -X DELETE "http://localhost:5000/api/v1/admin/content/pages/terms-and-conditions" \
  -H "Authorization: Bearer <token>"
```

### Test FAQ Operations

```bash
# Get all FAQs
curl -X GET "http://localhost:5000/api/v1/content/faqs"

# Get FAQs by category
curl -X GET "http://localhost:5000/api/v1/content/faqs?category=Payments"

# Get all FAQs (admin)
curl -X GET "http://localhost:5000/api/v1/admin/content/faqs" \
  -H "Authorization: Bearer <token>"

# Create FAQ (admin)
curl -X POST "http://localhost:5000/api/v1/admin/content/faqs" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "faq-001",
    "question": "Test question?",
    "answer": "Test answer",
    "category": "General"
  }'

# Update FAQ (admin)
curl -X PUT "http://localhost:5000/api/v1/admin/content/faqs/faq-001" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"question": "Updated question?"}'

# Delete FAQ (admin)
curl -X DELETE "http://localhost:5000/api/v1/admin/content/faqs/faq-001" \
  -H "Authorization: Bearer <token>"
```

---

## Notes for Implementation

1. **Content Storage:** Content is stored in MongoDB, allowing easy updates without code deployments.

2. **Versioning:** The `updatedAt` field allows frontend to display "Last updated" information to users.

3. **Internationalization:** If multi-language support is needed in the future, consider adding a `locale` field to both models.

4. **Rich Text:** If legal pages need rich text formatting (bold, links, etc.), consider storing content as Markdown or HTML and parsing it on the frontend.

5. **Search:** For FAQs, consider adding a search endpoint (`GET /content/faqs/search?q=payment`) for better user experience.

6. **Analytics:** Track which FAQs are viewed most frequently to identify common user questions.

7. **Caching:** Consider implementing caching for public endpoints:
   - Legal Pages: Cache for 1 hour (content changes infrequently)
   - FAQs: Cache for 30 minutes (may be updated more frequently)
   - Implement cache invalidation when content is updated via admin panel

---

This documentation provides a complete specification for implementing content management endpoints in the Royal Competitions platform. All endpoints follow the established API patterns and response formats used throughout the platform.

