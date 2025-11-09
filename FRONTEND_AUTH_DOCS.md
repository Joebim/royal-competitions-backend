# Frontend Authentication Documentation

## Overview

The Royal Competitions backend now uses **cookie-based authentication** instead of JWT tokens in response bodies. This provides better security and simpler frontend implementation.

## Base URL

```
http://localhost:5000/api/v1
```

## Authentication Flow

### 1. User Registration

**Endpoint:** `POST /auth/register`

**Request Body:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "securePassword123",
  "subscribedToNewsletter": true
}
```

**Response:**

```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "data": {
    "user": {
      "_id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "isActive": true,
      "role": "USER",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Important:**

- ✅ **Cookies are automatically set** - no need to store tokens manually
- ✅ **Include credentials** in all requests (see configuration below)

---

### 2. User Login

**Endpoint:** `POST /auth/login`

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "isActive": true,
      "role": "USER"
    }
  }
}
```

**Important:**

- ✅ **Cookies are automatically set** - no need to store tokens manually
- ✅ **Include credentials** in all requests (see configuration below)

---

### 3. Get User Profile

**Endpoint:** `GET /auth/profile`

**Headers:** None required (uses cookies)

**Response:**

```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "_id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "isActive": true,
      "role": "USER"
    }
  }
}
```

---

### 4. Refresh Token

**Endpoint:** `POST /auth/refresh`

**Headers:** None required (uses cookies)

**Response:**

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": null
}
```

**When to use:**

- When you get a 401 error on protected routes
- Automatically refresh tokens before they expire
- No need to handle this manually in most cases

---

### 5. Logout

**Endpoint:** `POST /auth/logout`

**Headers:** None required (uses cookies)

**Response:**

```json
{
  "success": true,
  "message": "Logout successful",
  "data": null
}
```

**Important:**

- ✅ **Cookies are automatically cleared** - no manual cleanup needed

---

## Frontend Configuration

### Axios Configuration

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
  withCredentials: true, // 🔥 CRITICAL: Include cookies in requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try to refresh token
      try {
        await api.post('/auth/refresh');
        // Retry original request
        return api.request(error.config);
      } catch (refreshError) {
        // Redirect to login
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Fetch Configuration

```javascript
const apiCall = async (url, options = {}) => {
  const response = await fetch(`http://localhost:5000/api/v1${url}`, {
    ...options,
    credentials: 'include', // 🔥 CRITICAL: Include cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    // Try to refresh token
    try {
      await fetch('http://localhost:5000/api/v1/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      // Retry original request
      return fetch(`http://localhost:5000/api/v1${url}`, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
    } catch (refreshError) {
      // Redirect to login
      window.location.href = '/login';
    }
  }

  return response;
};
```

---

## React/Next.js Examples

### React Hook for Authentication

```javascript
import { useState, useEffect, createContext, useContext } from 'react';
import api from './api'; // Your configured axios instance

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      setUser(response.data.data.user);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      setUser(response.data.data.user);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const checkAuth = async () => {
    try {
      const response = await api.get('/auth/profile');
      setUser(response.data.data.user);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### Protected Route Component

```javascript
import { useAuth } from './AuthContext';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
```

### Login Component Example

```javascript
import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        required
      />
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};

export default LoginForm;
```

---

## Error Handling

### Common Error Responses

```javascript
// 401 Unauthorized
{
  "success": false,
  "message": "Not authorized to access this route"
}

// 400 Bad Request
{
  "success": false,
  "message": "User already exists"
}

// 403 Forbidden
{
  "success": false,
  "message": "Account is deactivated"
}
```

### Error Handling Strategy

1. **401 Errors**: Try to refresh token, then redirect to login if refresh fails
2. **403 Errors**: Show account deactivated message
3. **400 Errors**: Show validation errors to user
4. **Network Errors**: Show connection error message

---

## Security Notes

### Cookie Security Features

- ✅ **HttpOnly**: Cookies cannot be accessed via JavaScript (XSS protection)
- ✅ **Secure**: Cookies only sent over HTTPS in production
- ✅ **SameSite**: CSRF protection
- ✅ **Automatic Expiry**: Tokens expire automatically

### Best Practices

1. **Always include credentials** in requests (`withCredentials: true` or `credentials: 'include'`)
2. **Handle 401 errors** by attempting token refresh
3. **Don't store tokens manually** - cookies handle this automatically
4. **Clear user state on logout** - even though cookies are cleared server-side
5. **Check authentication status** on app initialization

---

## Migration from Token-Based Auth

### What Changed

| Before (Token-based)                       | After (Cookie-based)       |
| ------------------------------------------ | -------------------------- |
| Store token in localStorage                | No manual token storage    |
| Add `Authorization: Bearer <token>` header | No headers needed          |
| Handle token expiry manually               | Automatic refresh handling |
| Clear localStorage on logout               | Call logout endpoint       |

### Migration Steps

1. Remove all token storage/retrieval code
2. Add `withCredentials: true` to all API calls
3. Remove `Authorization` headers
4. Add automatic 401 error handling with refresh
5. Update logout to call the logout endpoint

---

## Testing

### Test Authentication Flow

```javascript
// Test login
const testLogin = async () => {
  const response = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'password123',
    }),
  });

  const data = await response.json();
  console.log('Login response:', data);
};

// Test protected route
const testProfile = async () => {
  const response = await fetch('http://localhost:5000/api/v1/auth/profile', {
    credentials: 'include',
  });

  const data = await response.json();
  console.log('Profile response:', data);
};
```

---

## Support

If you encounter any issues:

1. Check that `withCredentials: true` is set on all requests
2. Verify cookies are being sent in browser dev tools
3. Check for CORS issues (should be resolved)
4. Ensure the backend is running on the correct port

For additional help, check the backend logs or contact the backend team.
