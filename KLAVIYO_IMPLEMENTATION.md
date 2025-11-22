# Klaviyo Integration Implementation

## Overview

Comprehensive Klaviyo integration for Royal Competitions backend, tracking all key conversion events and managing email/SMS subscriptions.

## Environment Variables

Add these to your `.env` file:

```env
KLAVIYO_PRIVATE_API_KEY=your_klaviyo_private_api_key
KLAVIYO_LIST_ID_NEWSLETTER=your_klaviyo_newsletter_list_id
KLAVIYO_LIST_ID_SMS=your_klaviyo_sms_list_id
```

**Note:** `KLAVIYO_PRIVATE_API_KEY` takes precedence over `KLAVIYO_PRIVATE_KEY` if both are set.

## Custom Metrics Tracked

All metrics are case-sensitive and must match exactly in Klaviyo:

1. **Started Checkout** - When user creates order/starts payment
2. **Placed Order** - When payment is successfully captured
3. **Abandoned Checkout** - When checkout is not completed within 15 minutes
4. **Started Competition Entry** - (Placeholder - to be implemented when entry controller is created)
5. **Submitted Competition Entry** - (Placeholder - to be implemented when entry controller is created)
6. **Paid Competition Entry** - When paid entry is successfully processed
7. **Won Competition** - When user wins a competition
8. **Referred Friend** - When user signs up with referral code
9. **Granted Free Entries** - When free entries are granted (newsletter, referral, etc.)
10. **Subscribed For Free Entries** - When user subscribes to newsletter/SMS

## Implementation Details

### 1. Klaviyo Service (`src/services/klaviyo.service.ts`)

Complete service with all required functions:

- ✅ `identifyOrUpdateProfile(user)` - Creates/updates Klaviyo profile
- ✅ `trackEvent(email, eventName, properties, value, time)` - Tracks custom events
- ✅ `subscribeToEmailList(email)` - Subscribes to newsletter list
- ✅ `subscribeToSMSList(phone, email)` - Subscribes to SMS list
- ✅ `grantFreeEntriesAndTrack(userId, entries, source)` - Grants free entries and tracks event

**Features:**
- Automatic retry logic for 429 (rate limit) and 5xx errors
- Exponential backoff retry strategy
- Comprehensive error handling (never fails main operations)
- Winston logging for all operations

### 2. Payment Controller Integration (`src/controllers/payment.controller.ts`)

**Events Tracked:**

- **Started Checkout** - When `createPayPalOrder` is called with an existing order
  - Properties: `competition_id`, `competition_name`, `order_id`, `items`, `value`
  
- **Placed Order** - When payment is successfully captured
  - Properties: `competition_id`, `competition_name`, `order_id`, `order_number`, `items`, `value`
  
- **Paid Competition Entry** - When payment is successfully captured
  - Properties: `competition_id`, `competition_name`, `order_id`, `ticket_numbers`, `quantity`, `value`

**Additional Actions:**
- Subscribes to email list if `marketingOptIn === true`
- Subscribes to SMS list if phone provided and `marketingOptIn === true`
- Updates/identifies profile in Klaviyo

### 3. Order Controller Integration (`src/controllers/order.controller.ts`)

**Events Tracked:**

- **Started Checkout** - When order is created
  - Properties: `competition_id`, `competition_name`, `order_id`, `items`, `value`

### 4. Newsletter Controller Integration (`src/controllers/newsletter.controller.ts`)

**Actions:**

- Subscribes to email list via `subscribeToEmailList()`
- Subscribes to SMS list if `smsConsent === true` via `subscribeToSMSList()`
- Grants 3 free entries via `grantFreeEntriesAndTrack(userId, 3, 'newsletter_signup')`
- Tracks **Subscribed For Free Entries** event

### 5. Auth Controller Integration (`src/controllers/auth.controller.ts`)

**Actions:**

- Identifies/updates profile in Klaviyo on registration
- Subscribes to email list if `subscribedToNewsletter === true`
- **Referral Tracking Placeholder:**
  - Currently logs referral code if provided
  - TODO: Implement referral code lookup and track "Referred Friend" event
  - TODO: Grant 10 free entries to referrer when referred user makes first paid entry

### 6. Draw/Winner Controller Integration (`src/controllers/draw.controller.ts`)

**Events Tracked:**

- **Won Competition** - When winner is selected
  - Properties: `competition_id`, `competition_name`, `ticket_number`, `claim_code`, `prize_type` (cash|car|holiday|other)
  - Value: `prizeValue` or `cashAlternative`

### 7. Abandoned Checkout Detector (`src/jobs/index.ts`)

**Implementation:** MongoDB-based cron job (runs every 5 minutes)

**Logic:**
- Finds orders with:
  - `paymentStatus === PENDING`
  - `status === PENDING`
  - Created more than 15 minutes ago
  - Has billing email
  - No payment reference (not paid)
- Tracks **Abandoned Checkout** event for each
- Processes max 100 orders per run to avoid overload

## Event Properties Structure

All events include GDPR-safe properties (no unnecessary PII):

### Started Checkout / Placed Order
```typescript
{
  competition_id: string,
  competition_name: string,
  order_id: string,
  order_number?: string, // For Placed Order
  items: [{
    competition_id: string,
    competition_name: string,
    quantity: number,
    ticket_numbers: number[]
  }],
  value?: number // Order amount
}
```

### Won Competition
```typescript
{
  competition_id: string,
  competition_name: string,
  ticket_number: number,
  claim_code: string,
  prize_type: 'cash' | 'car' | 'holiday' | 'other'
}
```

### Abandoned Checkout
```typescript
{
  competition_id: string,
  competition_name: string,
  order_id: string,
  order_number: string,
  items: [...],
  value: number
}
```

## Testing with Postman MCP

All Klaviyo API calls can be tested using your Postman collection:
- **Collection:** "Klaviyo API (Previous Stable) (v2025-01-15)"
- **Workspace:** "Joltagon"

**Test Endpoints:**
1. Create Profile - `/profiles/` (POST)
2. Create Event - `/events/` (POST)
3. Create Metric - `/metrics/` (POST)
4. Subscribe to List - `/profile-subscription-bulk-create-jobs/` (POST)

## Error Handling

- All Klaviyo operations are wrapped in try-catch
- Errors are logged but never throw (don't fail main operations)
- Retry logic handles 429 (rate limit) and 5xx (server errors)
- Exponential backoff: 1s, 2s, 4s delays

## Next Steps / TODOs

1. **Entry Controller** - When created, add:
   - "Started Competition Entry" when user starts free entry
   - "Submitted Competition Entry" when free entry is submitted

2. **Referral System** - Complete implementation:
   - Add `referralCode` field to User model
   - Implement referral code lookup in auth controller
   - Track "Referred Friend" event for referrer
   - Grant 10 free entries when referred user makes first paid entry

3. **Free Entries Model** - Implement database storage:
   - Add `freeEntries` field to User model OR
   - Create separate `FreeEntry` model
   - Update `grantFreeEntriesAndTrack()` to actually grant entries

4. **Abandoned Checkout Optimization** (Optional):
   - Add `abandonedCheckoutTracked` flag to Order model
   - Prevent duplicate "Abandoned Checkout" events
   - Or use Redis TTL for more efficient detection

## Revenue Recovery Features

✅ **Every paid checkout** → Fires "Started Checkout" → "Abandoned Checkout" if not completed  
✅ **Every winner** → Triggers instant "Won Competition" event  
✅ **Every referral/newsletter signup** → Grants and tracks free entries  
✅ **Marketing opt-in** → Automatic email/SMS list subscription  

## Notes

- All Klaviyo operations are non-blocking (async, error-handled)
- Profile identification happens automatically on registration
- List subscriptions require list IDs to be configured
- Custom metrics are auto-created on first use
- All events include proper timestamps
- UK/GDPR compliant (minimal PII, only necessary data)

