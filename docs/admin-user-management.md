# Admin User Management API

This guide explains how the Royal Competitions frontend can manage users from the admin dashboard using the new `/admin/users` endpoints. All examples assume the API is served under the base URL `https://api.royalcompetitions.com`—adjust as needed for your environments.

## Authentication

- All routes require an `Authorization: Bearer <JWT>` header for an authenticated admin or super-admin user.
- Requests should be sent with `Content-Type: application/json` unless a different content type is stated.

## Available Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| `POST` | `/admin/users` | Create a new user on behalf of the customer support team. |
| `GET` | `/admin/users` | List users with pagination, filtering, and search. |
| `GET` | `/admin/users/:id` | Retrieve a single user by ID. |
| `PUT`/`PATCH` | `/admin/users/:id` | Update profile, role, or newsletter flags. |
| `PATCH` | `/admin/users/:id/status` | Toggle `isActive` or explicitly set it. |
| `POST` | `/admin/users/:id/reset-password` | Reset the user's password. |
| `DELETE` | `/admin/users/:id` | Delete a user (self-deletion is blocked). |

> The same functionality is mirrored under `/users` for existing integrations. Use the `/admin` namespace for new frontend work.

## Common Response Format

All endpoints return the shared `ApiResponse` wrapper:

```json
{
  "success": true,
  "message": "Action performed message",
  "data": { ... },
  "meta": { ... }
}
```

Errors return `success: false` and include human‑readable `message` values, along with optional validation error details at `errors`.

---

## 1. Create a User

- **Endpoint:** `POST /admin/users`
- **Purpose:** Customer support can create customer or admin accounts.

### Required Body

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane.doe@example.com",
  "password": "StrongPass123!",
  "role": "user",
  "phone": "+447123456789",
  "isVerified": true,
  "isActive": true,
  "subscribedToNewsletter": false
}
```

Only `firstName`, `lastName`, `email`, and `password` are required. Optional booleans default to sensible values (`isVerified: false`, `isActive: true`, `subscribedToNewsletter: false`).

### Sample Response

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "_id": "6730f9c1f4f3e7aa2b6a1234",
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane.doe@example.com",
      "phone": "+447123456789",
      "role": "user",
      "isVerified": true,
      "isActive": true,
      "subscribedToNewsletter": false,
      "createdAt": "2025-11-10T10:30:00.000Z",
      "updatedAt": "2025-11-10T10:30:00.000Z"
    }
  }
}
```

---

## 2. List Users

- **Endpoint:** `GET /admin/users`
- **Query Parameters:**
  - `page` (number, default `1`)
  - `limit` (number, default `25`)
  - `role` (`user`, `admin`, `super_admin`)
  - `status` (`active` or `inactive`)
  - `search` (case-insensitive match against first name, last name, email)

### Sample Request

```
GET /admin/users?search=jane&page=1&limit=20
Authorization: Bearer <token>
```

### Sample Response

```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "_id": "6730f9c1f4f3e7aa2b6a1234",
        "firstName": "Jane",
        "lastName": "Doe",
        "email": "jane.doe@example.com",
        "role": "user",
        "isActive": true,
        "isVerified": true,
        "subscribedToNewsletter": false,
        "createdAt": "2025-11-10T10:30:00.000Z",
        "updatedAt": "2025-11-10T10:30:00.000Z"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 1,
      "totalPages": 1
    }
  }
}
```

---

## 3. Retrieve a User

- **Endpoint:** `GET /admin/users/:id`

Use this for detail views or when pre-filling edit forms. Response structure mirrors the `users` array items above.

---

## 4. Update a User

- **Endpoint:** `PUT /admin/users/:id` or `PATCH /admin/users/:id`
- **Body:** Any combination of the allowed fields below. At least one property must be supplied.

```json
{
  "firstName": "Janet",
  "lastName": "Doe",
  "email": "janet.doe@example.com",
  "phone": "+447198765432",
  "role": "admin",
  "isVerified": true,
  "isActive": true,
  "subscribedToNewsletter": true
}
```

> Password changes are not permitted here—use the reset password endpoint.

---

## 5. Toggle or Set Status

- **Endpoint:** `PATCH /admin/users/:id/status`
- **Body Options:**
  - No body: the backend flips the current `isActive` value.
  - Or explicitly send `{ "isActive": false }` to set a specific state.

### Sample Response

```json
{
  "success": true,
  "message": "User status updated successfully",
  "data": {
    "user": {
      "_id": "6730f9c1f4f3e7aa2b6a1234",
      "isActive": false,
      "...": "other user fields"
    },
    "status": "inactive"
  }
}
```

Use the `status` field to update UI badges/icons immediately.

---

## 6. Reset Password

- **Endpoint:** `POST /admin/users/:id/reset-password`
- **Body:** `{ "password": "NewSecurePass123!" }`

The backend re-hashes the provided password and clears outstanding reset tokens. The refreshed user object is returned for confirmation.

---

## 7. Delete a User

- **Endpoint:** `DELETE /admin/users/:id`
- **Notes:**
  - Admins cannot delete their own account; the API returns a `400` error if they try.
  - Consider prompting for confirmation in the UI before calling this endpoint.

### Successful Response

```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": null
}
```

---

## Frontend Integration Tips

- Refresh the relevant lists or cached queries after create/update/delete to keep the UI in sync.
- Handle `409` responses from the create route to display “email already in use” messaging.
- For forms that toggle status or reset passwords, optimistically update the UI using the returned user payload.
- Always wrap requests in error handling that surfaces `message` from failed responses to the admin user.



