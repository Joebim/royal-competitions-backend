 # Frontend Email Verification Documentation

## Overview

This document provides complete frontend integration guide for email verification functionality, including endpoints, request/response formats, and user flow.

---

## Email Verification Flow

```
┌─────────────────────────────────────────────────────────────┐
│              EMAIL VERIFICATION FLOW                          │
└─────────────────────────────────────────────────────────────┘

1. USER REGISTERS
   ↓
   Email sent with verification link
   ↓
2. USER CLICKS LINK (or uses API)
   ↓
3. EMAIL VERIFIED
   ↓
   User can now access all features
```

---

## Step 1: User Registration

### User Action
User fills out registration form and submits.

### API Endpoint

**POST** `/api/v1/auth/register`

**Request:**
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+441234567890",
  "password": "SecurePassword123!",
  "subscribedToNewsletter": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "691d4633526cd4c76ba09d93",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "+441234567890",
      "role": "user",
      "isVerified": false,
      "isActive": true,
      "subscribedToNewsletter": true,
      "createdAt": "2025-11-19T04:00:00Z"
    }
  },
  "message": "Registration successful. Please check your email to verify your account."
}
```

**What Happens:**
- User account is created
- Verification token is generated
- **Verification email is sent** with luxury template ✅
- User receives email with verification link
- User's `isVerified` status is `false` until verified

### Frontend Implementation
```typescript
// Register user
const register = async (userData: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  subscribedToNewsletter?: boolean;
}) => {
  const response = await fetch('/api/v1/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData)
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Show success message
    // Display: "Please check your email to verify your account"
    // Redirect to email verification page or show instructions
  }
};
```

---

## Step 2: Email Verification

### User Action
User clicks verification link in email OR uses verification API endpoint.

### Email Template
The user receives a luxury email with:
- **Navy and Gold branding**
- **Montserrat font**
- Verification button
- Verification link (for copy/paste)
- Expiration notice (24 hours)

### API Endpoints

#### Option A: GET Request (Clickable Link)
**GET** `/api/v1/auth/verify-email?token=<verification_token>`

**Request:**
```http
GET /api/v1/auth/verify-email?token=abc123def456...
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": null
}
```

**Response (Already Verified):**
```json
{
  "success": true,
  "message": "Email is already verified",
  "data": null
}
```

**Response (Error - Invalid/Expired Token):**
```json
{
  "success": false,
  "message": "Invalid or expired verification token",
  "statusCode": 400
}
```

#### Option B: POST Request (API Call)
**POST** `/api/v1/auth/verify-email`

**Request:**
```http
POST /api/v1/auth/verify-email
Content-Type: application/json

{
  "token": "abc123def456..."
}
```

**Response:**
Same as GET request above.

### Frontend Implementation

#### Option 1: Direct Link (Recommended)
```typescript
// User clicks link in email
// Frontend receives token from URL query parameter
const verifyEmail = async (token: string) => {
  const response = await fetch(`/api/v1/auth/verify-email?token=${token}`, {
    method: 'GET'
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Show success message
    // Update user state (isVerified: true)
    // Redirect to dashboard or login
  } else {
    // Show error message
    // Offer to resend verification email
  }
};

// In your verification page component
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (token) {
    verifyEmail(token);
  }
}, []);
```

#### Option 2: Manual Token Entry
```typescript
// User enters token manually
const verifyEmail = async (token: string) => {
  const response = await fetch('/api/v1/auth/verify-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ token })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Show success message
    // Update user state
  }
};
```

---

## Step 3: Resend Verification Email

### User Action
User requests a new verification email (if original expired or wasn't received).

### API Endpoint

**POST** `/api/v1/auth/resend-verification`

**Request:**
```http
POST /api/v1/auth/resend-verification
Content-Type: application/json

{
  "email": "john.doe@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification email sent successfully"
}
```

**Error Response (User Not Found):**
```json
{
  "success": false,
  "message": "User not found",
  "statusCode": 404
}
```

**Error Response (Already Verified):**
```json
{
  "success": false,
  "message": "Email is already verified",
  "statusCode": 400
}
```

### Frontend Implementation
```typescript
// Resend verification email
const resendVerification = async (email: string) => {
  const response = await fetch('/api/v1/auth/resend-verification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Show success message
    // "A new verification email has been sent"
  } else {
    // Show error message
  }
};
```

---

## Complete Frontend Flow Example

### Registration Page Component
```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    subscribedToNewsletter: false
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to verification page
        navigate('/verify-email', { 
          state: { email: formData.email } 
        });
      } else {
        // Show error
        alert(data.message);
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
};
```

### Email Verification Page Component
```typescript
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const emailParam = searchParams.get('email');

    if (emailParam) {
      setEmail(emailParam);
    }

    if (token) {
      verifyEmail(token);
    } else {
      setStatus('error');
      setMessage('Verification token is missing');
    }
  }, [searchParams]);

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch(`/api/v1/auth/verify-email?token=${token}`, {
        method: 'GET'
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message);
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.message);
      }
    } catch (error) {
      setStatus('error');
      setMessage('Verification failed. Please try again.');
    }
  };

  const resendVerification = async () => {
    if (!email) {
      alert('Email address is required');
      return;
    }

    try {
      const response = await fetch('/api/v1/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        alert('Verification email sent! Please check your inbox.');
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('Failed to resend verification email');
    }
  };

  return (
    <div className="verify-email-page">
      {status === 'verifying' && (
        <div>
          <h1>Verifying your email...</h1>
          <p>Please wait while we verify your email address.</p>
        </div>
      )}

      {status === 'success' && (
        <div>
          <h1>✅ Email Verified!</h1>
          <p>{message}</p>
          <p>Redirecting to login...</p>
        </div>
      )}

      {status === 'error' && (
        <div>
          <h1>❌ Verification Failed</h1>
          <p>{message}</p>
          <button onClick={resendVerification}>
            Resend Verification Email
          </button>
        </div>
      )}
    </div>
  );
};
```

---

## Email Verification Endpoints Summary

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/v1/auth/register` | POST | Register new user | No |
| `/api/v1/auth/verify-email` | GET | Verify email (link click) | No |
| `/api/v1/auth/verify-email` | POST | Verify email (API call) | No |
| `/api/v1/auth/resend-verification` | POST | Resend verification email | No |

---

## Email Verification Status

### Check User Verification Status

**GET** `/api/v1/auth/profile`

**Request:**
```http
GET /api/v1/auth/profile
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "691d4633526cd4c76ba09d93",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "isVerified": true,  // ← Check this field
      "isActive": true,
      ...
    }
  }
}
```

### Frontend Implementation
```typescript
// Check if user is verified
const checkVerificationStatus = async () => {
  const response = await fetch('/api/v1/auth/profile', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  
  if (data.success && !data.data.user.isVerified) {
    // Show verification reminder
    // Redirect to verification page
  }
};
```

---

## Error Handling

### Common Errors

#### 1. Invalid or Expired Token
**Error:**
```json
{
  "success": false,
  "message": "Invalid or expired verification token",
  "statusCode": 400
}
```

**Solution:**
- Request a new verification email
- Token expires after 24 hours

#### 2. Already Verified
**Error:**
```json
{
  "success": false,
  "message": "Email is already verified",
  "statusCode": 400
}
```

**Solution:**
- User can proceed to login
- No action needed

#### 3. User Not Found
**Error:**
```json
{
  "success": false,
  "message": "User not found",
  "statusCode": 404
}
```

**Solution:**
- Check email address
- User may need to register again

---

## Security Considerations

1. **Token Expiration**: Verification tokens expire after 24 hours
2. **One-Time Use**: Tokens are invalidated after successful verification
3. **Rate Limiting**: Resend verification is rate-limited to prevent abuse
4. **HTTPS Required**: Always use HTTPS in production for token transmission

---

## Email Template Preview

The verification email includes:
- **Luxury Navy and Gold design**
- **Montserrat font** throughout
- Clear call-to-action button
- Verification link for copy/paste
- Expiration notice
- Brand footer with links

---

## Testing

### Test Email Verification

1. **Register a new user**
2. **Check email inbox** for verification email
3. **Click verification link** or use API
4. **Verify user status** changes to `isVerified: true`

### Test Resend Verification

1. **Request resend** with user's email
2. **Check email inbox** for new verification email
3. **Verify new token** works

---

## Frontend Integration Checklist

- [ ] Create registration form
- [ ] Handle registration response
- [ ] Create email verification page
- [ ] Handle verification token from URL
- [ ] Display verification status
- [ ] Implement resend verification
- [ ] Handle verification errors
- [ ] Check user verification status on login
- [ ] Show verification reminder if not verified
- [ ] Redirect after successful verification

---

## Summary

### Email Verification Flow

1. **User registers** → Verification email sent ✅
2. **User clicks link** → Email verified ✅
3. **User can login** → Full access granted ✅

### Key Endpoints

- **Register**: `POST /api/v1/auth/register`
- **Verify**: `GET /api/v1/auth/verify-email?token=...`
- **Resend**: `POST /api/v1/auth/resend-verification`

### Important Notes

- ✅ Verification emails use luxury Navy and Gold templates
- ✅ Tokens expire after 24 hours
- ✅ Users can resend verification emails
- ✅ Verification status is checked on login
- ✅ Email verification is required for full access

The email verification system is fully functional and ready for frontend integration! 🎉

