# Klaviyo Implementation Status

## ✅ Fully Implemented in Backend (No Frontend Changes Required)

All of these are **automatically handled by the backend** - the frontend doesn't need to make any Klaviyo API calls:

### 1. **Started Checkout** ✅

- **Location:** `order.controller.ts` (line 551) + `payment.controller.ts` (line 101)
- **Trigger:** Automatically fires when:
  - Order is created via `POST /api/v1/orders`
  - PayPal order is created via `POST /api/v1/payments/create-order` (if order exists)
- **Frontend Action:** None required - happens automatically

### 2. **Placed Order** ✅

- **Location:** `payment.controller.ts` (line 507)
- **Trigger:** Automatically fires when payment is successfully captured
- **Frontend Action:** None required - happens automatically

### 3. **Paid Competition Entry** ✅

- **Location:** `payment.controller.ts` (line 528)
- **Trigger:** Automatically fires when payment is successfully captured
- **Frontend Action:** None required - happens automatically

### 4. **Won Competition** ✅

- **Location:** `draw.controller.ts` (3 places: lines 145, 377, 977)
- **Trigger:** Automatically fires when winner is selected in a draw
- **Frontend Action:** None required - happens automatically

### 5. **Abandoned Checkout** ✅

- **Location:** `jobs/index.ts` (line 205)
- **Trigger:** Cron job runs every 5 minutes, automatically detects abandoned checkouts
- **Frontend Action:** None required - happens automatically

### 6. **Subscribed For Free Entries** ✅

- **Location:** `newsletter.controller.ts` (line 70)
- **Trigger:** Automatically fires when user subscribes to newsletter
- **Frontend Action:** None required - happens automatically

### 7. **Granted Free Entries** ✅

- **Location:** `newsletter.controller.ts` (line 60) → `klaviyo.service.ts`
- **Trigger:** Automatically fires when free entries are granted
- **Frontend Action:** None required - happens automatically

### 8. **Profile Identification** ✅

- **Location:** `auth.controller.ts` (line 91) + `payment.controller.ts` (line 553)
- **Trigger:** Automatically happens on user registration and payment
- **Frontend Action:** None required - happens automatically

### 9. **Email/SMS List Subscriptions** ✅

- **Location:** `newsletter.controller.ts`, `payment.controller.ts`, `auth.controller.ts`
- **Trigger:** Automatically subscribes based on opt-in flags
- **Frontend Action:** Just include the opt-in flags (see below)

---

## ✅ Fully Implemented (Just Completed!)

### 1. **Referred Friend** ✅

- **Status:** **FULLY IMPLEMENTED** in `auth.controller.ts` and `payment.controller.ts`
- **What's Implemented:**
  - ✅ User model fields: `referralCode`, `referredBy`, `hasReceivedReferralReward`
  - ✅ Automatic referral code generation for new users (8-char alphanumeric)
  - ✅ Referral code lookup and validation on registration
  - ✅ Tracking "Referred Friend" event in Klaviyo when user signs up with referral code
  - ✅ Grant 10 free entries to referrer when referred user makes first paid entry
  - ✅ Prevents duplicate rewards with `hasReceivedReferralReward` flag
- **Frontend Action:** Just include `referralCode` in registration request (optional)
- **How It Works:**
  1. User A gets unique referral code (e.g., "JOHDOEAB") on registration
  2. User B registers with `referralCode: "JOHDOEAB"` in request body
  3. Backend tracks "Referred Friend" event for User A
  4. When User B makes first paid entry, User A gets 10 free entries automatically

### 2. **Started Competition Entry** ✅

- **Status:** **FULLY IMPLEMENTED** in `entry.controller.ts`
- **Location:** `entry.controller.ts` (`startEntry` function)
- **Trigger:** Automatically fires when user calls `POST /api/v1/entries/start`
- **Frontend Action:** Call the endpoint when user views competition question page or begins entry process
- **Event Properties:**
  - `competition_id`
  - `competition_name`
  - `order_id` (optional)
  - `ticket_number` (optional)

### 3. **Submitted Competition Entry** ✅

- **Status:** **FULLY IMPLEMENTED** in `entry.controller.ts`
- **Location:** `entry.controller.ts` (`submitEntry` function)
- **Trigger:** Automatically fires when user calls `POST /api/v1/entries/submit` and entry is created
- **Frontend Action:** Call the endpoint when user submits their answer
- **Event Properties:**
  - `competition_id`
  - `competition_name`
  - `order_id`
  - `ticket_number`
  - `is_correct` (whether answer is correct)
  - `entry_id`

---

## 📋 Frontend Requirements (Minimal - Just Data Fields)

The frontend **does NOT need to make any Klaviyo API calls**. It just needs to include these optional fields in existing API requests:

### 1. Order Creation (`POST /api/v1/orders`)

```typescript
{
  competitionId: string,
  qty: number,
  billingDetails: { email, firstName, lastName, phone? },
  marketingOptIn: boolean,  // ← Include this for email/SMS subscription
  // ... other fields
}
```

### 2. Newsletter Subscription (`POST /api/v1/newsletter/subscribe`)

```typescript
{
  email: string,
  firstName?: string,
  lastName?: string,
  smsConsent?: boolean,  // ← Include this for SMS subscription
  phone?: string,        // ← Include this if smsConsent is true
  // ... other fields
}
```

### 3. User Registration (`POST /api/v1/auth/register`)

```typescript
{
  firstName: string,
  lastName: string,
  email: string,
  password: string,
  subscribedToNewsletter?: boolean,  // ← Include this for email subscription
  referralCode?: string,             // ← Include this for referral tracking (when implemented)
  // ... other fields
}
```

**That's it!** The backend handles all Klaviyo API calls automatically.

---

## 🎯 Summary

### ✅ **ALL 10 METRICS ARE FULLY IMPLEMENTED! 🎉**

- All payment/checkout tracking: ✅
- All winner tracking: ✅
- All subscription tracking: ✅
- Abandoned checkout detection: ✅
- Referral system: ✅
- **Entry tracking: ✅ (JUST COMPLETED!)**
  - "Started Competition Entry" - ✅ Implemented in `entry.controller.ts` (`startEntry`)
  - "Submitted Competition Entry" - ✅ Implemented in `entry.controller.ts` (`submitEntry`)

### 📱 **Frontend Requirements: Zero Klaviyo Code**

- No Klaviyo SDK needed
- No Klaviyo API calls needed
- Just include optional data fields in existing API requests
- All Klaviyo tracking happens automatically in the backend

---

## 🚀 Ready to Use

**You can start using the Klaviyo integration immediately:**

1. Set environment variables:

   ```env
   KLAVIYO_PRIVATE_API_KEY=your_key
   KLAVIYO_LIST_ID_NEWSLETTER=your_list_id
   KLAVIYO_LIST_ID_SMS=your_sms_list_id
   ```

2. Frontend just needs to include `marketingOptIn` in order creation

3. All events will automatically track in Klaviyo!

**No frontend Klaviyo integration code is needed** - everything is handled server-side! 🎉
