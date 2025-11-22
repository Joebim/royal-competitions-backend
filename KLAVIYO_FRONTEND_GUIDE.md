# Klaviyo Frontend Integration Guide

## 🎯 Overview

**Good News:** The frontend does **NOT** need to integrate with Klaviyo directly. All Klaviyo tracking happens automatically in the backend. You just need to include a few optional data fields in your existing API requests.

**No Klaviyo SDK Required** - Everything is handled server-side! 🎉

---

## 📋 What the Frontend Needs to Do

### 1. Include Optional Data Fields

The frontend just needs to pass these optional fields in existing API requests:

- `marketingOptIn` - For email/SMS subscriptions during checkout
- `smsConsent` & `phone` - For SMS subscriptions during newsletter signup
- `referralCode` - For referral tracking during registration
- `subscribedToNewsletter` - For email subscription during registration

**That's it!** The backend handles all Klaviyo API calls automatically.

---

## 🎨 UI Flow Recommendations

### 1. **Registration Flow** (`POST /api/v1/auth/register`)

#### UI Elements to Add:
- ✅ **Newsletter Checkbox** (optional)
  - Label: "Subscribe to our newsletter for exclusive competitions"
  - Field: `subscribedToNewsletter: boolean`

- ✅ **Referral Code Input** (optional)
  - Label: "Have a referral code? Enter it here"
  - Placeholder: "e.g., JOHDOEAB"
  - Field: `referralCode: string`
  - **Tip:** Can be passed via URL query param `?ref=CODE` or form input

#### Example Request:
```typescript
POST /api/v1/auth/register
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "password": "SecurePass123!",
  "phone": "+441234567890", // Optional
  "subscribedToNewsletter": true, // Optional - triggers email subscription
  "referralCode": "JOHDOEAB" // Optional - from URL ?ref=CODE or form input
}
```

#### What Happens Automatically:
- ✅ User profile created/updated in Klaviyo
- ✅ If `subscribedToNewsletter: true` → Subscribed to email list
- ✅ If `referralCode` provided → "Referred Friend" event tracked for referrer
- ✅ Referrer gets 10 free entries when this user makes first paid entry

#### UI Flow Suggestion:
```
[Registration Form]
├── First Name *
├── Last Name *
├── Email *
├── Password *
├── Phone (optional)
├── ☐ Subscribe to newsletter (optional)
└── [Referral Code Input] (optional)
    └── "Have a referral code? Enter it here"
        └── Can also auto-populate from URL: ?ref=CODE

[Submit Button]
```

---

### 2. **Newsletter Signup Flow** (`POST /api/v1/newsletter/subscribe`)

#### UI Elements to Add:
- ✅ **Email Input** (required)
- ✅ **SMS Consent Checkbox** (optional)
  - Label: "Also subscribe to SMS updates"
  - Field: `smsConsent: boolean`
- ✅ **Phone Input** (required if SMS consent)
  - Field: `phone: string`
  - Show only when SMS consent is checked

#### Example Request:
```typescript
POST /api/v1/newsletter/subscribe
{
  "email": "jane@example.com",
  "firstName": "Jane", // Optional
  "lastName": "Doe", // Optional
  "source": "website", // Optional - where signup came from
  "smsConsent": true, // Optional - triggers SMS subscription
  "phone": "+441234567890" // Required if smsConsent is true
}
```

#### What Happens Automatically:
- ✅ Subscribed to email list in Klaviyo
- ✅ If `smsConsent: true` → Subscribed to SMS list
- ✅ If user exists → 3 free entries granted automatically
- ✅ "Subscribed For Free Entries" event tracked

#### UI Flow Suggestion:
```
[Newsletter Signup Form]
├── Email *
├── First Name (optional)
├── Last Name (optional)
├── ☐ Subscribe to SMS updates (optional)
└── [Phone Input] (shown only if SMS consent checked)
    └── "We'll send you SMS updates about new competitions"

[Submit Button]
└── Success Message: "You're subscribed! Check your email for confirmation."
```

---

### 3. **Checkout Flow** (`POST /api/v1/orders` → `POST /api/v1/payments/create-order`)

#### UI Elements to Add:
- ✅ **Marketing Opt-In Checkbox** (optional)
  - Label: "Yes, I'd like to receive marketing emails and SMS about new competitions"
  - Field: `marketingOptIn: boolean`
  - **Placement:** Near the payment button or in billing details section

#### Example Request:
```typescript
POST /api/v1/orders
{
  "competitionId": "507f1f77bcf86cd799439011",
  "qty": 2,
  "billingDetails": {
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com",
    "phone": "+441234567890" // Optional but recommended for SMS
  },
  "marketingOptIn": true // Optional - triggers email/SMS subscription
}
```

#### What Happens Automatically:
- ✅ "Started Checkout" event tracked when order is created
- ✅ "Placed Order" event tracked when payment succeeds
- ✅ "Paid Competition Entry" event tracked when payment succeeds
- ✅ If `marketingOptIn: true` → Subscribed to email and SMS lists
- ✅ If user was referred → Referrer gets 10 free entries (first paid entry only)
- ✅ "Abandoned Checkout" event tracked if payment not completed within 15 minutes

#### UI Flow Suggestion:
```
[Checkout Page]
├── Competition Details
├── Ticket Quantity Selector
├── Billing Details Form
│   ├── First Name *
│   ├── Last Name *
│   ├── Email *
│   └── Phone (optional)
├── ☐ Yes, I'd like to receive marketing emails and SMS
│   └── "Stay updated on new competitions and exclusive offers"
└── [Pay with PayPal Button]
    └── On Click: POST /api/v1/payments/create-order
        └── Then redirect to PayPal

[Payment Success]
└── Success Message + Order Confirmation
```

---

### 4. **Referral Code Flow** (Multiple Entry Points)

#### Option A: URL Query Parameter (Recommended)
```
https://yoursite.com/register?ref=JOHDOEAB
```
- Auto-populate referral code field from URL
- User can still edit/remove it

#### Option B: Dedicated Referral Landing Page
```
https://yoursite.com/ref/JOHDOEAB
```
- Show special referral message
- Pre-fill registration form with referral code
- Track referral source in analytics

#### Option C: Shareable Referral Link
```
https://yoursite.com/competitions?ref=JOHDOEAB
```
- User shares their unique referral link
- New users who register via this link get the code automatically

#### UI Flow Suggestion:
```
[Registration Page]
├── Check URL for ?ref=CODE parameter
├── If found → Auto-populate referral code field
├── Show message: "You were referred by a friend! Enter their code below:"
└── [Referral Code Input]
    └── Pre-filled from URL, but editable

[User Dashboard] (Future Enhancement)
└── [Referral Section]
    ├── "Your Referral Code: JOHDOEAB"
    ├── [Copy Button]
    ├── "Share your link: https://yoursite.com/register?ref=JOHDOEAB"
    └── "You've referred X friends and earned Y free entries!"
```

---

## 📊 Automatic Event Tracking (No Frontend Code Needed)

These events are tracked automatically by the backend - **no frontend code required**:

| Event | When It Fires | What You Need to Do |
|-------|---------------|---------------------|
| **Started Checkout** | Order created | ✅ Nothing - automatic |
| **Placed Order** | Payment succeeds | ✅ Nothing - automatic |
| **Paid Competition Entry** | Payment succeeds | ✅ Nothing - automatic |
| **Abandoned Checkout** | Order pending >15 mins | ✅ Nothing - automatic (cron job) |
| **Won Competition** | Winner selected | ✅ Nothing - automatic |
| **Subscribed For Free Entries** | Newsletter signup | ✅ Nothing - automatic |
| **Granted Free Entries** | Free entries granted | ✅ Nothing - automatic |
| **Referred Friend** | User registers with code | ✅ Just include `referralCode` field |

---

## 🔗 API Endpoints Reference

### 1. User Registration
```typescript
POST /api/v1/auth/register
Body: {
  firstName: string,
  lastName: string,
  email: string,
  password: string,
  phone?: string,
  subscribedToNewsletter?: boolean, // ← Include for email subscription
  referralCode?: string // ← Include for referral tracking
}
```

### 2. Newsletter Subscription
```typescript
POST /api/v1/newsletter/subscribe
Body: {
  email: string,
  firstName?: string,
  lastName?: string,
  source?: string,
  smsConsent?: boolean, // ← Include for SMS subscription
  phone?: string // ← Required if smsConsent is true
}
```

### 3. Order Creation
```typescript
POST /api/v1/orders
Body: {
  competitionId: string,
  qty: number,
  billingDetails: {
    firstName: string,
    lastName: string,
    email: string,
    phone?: string
  },
  marketingOptIn?: boolean // ← Include for email/SMS subscription
}
```

### 4. Payment Creation
```typescript
POST /api/v1/payments/create-order
Body: {
  orderId?: string, // If order already exists
  amount?: number, // If creating order on-the-fly
  competitionId?: string // If creating order on-the-fly
}
```

---

## 🎨 UI/UX Best Practices

### 1. **Marketing Opt-In Placement**
- ✅ Place near payment button (high visibility)
- ✅ Use clear, benefit-focused copy
- ✅ Make it optional (checkbox, not required)
- ✅ Example: "☐ Yes, send me updates about new competitions and exclusive offers"

### 2. **Referral Code Input**
- ✅ Make it optional and non-intrusive
- ✅ Auto-populate from URL query param
- ✅ Show helpful placeholder: "e.g., JOHDOEAB"
- ✅ Validate format (8 alphanumeric characters, uppercase)

### 3. **SMS Consent**
- ✅ Only show phone input when SMS consent is checked
- ✅ Explain what SMS will be used for
- ✅ Make it clear it's optional
- ✅ Example: "☐ Also subscribe to SMS updates (we'll text you about new competitions)"

### 4. **Success Messages**
- ✅ After newsletter signup: "You're subscribed! Check your email for confirmation."
- ✅ After registration with referral: "Thanks for signing up! Your referral code has been applied."
- ✅ After payment: "Payment successful! You'll receive a confirmation email shortly."

---

## 🧪 Testing Checklist

### Registration Flow
- [ ] User can register with `subscribedToNewsletter: true`
- [ ] User can register with `referralCode` from URL query param
- [ ] User can register with `referralCode` from form input
- [ ] Invalid referral code doesn't break registration
- [ ] Referral code is case-insensitive (backend handles uppercase)

### Newsletter Signup
- [ ] User can subscribe with email only
- [ ] User can subscribe with SMS consent + phone
- [ ] Phone input shows/hides based on SMS consent checkbox
- [ ] Success message displays after subscription

### Checkout Flow
- [ ] User can create order with `marketingOptIn: true`
- [ ] Marketing opt-in checkbox is optional
- [ ] Payment flow works with or without marketing opt-in
- [ ] Order creation triggers "Started Checkout" (verify in Klaviyo dashboard)

### Referral System
- [ ] Referral code from URL auto-populates in form
- [ ] Referral code can be manually entered
- [ ] Referral code can be edited/removed
- [ ] Invalid referral codes show warning but don't break registration

---

## 🚨 Common Mistakes to Avoid

### ❌ Don't Do This:
```typescript
// ❌ DON'T: Install Klaviyo SDK on frontend
import { Klaviyo } from '@klaviyo/api';

// ❌ DON'T: Make Klaviyo API calls from frontend
await klaviyo.track('Started Checkout', { ... });

// ❌ DON'T: Expose Klaviyo API keys in frontend
const KLAVIYO_KEY = 'pk_...'; // ❌ NEVER DO THIS
```

### ✅ Do This Instead:
```typescript
// ✅ DO: Just include optional fields in API requests
const response = await fetch('/api/v1/orders', {
  method: 'POST',
  body: JSON.stringify({
    competitionId: '...',
    qty: 2,
    marketingOptIn: true, // ← Just include this field
  }),
});

// ✅ DO: Let the backend handle all Klaviyo calls
// The backend automatically tracks events when you make API calls
```

---

## 📱 Mobile Considerations

### Responsive Design
- ✅ Marketing opt-in checkbox should be easily tappable on mobile
- ✅ Referral code input should have proper keyboard type (alphanumeric)
- ✅ Phone input should use `tel` input type for mobile keyboards
- ✅ SMS consent checkbox should be large enough for touch targets

### Mobile-Specific Flows
- ✅ Consider SMS opt-in for mobile users (higher engagement)
- ✅ Show referral code prominently on mobile (easier sharing)
- ✅ Make marketing opt-in visible before payment button

---

## 🔄 Integration Steps

### Step 1: Update Registration Form
1. Add `subscribedToNewsletter` checkbox
2. Add `referralCode` input field
3. Parse `?ref=CODE` from URL and auto-populate

### Step 2: Update Newsletter Signup Form
1. Add `smsConsent` checkbox
2. Add conditional `phone` input (show when SMS consent checked)
3. Include both fields in API request

### Step 3: Update Checkout Flow
1. Add `marketingOptIn` checkbox in billing section
2. Include `marketingOptIn` in order creation request
3. No changes needed to payment flow

### Step 4: Test Everything
1. Test registration with referral code
2. Test newsletter signup with SMS consent
3. Test checkout with marketing opt-in
4. Verify events appear in Klaviyo dashboard

---

## 📚 Additional Resources

- **Backend Implementation:** See `KLAVIYO_IMPLEMENTATION.md`
- **Status & Metrics:** See `KLAVIYO_IMPLEMENTATION_STATUS.md`
- **Klaviyo Dashboard:** https://www.klaviyo.com/dashboard
- **API Documentation:** Backend handles all API calls automatically

---

## ❓ FAQ

### Q: Do I need to install the Klaviyo SDK?
**A:** No! All Klaviyo integration is handled server-side. Just include the optional data fields.

### Q: What if the user doesn't opt in to marketing?
**A:** That's fine! The events are still tracked (Started Checkout, Placed Order, etc.), but they won't be subscribed to email/SMS lists.

### Q: How do I test if referral codes work?
**A:** 
1. Register a test user (they'll get a referral code)
2. Register another user with that referral code
3. Check Klaviyo dashboard for "Referred Friend" event
4. Make a paid entry with the referred user
5. Check that referrer got 10 free entries

### Q: Can users see their referral code?
**A:** Not yet, but you can add a user dashboard endpoint to display it. The referral code is stored in the User model as `referralCode`.

### Q: What happens if a referral code is invalid?
**A:** Registration still succeeds, but a warning is logged. The user just won't be linked to a referrer.

---

## 🎉 Summary

**Frontend Integration = Minimal Effort!**

1. ✅ Add `marketingOptIn` checkbox to checkout
2. ✅ Add `smsConsent` + `phone` to newsletter signup
3. ✅ Add `referralCode` input to registration (or parse from URL)
4. ✅ Add `subscribedToNewsletter` checkbox to registration

**That's it!** All Klaviyo tracking happens automatically in the backend. No SDK, no API keys, no complex integration needed. 🚀

