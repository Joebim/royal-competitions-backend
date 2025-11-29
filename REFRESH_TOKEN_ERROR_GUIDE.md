# Refresh Token Error Guide

## Error: "Refresh token not provided"

This error occurs when the backend cannot find the `refreshToken` cookie in the request.

---

## Common Causes

### 1. **Frontend Not Sending Cookies**

The most common cause is that the frontend is not including cookies in API requests.

**Solution for Axios:**
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
  withCredentials: true, // ✅ CRITICAL: Must be true
  headers: {
    'Content-Type': 'application/json',
  },
});
```

**Solution for Fetch:**
```javascript
fetch('http://localhost:5000/api/v1/auth/refresh', {
  method: 'POST',
  credentials: 'include', // ✅ CRITICAL: Must be 'include'
  headers: {
    'Content-Type': 'application/json',
  },
});
```

---

### 2. **User Not Logged In**

If the user hasn't logged in, there's no refresh token cookie set.

**Solution:**
- Ensure users log in first before trying to refresh tokens
- Check if the login/register endpoints are setting cookies correctly

---

### 3. **Cookie Settings Mismatch**

If cookies are set with `secure: true` but the frontend is using `http://`, cookies won't be sent.

**Check cookie configuration in `.env`:**
```env
# For development (http://localhost)
NODE_ENV=development

# Cookies will be:
# - secure: false (in development)
# - sameSite: 'lax' (default)
```

**For production (https://):**
```env
NODE_ENV=production

# Cookies will be:
# - secure: true (in production)
# - sameSite: 'strict' or 'lax'
```

---

### 4. **CORS Configuration**

CORS must allow credentials.

**Backend CORS (already configured):**
```typescript
cors({
  origin: config.allowedOrigins,
  credentials: true, // ✅ Must be true
})
```

**Frontend must match:**
- Use `withCredentials: true` (Axios)
- Use `credentials: 'include'` (Fetch)

---

### 5. **Cookie Domain/Path Issues**

If the frontend and backend are on different domains, cookies might not be sent.

**Development:**
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- ✅ Works if `withCredentials: true` is set

**Production:**
- Frontend: `https://royalcompetitions.co.uk`
- Backend: `https://api.royalcompetitions.co.uk`
- ✅ Works if CORS is configured correctly

---

## How to Debug

### 1. Check Browser DevTools

**Application Tab → Cookies:**
- Look for `refreshToken` cookie
- Check if it exists and has a value
- Check cookie domain, path, and expiration

**Network Tab:**
- Check if `Cookie` header is being sent in requests
- Look for `Set-Cookie` header in responses

### 2. Check Backend Logs

The backend now logs when refresh token is missing:
```
Refresh token not found in cookies
{
  cookies: [...],
  headers: {
    cookie: 'present' | 'missing',
    origin: '...'
  }
}
```

### 3. Test Cookie Setting

After login/register, check if cookies are set:
```javascript
// After successful login
console.log(document.cookie); // Should show authToken and refreshToken
```

---

## Frontend Implementation Checklist

### ✅ Axios Configuration
```javascript
const api = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
  withCredentials: true, // ✅ Required
});
```

### ✅ Fetch Configuration
```javascript
fetch(url, {
  credentials: 'include', // ✅ Required
});
```

### ✅ Automatic Token Refresh
```javascript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        // Try to refresh token
        await api.post('/auth/refresh', {}, {
          withCredentials: true, // ✅ Ensure credentials are included
        });
        // Retry original request
        return api.request(error.config);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

---

## Backend Cookie Configuration

Cookies are configured in `src/config/environment.ts`:

```typescript
cookies: {
  secure: process.env.NODE_ENV === 'production', // true in production
  httpOnly: true, // ✅ Always true (security)
  sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax' | 'none',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for access token
  // Refresh token: 4x longer (28 days)
}
```

---

## Testing

### Test 1: Login and Check Cookies
```bash
# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  -c cookies.txt \
  -v

# Check cookies.txt for refreshToken
```

### Test 2: Refresh Token
```bash
# Use saved cookies
curl -X POST http://localhost:5000/api/v1/auth/refresh \
  -b cookies.txt \
  -c cookies.txt \
  -v
```

### Test 3: Check Cookie in Browser
1. Open DevTools → Application → Cookies
2. Look for `refreshToken` cookie
3. Verify it has a value and hasn't expired

---

## Quick Fixes

### If cookies aren't being sent:

1. **Check `withCredentials` / `credentials`**
   ```javascript
   // Axios
   withCredentials: true
   
   // Fetch
   credentials: 'include'
   ```

2. **Check CORS configuration**
   - Backend must have `credentials: true`
   - Frontend origin must be in `allowedOrigins`

3. **Check cookie settings**
   - Development: `secure: false`
   - Production: `secure: true` (requires HTTPS)

4. **Clear cookies and re-login**
   - Sometimes cookies get corrupted
   - Clear all cookies and log in again

---

## Error Response

When refresh token is missing, the backend returns:

```json
{
  "success": false,
  "message": "Refresh token not provided. Please log in again.",
  "statusCode": 401
}
```

**Action:** Redirect user to login page.

---

## Summary

The "Refresh token not provided" error means:
- ❌ The `refreshToken` cookie is not in the request
- ✅ **Fix:** Ensure `withCredentials: true` (Axios) or `credentials: 'include'` (Fetch)
- ✅ **Fix:** Ensure user has logged in (cookie must be set first)
- ✅ **Fix:** Check CORS and cookie configuration

**Most Common Fix:**
```javascript
// Add this to your API client
withCredentials: true  // Axios
// or
credentials: 'include'  // Fetch
```

---

**Last Updated:** 2025-01-24

