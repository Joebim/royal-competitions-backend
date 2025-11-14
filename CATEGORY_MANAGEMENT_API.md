# Category Management API

This document describes all available endpoints for managing competition categories.

**Base URL:** `/api/v1`

---

## Overview

Categories are used to organize competitions. The system includes default categories that are seeded on first run, and users can add their own categories if they can't find what they need. Categories are automatically created when used in competitions if they don't already exist.

**Default Categories:**

- Luxury Cars
- Tech & Gadgets
- Holidays
- Cash Prizes
- Home & Garden
- Fashion & Watches
- Experiences
- Other

---

## Public Endpoints (No Authentication Required)

### Get All Categories

Get all active categories available for competitions.

**Endpoint:** `GET /api/v1/categories`

**Authentication:** Not required (Public)

**Query Parameters:**

- `includeInactive` (optional) - Set to `true` to include inactive categories (default: `false`)

**Response:**

```json
{
  "success": true,
  "message": "Categories retrieved successfully",
  "data": {
    "categories": [
      {
        "_id": "category_id",
        "name": "Luxury Cars",
        "slug": "luxury-cars",
        "isActive": true,
        "isUserCreated": false,
        "usageCount": 15,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      },
      {
        "_id": "category_id_2",
        "name": "Custom Category",
        "slug": "custom-category",
        "isActive": true,
        "isUserCreated": true,
        "createdBy": "user_id",
        "usageCount": 3,
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2024-01-15T10:00:00.000Z"
      }
    ]
  }
}
```

---

### Get Category by Slug

Get a single category by its slug.

**Endpoint:** `GET /api/v1/categories/:slug`

**Authentication:** Not required (Public)

**Parameters:**

- `slug` (path) - Category slug (e.g., `luxury-cars`)

**Response:**

```json
{
  "success": true,
  "message": "Category retrieved successfully",
  "data": {
    "category": {
      "_id": "category_id",
      "name": "Luxury Cars",
      "slug": "luxury-cars",
      "isActive": true,
      "isUserCreated": false,
      "usageCount": 15,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Error Responses:**

- `404` - Category not found

---

### Create Category (User)

Create a new category if you can't find what you need. Categories are automatically approved and available for use.

**Endpoint:** `POST /api/v1/categories`

**Authentication:** Optional (User can be logged in or anonymous)

**Request Body:**

```json
{
  "name": "Electronics"
}
```

**Request Body Fields:**

- `name` (required) - Category name (2-100 characters)

**Response:**

```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "category": {
      "_id": "category_id",
      "name": "Electronics",
      "slug": "electronics",
      "isActive": true,
      "isUserCreated": true,
      "createdBy": "user_id",
      "usageCount": 0,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

**Error Responses:**

- `400` - Category name is required, validation errors
- `409` - Category with this name already exists

**Notes:**

- Categories are automatically approved (`isActive: true`)
- If a user is logged in, the category is linked to their account
- The slug is automatically generated from the name
- Categories are case-insensitive (duplicate names are prevented)

---

## Admin Endpoints (Authentication Required)

### Get All Categories (Admin)

Get all categories with pagination and filtering options.

**Endpoint:** `GET /api/v1/admin/categories`

**Authentication:** Required (Admin or Super Admin)

**Query Parameters:**

- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 50)
- `isActive` (optional) - Filter by active status (`true` or `false`)
- `isUserCreated` (optional) - Filter by user-created status (`true` or `false`)
- `search` (optional) - Search by name

**Response:**

```json
{
  "success": true,
  "message": "Categories retrieved successfully",
  "data": {
    "categories": [
      {
        "_id": "category_id",
        "name": "Luxury Cars",
        "slug": "luxury-cars",
        "isActive": true,
        "isUserCreated": false,
        "usageCount": 15,
        "createdBy": null,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 25,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

---

### Get Category by ID (Admin)

Get a single category by its ID with full details.

**Endpoint:** `GET /api/v1/admin/categories/:id`

**Authentication:** Required (Admin or Super Admin)

**Parameters:**

- `id` (path) - Category ID

**Response:**

```json
{
  "success": true,
  "message": "Category retrieved successfully",
  "data": {
    "category": {
      "_id": "category_id",
      "name": "Luxury Cars",
      "slug": "luxury-cars",
      "isActive": true,
      "isUserCreated": false,
      "usageCount": 15,
      "createdBy": {
        "_id": "admin_id",
        "firstName": "Admin",
        "lastName": "User",
        "email": "admin@example.com"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Error Responses:**

- `404` - Category not found

---

### Create Category (Admin)

Create a new category as an admin.

**Endpoint:** `POST /api/v1/admin/categories`

**Authentication:** Required (Admin or Super Admin)

**Request Body:**

```json
{
  "name": "Sports & Fitness",
  "isActive": true
}
```

**Request Body Fields:**

- `name` (required) - Category name (2-100 characters)
- `isActive` (optional) - Whether the category is active (default: `true`)

**Response:**

```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "category": {
      "_id": "category_id",
      "name": "Sports & Fitness",
      "slug": "sports-fitness",
      "isActive": true,
      "isUserCreated": false,
      "createdBy": "admin_user_id",
      "usageCount": 0,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

**Error Responses:**

- `400` - Category name is required, validation errors
- `409` - Category with this name already exists

---

### Update Category (Admin)

Update an existing category.

**Endpoint:** `PUT /api/v1/admin/categories/:id`

**Authentication:** Required (Admin or Super Admin)

**Parameters:**

- `id` (path) - Category ID

**Request Body:**

```json
{
  "name": "Updated Category Name",
  "isActive": true
}
```

**Request Body Fields:**

- `name` (optional) - Category name (2-100 characters)
- `isActive` (optional) - Whether the category is active

**Response:**

```json
{
  "success": true,
  "message": "Category updated successfully",
  "data": {
    "category": {
      "_id": "category_id",
      "name": "Updated Category Name",
      "slug": "updated-category-name",
      "isActive": true,
      "isUserCreated": false,
      "usageCount": 15,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

**Error Responses:**

- `404` - Category not found
- `409` - Category with this name already exists

**Notes:**

- If the name is updated, the slug is automatically regenerated
- Updating a category name does not affect existing competitions using the old name

---

### Delete Category (Admin)

Soft delete a category by setting it to inactive. Categories cannot be deleted if they are being used by competitions.

**Endpoint:** `DELETE /api/v1/admin/categories/:id`

**Authentication:** Required (Admin or Super Admin)

**Parameters:**

- `id` (path) - Category ID

**Response:**

```json
{
  "success": true,
  "message": "Category deleted successfully",
  "data": null
}
```

**Error Responses:**

- `400` - Category is in use by competitions (cannot delete)
- `404` - Category not found

**Notes:**

- Categories are soft-deleted (set to `isActive: false`)
- Categories cannot be deleted if they are being used by any competitions
- The error message will indicate how many competitions are using the category
- To remove a category from use, first update all competitions to use different categories, then delete

---

## Category Auto-Creation

When creating or updating a competition, if the specified category doesn't exist, it will be automatically created:

- **Auto-created categories** are marked as `isUserCreated: true` if created by a logged-in user
- **Usage count** is automatically incremented when a competition uses a category
- **Usage count** is automatically decremented when a competition is deleted or category is changed

This ensures that:

- Users can use any category name when creating competitions
- Categories are automatically tracked and managed
- The system maintains accurate usage statistics

---

## Frontend Integration Examples

### Get All Categories

```javascript
const getCategories = async (includeInactive = false) => {
  const params = new URLSearchParams();
  if (includeInactive) params.append('includeInactive', 'true');

  const response = await fetch(`/api/v1/categories?${params.toString()}`);
  const data = await response.json();
  return data.data.categories;
};
```

### Get Category by Slug

```javascript
const getCategoryBySlug = async (slug) => {
  const response = await fetch(`/api/v1/categories/${slug}`);
  const data = await response.json();
  return data.data.category;
};
```

### Create Category (User)

```javascript
const createCategory = async (name, token) => {
  const response = await fetch('/api/v1/categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({
      name,
    }),
  });

  const data = await response.json();
  return data.data.category;
};
```

### Get All Categories (Admin)

```javascript
const getAllCategoriesForAdmin = async (
  page = 1,
  limit = 50,
  filters = {},
  token
) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...filters,
  });

  const response = await fetch(
    `/api/v1/admin/categories?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();
  return data.data;
};
```

### Create Category (Admin)

```javascript
const createCategoryForAdmin = async (name, isActive, token) => {
  const response = await fetch('/api/v1/admin/categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name,
      isActive,
    }),
  });

  const data = await response.json();
  return data.data.category;
};
```

### Update Category (Admin)

```javascript
const updateCategoryForAdmin = async (categoryId, updates, token) => {
  const response = await fetch(`/api/v1/admin/categories/${categoryId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });

  const data = await response.json();
  return data.data.category;
};
```

### Delete Category (Admin)

```javascript
const deleteCategoryForAdmin = async (categoryId, token) => {
  const response = await fetch(`/api/v1/admin/categories/${categoryId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  return data;
};
```

---

## Summary Table

| Endpoint                       | Method | Description                | Auth Required | Role Required |
| ------------------------------ | ------ | -------------------------- | ------------- | ------------- |
| **Public Endpoints**           |
| `GET /categories`              | GET    | Get all active categories  | No            | -             |
| `GET /categories/:slug`        | GET    | Get category by slug       | No            | -             |
| `POST /categories`             | POST   | Create category (user)     | Optional      | -             |
| **Admin Endpoints**            |
| `GET /admin/categories`        | GET    | Get all categories (admin) | Yes           | Admin         |
| `POST /admin/categories`       | POST   | Create category (admin)    | Yes           | Admin         |
| `GET /admin/categories/:id`    | GET    | Get category by ID (admin) | Yes           | Admin         |
| `PUT /admin/categories/:id`    | PUT    | Update category (admin)    | Yes           | Admin         |
| `DELETE /admin/categories/:id` | DELETE | Delete category (admin)    | Yes           | Admin         |

---

## Seeding Default Categories

To seed the default categories, run:

```bash
npm run seed:categories
```

This will create the default categories if they don't already exist. The script is idempotent and safe to run multiple times.

---

## Important Notes

1. **Auto-Creation**: Categories are automatically created when used in competitions if they don't exist.

2. **Usage Tracking**: The `usageCount` field tracks how many competitions are using each category. This is automatically maintained.

3. **Slug Generation**: Category slugs are automatically generated from the name (lowercase, spaces replaced with hyphens, special characters removed).

4. **Case Insensitivity**: Category names are case-insensitive. "Luxury Cars" and "luxury cars" are treated as the same category.

5. **User-Created Categories**: Categories created by users are automatically approved and available for use immediately.

6. **Deletion Protection**: Categories cannot be deleted if they are being used by competitions. You must first update all competitions to use different categories.

7. **Competition Integration**: When creating or updating competitions, the category is automatically created if it doesn't exist, and usage counts are maintained.

8. **Category Validation**: Category names must be 2-100 characters and are required when creating competitions.

---

## Category Model Fields

- `name` (String, required, unique) - Category name
- `slug` (String, required, unique) - URL-friendly slug (auto-generated)
- `isActive` (Boolean, default: true) - Whether category is active
- `isUserCreated` (Boolean, default: false) - Whether created by a user
- `createdBy` (ObjectId, optional) - User who created the category
- `usageCount` (Number, default: 0) - Number of competitions using this category
- `createdAt` (Date) - Creation timestamp
- `updatedAt` (Date) - Last update timestamp
