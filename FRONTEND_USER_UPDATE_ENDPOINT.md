# User Profile Update Endpoint

## Overview

This endpoint allows authenticated users to update their own profile information including first name, last name, phone number, and newsletter subscription status.

---

## Endpoint

**PUT** `/api/v1/users/me`  
**PATCH** `/api/v1/users/me`

Both HTTP methods are supported for flexibility.

---

## Authentication

**Required**: Yes  
**Type**: Bearer Token (JWT)

Include the authentication token in the request headers:
```
Authorization: Bearer <your_jwt_token>
```

---

## Request Body

All fields are optional. At least one field must be provided.

```json
{
  "firstName": "string (optional, min: 2, max: 50)",
  "lastName": "string (optional, min: 2, max: 50)",
  "phone": "string (optional, UK phone number format) | null",
  "isSubscribed": "boolean (optional)",
  "subscribedToNewsletter": "boolean (optional)" // Alternative field name
}
```

### Field Details

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `firstName` | string | No | First name (2-50 characters) |
| `lastName` | string | No | Last name (2-50 characters) |
| `phone` | string \| null | No | UK phone number (e.g., `+447123456789` or `07123456789`). Can be `null` to remove phone number |
| `isSubscribed` | boolean | No | Newsletter subscription status. Maps to `subscribedToNewsletter` in the database |
| `subscribedToNewsletter` | boolean | No | Alternative field name for subscription status |

### Phone Number Format

- Must be a valid UK phone number
- Formats accepted:
  - `+447123456789` (with country code)
  - `07123456789` (without country code)
- Spaces and dashes are automatically removed
- Can be `null` or empty string to remove phone number

---

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "_id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "+447123456789",
      "subscribedToNewsletter": true,
      "isVerified": true,
      "isActive": true,
      "role": "user",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### Error Responses

#### 400 Bad Request - No Updates Provided
```json
{
  "success": false,
  "message": "No updates provided",
  "statusCode": 400
}
```

#### 400 Bad Request - Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "firstName": ["First name must be at least 2 characters"],
    "phone": ["Phone number must be a valid UK number (e.g., +447123456789 or 07123456789)"]
  },
  "statusCode": 400
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Not authorized",
  "statusCode": 401
}
```

#### 404 Not Found
```json
{
  "success": false,
  "message": "User not found",
  "statusCode": 404
}
```

---

## Usage Examples

### Example 1: Update First Name and Last Name

```javascript
const response = await fetch('https://api.royalcompetitions.co.uk/api/v1/users/me', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    firstName: 'John',
    lastName: 'Smith'
  })
});

const data = await response.json();
```

### Example 2: Update Phone Number

```javascript
const response = await fetch('https://api.royalcompetitions.co.uk/api/v1/users/me', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    phone: '+447123456789'
  })
});

const data = await response.json();
```

### Example 3: Update Subscription Status

```javascript
const response = await fetch('https://api.royalcompetitions.co.uk/api/v1/users/me', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    isSubscribed: true
  })
});

const data = await response.json();
```

### Example 4: Remove Phone Number

```javascript
const response = await fetch('https://api.royalcompetitions.co.uk/api/v1/users/me', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    phone: null
  })
});

const data = await response.json();
```

### Example 5: Update All Fields

```javascript
const response = await fetch('https://api.royalcompetitions.co.uk/api/v1/users/me', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    firstName: 'Jane',
    lastName: 'Doe',
    phone: '+447987654321',
    isSubscribed: false
  })
});

const data = await response.json();
```

---

## React/Next.js Example

```typescript
import { useState } from 'react';

interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  isSubscribed?: boolean;
}

const useUpdateProfile = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = async (data: UpdateProfileData, token: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update profile');
      }

      return result.data.user;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateProfile, loading, error };
};

// Usage in component
const ProfileForm = () => {
  const { updateProfile, loading, error } = useUpdateProfile();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    isSubscribed: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token'); // Get token from your auth system
      const updatedUser = await updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || null,
        isSubscribed: formData.isSubscribed
      }, token!);
      
      console.log('Profile updated:', updatedUser);
      // Handle success (e.g., show success message, update state)
    } catch (err) {
      console.error('Failed to update profile:', err);
      // Handle error (e.g., show error message)
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Updating...' : 'Update Profile'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
};
```

---

## Notes

1. **Partial Updates**: You can update one or more fields at a time. Only the fields you provide will be updated.

2. **Phone Number**: 
   - Can be set to `null` to remove the phone number
   - Must match UK phone number format if provided
   - Spaces and dashes are automatically removed during validation

3. **Subscription Field**: 
   - The endpoint accepts both `isSubscribed` and `subscribedToNewsletter`
   - Both map to the same database field (`subscribedToNewsletter`)
   - If both are provided, `isSubscribed` takes precedence

4. **Validation**: 
   - All validations are performed server-side
   - Invalid data will return a 400 error with detailed validation messages

5. **Security**: 
   - Users can only update their own profile
   - The endpoint uses the authenticated user's ID from the JWT token
   - No need to provide user ID in the request

---

## Related Endpoints

- **GET** `/api/v1/users/me/profile` - Get user profile with statistics
- **PUT** `/api/v1/auth/profile` - Alternative profile update endpoint (same functionality)

