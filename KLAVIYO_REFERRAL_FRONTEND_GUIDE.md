# Referral System - Frontend Implementation Guide

## 🎯 Overview

The referral system is **fully implemented in the backend**. The frontend just needs to:

1. Include `referralCode` in registration requests
2. Display user's referral code in their dashboard
3. Handle referral links from URLs

**No backend changes needed** - everything is handled server-side! 🎉

---

## 📋 What the Frontend Needs to Do

### 1. **Registration with Referral Code**

Include the `referralCode` field in the registration request. The referral code can come from:

- URL query parameter (`?ref=CODE`)
- Manual input from user
- Shared referral link

### 2. **Display User's Referral Code**

Show the user their unique referral code in their dashboard/profile so they can share it.

### 3. **Handle Referral Links**

Parse referral codes from URLs and auto-populate the registration form.

---

## 🔗 API Endpoints

### 1. **User Registration** (with referral code)

```typescript
POST /api/v1/auth/register
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "password": "SecurePass123!",
  "phone": "+441234567890", // Optional
  "subscribedToNewsletter": true, // Optional
  "referralCode": "JOHDOEAB" // ← Include this for referral tracking
}
```

**Response:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane@example.com",
      "referralCode": "JANDOEAB" // ← User's new referral code
      // ... other user fields
    },
    "token": "...",
    "refreshToken": "..."
  }
}
```

### 2. **Get User Profile** (to display referral code)

```typescript
GET / api / v1 / users / me;
Authorization: Bearer<token>;
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane@example.com",
      "referralCode": "JANDOEAB" // ← User's referral code
      // ... other user fields
    }
  }
}
```

---

## 🎨 UI/UX Implementation

### 1. **Registration Form with Referral Code**

#### Option A: URL Query Parameter (Recommended)

```typescript
// Parse referral code from URL
const urlParams = new URLSearchParams(window.location.search);
const referralCode = urlParams.get('ref');

// Auto-populate in registration form
<RegistrationForm>
  <input
    type="text"
    name="referralCode"
    value={referralCode || ''}
    placeholder="Referral code (optional)"
  />
</RegistrationForm>
```

#### Option B: Dedicated Referral Landing Page

```
https://yoursite.com/register?ref=JOHDOEAB
```

**UI Flow:**

```
[Referral Landing Page]
├── Hero Section
│   └── "You've been invited by a friend!"
├── Special Message
│   └── "Sign up with code JOHDOEAB and get started"
└── [Registration Form]
    └── Referral code pre-filled and locked (or editable)
```

#### Option C: Manual Input

```
[Registration Form]
├── Standard fields (name, email, password)
└── [Referral Code Section]
    ├── Label: "Have a referral code?"
    ├── Input: [Referral Code]
    └── Help text: "Enter your friend's referral code (optional)"
```

### 2. **User Dashboard - Referral Section**

Display the user's referral code and sharing options:

```typescript
[User Dashboard]
└── [Referral Section]
    ├── Title: "Invite Friends & Earn Rewards"
    ├── Your Referral Code
    │   └── [JANDOEAB] [Copy Button]
    ├── Share Your Link
    │   └── https://yoursite.com/register?ref=JANDOEAB
    │       └── [Copy Link Button]
    ├── Stats
    │   ├── "You've referred X friends"
    │   └── "You've earned Y free entries"
    └── [Share Buttons]
        ├── [Share on Facebook]
        ├── [Share on Twitter]
        ├── [Share via Email]
        └── [Copy Link]
```

### 3. **Referral Link Handling**

#### Parse Referral Code from URL

```typescript
// React example
import { useSearchParams } from 'react-router-dom';

function RegistrationPage() {
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref');

  return (
    <RegistrationForm
      initialReferralCode={referralCode || ''}
    />
  );
}
```

#### Redirect with Referral Code

```typescript
// When user clicks referral link
function handleReferralClick(referralCode: string) {
  window.location.href = `/register?ref=${referralCode}`;
}

// Or use React Router
import { useNavigate } from 'react-router-dom';

function ShareReferralButton({ referralCode }: { referralCode: string }) {
  const navigate = useNavigate();

  const handleShare = () => {
    navigate(`/register?ref=${referralCode}`);
  };

  return <button onClick={handleShare}>Share Referral Link</button>;
}
```

---

## 💻 Code Examples

### React Component Example

```typescript
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

interface RegistrationFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  subscribedToNewsletter: boolean;
  referralCode?: string;
}

export const RegistrationForm: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState<RegistrationFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    subscribedToNewsletter: false,
    referralCode: searchParams.get('ref') || '', // Auto-populate from URL
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        // Registration successful
        // User's referral code is in data.data.user.referralCode
        console.log('Your referral code:', data.data.user.referralCode);
        // Redirect to dashboard or login
      }
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="First Name"
        value={formData.firstName}
        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
        required
      />

      <input
        type="text"
        placeholder="Last Name"
        value={formData.lastName}
        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
        required
      />

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

      {/* Referral Code Input */}
      {formData.referralCode && (
        <div className="referral-code-section">
          <label>Referral Code</label>
          <input
            type="text"
            placeholder="Referral code (optional)"
            value={formData.referralCode}
            onChange={(e) => setFormData({ ...formData, referralCode: e.target.value })}
            style={{ textTransform: 'uppercase' }}
          />
          <small>You were referred by a friend!</small>
        </div>
      )}

      <label>
        <input
          type="checkbox"
          checked={formData.subscribedToNewsletter}
          onChange={(e) => setFormData({ ...formData, subscribedToNewsletter: e.target.checked })}
        />
        Subscribe to newsletter
      </label>

      <button type="submit">Register</button>
    </form>
  );
};
```

### User Dashboard - Referral Section Component

```typescript
import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  referralCode?: string;
}

export const ReferralSection: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Fetch user profile
    fetch('/api/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    })
      .then(res => res.json())
      .then(data => setUser(data.data.user));
  }, []);

  const referralLink = user?.referralCode
    ? `${window.location.origin}/register?ref=${user.referralCode}`
    : '';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnFacebook = () => {
    const url = encodeURIComponent(referralLink);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  const shareOnTwitter = () => {
    const text = encodeURIComponent(`Join me on ${window.location.hostname}! Use my referral code: ${user?.referralCode}`);
    const url = encodeURIComponent(referralLink);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent('Join me on Royal Competitions!');
    const body = encodeURIComponent(
      `Hi!\n\nI've been using Royal Competitions and thought you might like it too!\n\nUse my referral code: ${user?.referralCode}\n\nOr click this link: ${referralLink}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  if (!user?.referralCode) {
    return <div>Loading...</div>;
  }

  return (
    <div className="referral-section">
      <h2>Invite Friends & Earn Rewards</h2>

      <div className="referral-code-card">
        <label>Your Referral Code</label>
        <div className="code-display">
          <span className="code">{user.referralCode}</span>
          <button
            onClick={() => copyToClipboard(user.referralCode!)}
            className="copy-btn"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="referral-link-card">
        <label>Your Referral Link</label>
        <div className="link-display">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="referral-link-input"
          />
          <button
            onClick={() => copyToClipboard(referralLink)}
            className="copy-btn"
          >
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>

      <div className="share-buttons">
        <button onClick={shareOnFacebook} className="share-btn facebook">
          Share on Facebook
        </button>
        <button onClick={shareOnTwitter} className="share-btn twitter">
          Share on Twitter
        </button>
        <button onClick={shareViaEmail} className="share-btn email">
          Share via Email
        </button>
      </div>

      <div className="referral-info">
        <p>💡 <strong>How it works:</strong></p>
        <ul>
          <li>Share your referral code or link with friends</li>
          <li>When they sign up using your code, you'll both benefit</li>
          <li>You'll earn 10 free entries when they make their first paid entry</li>
        </ul>
      </div>
    </div>
  );
};
```

---

## 🎯 Implementation Checklist

### Registration Flow

- [ ] Parse `?ref=CODE` from URL query parameters
- [ ] Auto-populate referral code field in registration form
- [ ] Allow user to edit/remove referral code if needed
- [ ] Include `referralCode` in registration API request
- [ ] Show success message if referral code was applied
- [ ] Handle invalid referral codes gracefully (don't break registration)

### User Dashboard

- [ ] Fetch user profile to get `referralCode`
- [ ] Display user's referral code prominently
- [ ] Generate referral link: `https://yoursite.com/register?ref={referralCode}`
- [ ] Add "Copy Code" button
- [ ] Add "Copy Link" button
- [ ] Add social sharing buttons (Facebook, Twitter, Email)
- [ ] Show referral stats (if available from backend)

### Referral Link Handling

- [ ] Create referral landing page or update registration page
- [ ] Parse referral code from URL on page load
- [ ] Show special message if referral code is present
- [ ] Pre-fill registration form with referral code
- [ ] Track referral source in analytics (optional)

---

## 🎨 UI/UX Best Practices

### 1. **Referral Code Input**

- ✅ Make it optional (don't require it)
- ✅ Show helpful placeholder: "e.g., JOHDOEAB"
- ✅ Auto-uppercase the input (referral codes are uppercase)
- ✅ Validate format (8 alphanumeric characters)
- ✅ Show success message if code is valid
- ✅ Don't show error if code is invalid (just log it, registration still succeeds)

### 2. **Referral Dashboard Section**

- ✅ Make it prominent and easy to find
- ✅ Use clear, benefit-focused copy
- ✅ Show referral code in large, easy-to-copy format
- ✅ Provide multiple sharing options
- ✅ Show referral stats (number of referrals, free entries earned)
- ✅ Use visual elements (icons, badges) to make it engaging

### 3. **Referral Links**

- ✅ Make links short and shareable
- ✅ Use consistent format: `yoursite.com/register?ref=CODE`
- ✅ Consider creating a dedicated referral landing page
- ✅ Add UTM parameters for tracking (optional): `?ref=CODE&utm_source=referral`

### 4. **Success Messages**

- ✅ After registration with referral: "Thanks for signing up! Your referral code has been applied."
- ✅ After copying code: "Referral code copied to clipboard!"
- ✅ After sharing: "Link copied! Share it with your friends."

---

## 🔍 Validation & Error Handling

### Referral Code Validation (Frontend)

```typescript
const validateReferralCode = (code: string): boolean => {
  // Referral codes are 8 alphanumeric characters, uppercase
  const referralCodeRegex = /^[A-Z0-9]{8}$/;
  return referralCodeRegex.test(code.toUpperCase());
};

// Usage in form
const handleReferralCodeChange = (value: string) => {
  const upperValue = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
  setFormData({ ...formData, referralCode: upperValue });

  if (upperValue.length === 8) {
    const isValid = validateReferralCode(upperValue);
    // Show validation feedback
  }
};
```

### Error Handling

```typescript
try {
  const response = await fetch('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });

  const data = await response.json();

  if (!response.ok) {
    // Handle registration errors
    if (data.message.includes('referral')) {
      // Invalid referral code - but registration might still succeed
      console.warn('Referral code issue:', data.message);
    }
    throw new Error(data.message);
  }

  // Success - referral code was applied if provided
  if (formData.referralCode) {
    showSuccessMessage(
      'Registration successful! Your referral code has been applied.'
    );
  }
} catch (error) {
  // Handle network or other errors
  console.error('Registration error:', error);
}
```

---

## 📱 Mobile Considerations

### Responsive Design

- ✅ Make referral code input easily tappable on mobile
- ✅ Use large, readable font for referral code display
- ✅ Make copy buttons large enough for touch targets (min 44x44px)
- ✅ Optimize referral link display for mobile screens
- ✅ Use native share sheet on mobile (if available)

### Mobile Share Example

```typescript
const shareReferralLink = async () => {
  const referralLink = `${window.location.origin}/register?ref=${user.referralCode}`;

  if (navigator.share) {
    // Use native share on mobile
    try {
      await navigator.share({
        title: 'Join me on Royal Competitions!',
        text: `Use my referral code: ${user.referralCode}`,
        url: referralLink,
      });
    } catch (error) {
      // User cancelled or error occurred
      console.log('Share cancelled');
    }
  } else {
    // Fallback to copy
    copyToClipboard(referralLink);
  }
};
```

---

## 🧪 Testing Checklist

### Registration with Referral Code

- [ ] User can register with referral code from URL (`?ref=CODE`)
- [ ] User can register with manually entered referral code
- [ ] User can register without referral code
- [ ] Invalid referral code doesn't break registration
- [ ] Referral code is case-insensitive (backend handles uppercase)
- [ ] Referral code input auto-uppercases
- [ ] Referral code is trimmed of whitespace

### User Dashboard

- [ ] User's referral code displays correctly
- [ ] Copy code button works
- [ ] Copy link button works
- [ ] Referral link is correctly formatted
- [ ] Social sharing buttons work
- [ ] Mobile share works (if implemented)

### Referral Links

- [ ] Referral links redirect correctly
- [ ] Referral code is parsed from URL
- [ ] Registration form pre-fills with referral code
- [ ] Referral code persists through page navigation

---

## 🚀 Quick Start Guide

### Step 1: Update Registration Form

```typescript
// 1. Parse referral code from URL
const referralCode = new URLSearchParams(window.location.search).get('ref');

// 2. Include in form state
const [formData, setFormData] = useState({
  // ... other fields
  referralCode: referralCode || '',
});

// 3. Include in API request
await fetch('/api/v1/auth/register', {
  method: 'POST',
  body: JSON.stringify({
    // ... other fields
    referralCode: formData.referralCode, // Optional
  }),
});
```

### Step 2: Add Referral Section to Dashboard

```typescript
// 1. Fetch user profile
const user = await fetch('/api/v1/users/me').then(r => r.json());

// 2. Display referral code
<div>Your Code: {user.data.user.referralCode}</div>

// 3. Generate referral link
const link = `${window.location.origin}/register?ref=${user.data.user.referralCode}`;
```

### Step 3: Test Everything

1. Register a test user → Get their referral code
2. Register another user with that code → Verify "Referred Friend" event
3. Make a paid entry with referred user → Verify referrer gets 10 free entries

---

## ❓ FAQ

### Q: What happens if a user enters an invalid referral code?

**A:** Registration still succeeds, but a warning is logged. The user just won't be linked to a referrer.

### Q: Can users see how many people they've referred?

**A:** Not yet, but you can add this by creating an endpoint that counts users with `referredBy: userId`.

### Q: Can users change their referral code?

**A:** No, referral codes are auto-generated and permanent. This prevents confusion and abuse.

### Q: What's the format of referral codes?

**A:** 8 alphanumeric characters, uppercase (e.g., "JOHDOEAB").

### Q: Can I customize the referral code format?

**A:** Yes, but you'd need to modify the backend `User.model.ts` pre-save hook.

### Q: How do I track referral performance?

**A:** Check Klaviyo dashboard for "Referred Friend" events, or query the database for users with `referredBy` field set.

---

## 📚 Summary

**Frontend Integration = Simple!**

1. ✅ Parse `?ref=CODE` from URL
2. ✅ Include `referralCode` in registration request
3. ✅ Display user's `referralCode` in dashboard
4. ✅ Generate and share referral links

**That's it!** The backend handles:

- Referral code generation
- Referral validation
- "Referred Friend" event tracking
- Free entry rewards (10 entries when referred user makes first paid entry)

No complex logic needed on the frontend - just pass the referral code and display it! 🎉
