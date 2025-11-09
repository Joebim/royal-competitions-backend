# Admin Authentication Documentation

This document describes the admin authentication system for the Royal Competitions backend API, specifically for super admin access to the admin section of the frontend.

## Overview

The admin authentication system provides:
- **Super Admin Role**: Full access to all admin features
- **Admin Role**: Standard admin access (can be upgraded to super admin)
- **Separate Admin Login Endpoint**: Dedicated login for admin panel
- **Admin Verification**: Endpoint to verify admin status and permissions

## User Roles

### Available Roles

1. **USER** (`user`): Regular user (default)
2. **ADMIN** (`admin`): Standard administrator
3. **SUPER_ADMIN** (`super_admin`): Super administrator with full access

### Role Hierarchy

```
SUPER_ADMIN > ADMIN > USER
```

## Authentication Endpoints

### 1. Admin Login

**Endpoint:** `POST /api/v1/auth/admin/login`

**Description:** Login endpoint specifically for admin users. Only users with `admin` or `super_admin` roles can use this endpoint.

**Request Body:**
```json
{
  "email": "admin@royalcompetitions.co.uk",
  "password": "your_password"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Admin login successful",
  "data": {
    "user": {
      "_id": "user_id",
      "firstName": "Admin",
      "lastName": "User",
      "email": "admin@royalcompetitions.co.uk",
      "role": "super_admin",
      "isVerified": true,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "isAdmin": true,
    "isSuperAdmin": true
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid credentials
- `403 Forbidden`: Account deactivated or not an admin user

**Cookies Set:**
- `authToken`: Authentication token (HttpOnly, Secure)
- `refreshToken`: Refresh token (HttpOnly, Secure)

---

### 2. Verify Admin Status

**Endpoint:** `GET /api/v1/auth/admin/verify`

**Description:** Verify that the current user has admin access and return their admin status.

**Authentication:** Required (via cookie or Bearer token)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Admin access verified",
  "data": {
    "user": {
      "_id": "user_id",
      "firstName": "Admin",
      "lastName": "User",
      "email": "admin@royalcompetitions.co.uk",
      "role": "super_admin"
    },
    "isAdmin": true,
    "isSuperAdmin": true
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin user

---

### 3. Regular Login (Enhanced)

**Endpoint:** `POST /api/v1/auth/login`

**Description:** Regular login endpoint that now also returns admin status information.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "user_id",
      "firstName": "User",
      "lastName": "Name",
      "email": "user@example.com",
      "role": "user",
      "isVerified": true,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "isAdmin": false,
    "isSuperAdmin": false
  }
}
```

---

## Middleware

### Admin Middleware

#### `adminOnly`
Allows access to both `admin` and `super_admin` roles.

```typescript
import { adminOnly } from '../middleware/auth.middleware';

router.get('/admin/route', protect, adminOnly, handler);
```

#### `superAdminOnly`
Allows access only to `super_admin` role.

```typescript
import { superAdminOnly } from '../middleware/auth.middleware';

router.delete('/admin/critical', protect, superAdminOnly, handler);
```

---

## Frontend Integration

### Admin Login Example (Axios)

```typescript
import axios from 'axios';

const loginAdmin = async (email: string, password: string) => {
  try {
    const response = await axios.post(
      'http://localhost:5000/api/v1/auth/admin/login',
      { email, password },
      {
        withCredentials: true, // Important for cookies
      }
    );

    const { user, isAdmin, isSuperAdmin } = response.data.data;

    // Store user info in state/context
    setUser(user);
    setIsAdmin(isAdmin);
    setIsSuperAdmin(isSuperAdmin);

    // Redirect to admin dashboard
    if (isAdmin) {
      router.push('/admin/dashboard');
    }

    return response.data;
  } catch (error) {
    console.error('Admin login failed:', error);
    throw error;
  }
};
```

### Verify Admin Status Example

```typescript
const verifyAdminStatus = async () => {
  try {
    const response = await axios.get(
      'http://localhost:5000/api/v1/auth/admin/verify',
      {
        withCredentials: true,
      }
    );

    const { user, isAdmin, isSuperAdmin } = response.data.data;
    return { user, isAdmin, isSuperAdmin };
  } catch (error) {
    // User is not admin or not authenticated
    return { user: null, isAdmin: false, isSuperAdmin: false };
  }
};
```

### Protect Admin Routes Example (React/Next.js)

```typescript
// middleware.ts or route guard
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { verifyAdminStatus } from '@/services/authService';

export const useAdminAuth = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { isAdmin: admin, isSuperAdmin: superAdmin } = await verifyAdminStatus();
        setIsAdmin(admin);
        setIsSuperAdmin(superAdmin);

        if (!admin) {
          router.push('/login');
        }
      } catch (error) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [router]);

  return { isAdmin, isSuperAdmin, loading };
};

// Usage in component
const AdminDashboard = () => {
  const { isAdmin, isSuperAdmin, loading } = useAdminAuth();

  if (loading) return <Loading />;
  if (!isAdmin) return null;

  return (
    <div>
      <h1>Admin Dashboard</h1>
      {isSuperAdmin && (
        <div>
          <h2>Super Admin Features</h2>
          {/* Super admin only features */}
        </div>
      )}
    </div>
  );
};
```

---

## Creating a Super Admin

### Method 1: Using the Seed Script (Recommended)

1. Set environment variables (optional):
```bash
SUPER_ADMIN_EMAIL=admin@royalcompetitions.co.uk
SUPER_ADMIN_PASSWORD=your_secure_password
SUPER_ADMIN_FIRST_NAME=Super
SUPER_ADMIN_LAST_NAME=Admin
```

2. Run the seed script:
```bash
npm run seed:super-admin
```

Or directly:
```bash
npx ts-node src/scripts/seedSuperAdmin.ts
```

**Note:** The script will:
- Check if a super admin already exists
- Create a new super admin if none exists
- Upgrade an existing user to super admin if the email matches

### Method 2: Manual Creation via Database

```javascript
// In MongoDB shell or via Mongoose
db.users.insertOne({
  firstName: "Super",
  lastName: "Admin",
  email: "admin@royalcompetitions.co.uk",
  password: "$2a$10$...", // bcrypt hashed password
  role: "super_admin",
  isVerified: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});
```

### Method 3: Upgrade Existing User

You can upgrade an existing admin user to super admin by updating the database:

```javascript
db.users.updateOne(
  { email: "admin@royalcompetitions.co.uk" },
  { $set: { role: "super_admin" } }
);
```

---

## Security Considerations

1. **Super Admin Creation**: Should only be done by trusted personnel
2. **Password Security**: Use strong passwords for admin accounts
3. **Token Security**: Tokens are stored in HttpOnly cookies (cannot be accessed via JavaScript)
4. **HTTPS in Production**: Ensure cookies are marked as Secure in production
5. **Rate Limiting**: Admin login endpoints are rate-limited to prevent brute force attacks
6. **Activity Monitoring**: Monitor admin login attempts and actions

---

## API Response Format

All responses follow this structure:

```typescript
{
  success: boolean;
  message: string;
  data?: any;
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "message": "Error message here"
}
```

### Common Error Codes

- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

---

## Testing Admin Authentication

### Test Admin Login

```bash
curl -X POST http://localhost:5000/api/v1/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@royalcompetitions.co.uk","password":"password"}' \
  -c cookies.txt
```

### Test Admin Verification

```bash
curl -X GET http://localhost:5000/api/v1/auth/admin/verify \
  -b cookies.txt
```

---

## Migration Notes

If you're upgrading from a system without super admin:

1. Run the seed script to create your first super admin
2. Update any existing admin users' roles if needed
3. Update frontend to use the new `/admin/login` endpoint
4. Update frontend to check `isSuperAdmin` flag for super admin features

---

## Support

For issues or questions regarding admin authentication, please contact the development team or refer to the main API documentation at `/api-docs`.

