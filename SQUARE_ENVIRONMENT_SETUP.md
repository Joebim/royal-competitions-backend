# Square Payment - Backend Environment Variables Setup

This guide explains the environment variables required for Square payment integration in the backend.

## Required Environment Variables

Add these variables to your `.env` file:

```env
# Square Payments Configuration
SQ_ACCESS_TOKEN=your_square_access_token
SQ_LOCATION_ID=your_square_location_id
SQ_APP_ID=your_square_application_id
SQ_ENVIRONMENT=sandbox  # or 'production'
SQ_WEBHOOK_SECRET=your_square_webhook_secret  # Optional
```

---

## How to Get Square Credentials

### Step 1: Create Square Developer Account

1. Go to [Square Developer Dashboard](https://developer.squareup.com/)
2. Sign in or create an account
3. Create a new application

### Step 2: Get Your Credentials

#### 1. Access Token

- Navigate to your application in Square Developer Dashboard
- Go to **Credentials** section
- Copy your **Access Token**
  - **Sandbox**: Starts with `sandbox-sq0atp-...`
  - **Production**: Starts with `EAAA...` or `sq0atp-...`

**Environment Variable**: `SQ_ACCESS_TOKEN`

#### 2. Location ID

- Go to **Locations** in Square Dashboard
- Select your location (or create one)
- Copy the **Location ID** (e.g., `LXXXXXXXXXXXXXXXXX`)

**Environment Variable**: `SQ_LOCATION_ID`

#### 3. Application ID

- In your Square application settings
- Copy the **Application ID**
  - **Sandbox**: Starts with `sandbox-sq0idb-...`
  - **Production**: Starts with `sq0idb-...`

**Environment Variable**: `SQ_APP_ID`

**Note**: This is also needed for the frontend (as `REACT_APP_SQUARE_APPLICATION_ID`)

#### 4. Environment

Set to either:
- `sandbox` - For testing
- `production` - For live payments

**Environment Variable**: `SQ_ENVIRONMENT`

#### 5. Webhook Secret (Optional)

- Go to **Webhooks** in your Square application
- Create a webhook endpoint
- Copy the **Webhook Signature Key**

**Environment Variable**: `SQ_WEBHOOK_SECRET`

**Note**: Webhook secret is optional but recommended for production to verify webhook authenticity.

---

## Environment Variable Details

### `SQ_ACCESS_TOKEN`

- **Type**: String
- **Required**: Yes
- **Description**: Square API access token for server-side API calls
- **Example (Sandbox)**: `sandbox-sq0atp-XXXXXXXXXXXXXXXXXXXXXXXXXXXX`
- **Example (Production)**: `EAAAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

**Where to find**: Square Developer Dashboard → Your Application → Credentials → Access Token

---

### `SQ_LOCATION_ID`

- **Type**: String
- **Required**: Yes
- **Description**: Your Square business location ID
- **Example**: `LXXXXXXXXXXXXXXXXX`

**Where to find**: Square Dashboard → Locations → Select Location → Location ID

**Important**: 
- Each location has a unique ID
- Use the location where you want payments to be processed
- Location ID is required for all payment operations

---

### `SQ_APP_ID`

- **Type**: String
- **Required**: Yes
- **Description**: Your Square application ID (also used by frontend)
- **Example (Sandbox)**: `sandbox-sq0idb-XXXXXXXXXXXXXXXXXXXX`
- **Example (Production)**: `sq0idb-XXXXXXXXXXXXXXXXXXXX`

**Where to find**: Square Developer Dashboard → Your Application → Application ID

**Note**: 
- This is the same Application ID used in the frontend
- Frontend uses it as `REACT_APP_SQUARE_APPLICATION_ID`

---

### `SQ_ENVIRONMENT`

- **Type**: String
- **Required**: Yes
- **Default**: `sandbox`
- **Values**: `sandbox` | `production`
- **Description**: Square API environment to use

**Usage**:
- `sandbox` - For development and testing
- `production` - For live payments

**Example**:
```env
SQ_ENVIRONMENT=sandbox  # For testing
# or
SQ_ENVIRONMENT=production  # For live
```

---

### `SQ_WEBHOOK_SECRET`

- **Type**: String
- **Required**: No (but recommended for production)
- **Description**: Secret key for verifying Square webhook signatures
- **Example**: `sq0webhook-secret-XXXXXXXXXXXXXXXXXXXX`

**Where to find**: Square Developer Dashboard → Your Application → Webhooks → Webhook Signature Key

**Note**:
- Optional for development
- **Highly recommended for production** to verify webhook authenticity
- If not set, webhook verification will be skipped in development mode only

---

## Complete .env Example

```env
# Square Payments
SQ_ACCESS_TOKEN=sandbox-sq0atp-XXXXXXXXXXXXXXXXXXXXXXXXXXXX
SQ_LOCATION_ID=LXXXXXXXXXXXXXXXXX
SQ_APP_ID=sandbox-sq0idb-XXXXXXXXXXXXXXXXXXXX
SQ_ENVIRONMENT=sandbox
SQ_WEBHOOK_SECRET=sq0webhook-secret-XXXXXXXXXXXXXXXXXXXX
```

---

## Sandbox vs Production

### Sandbox Environment

**Use for**: Development and testing

```env
SQ_ACCESS_TOKEN=sandbox-sq0atp-...
SQ_APP_ID=sandbox-sq0idb-...
SQ_ENVIRONMENT=sandbox
```

**Features**:
- Test payments without real money
- Use test cards (e.g., `4111 1111 1111 1111`)
- No real transactions

### Production Environment

**Use for**: Live payments

```env
SQ_ACCESS_TOKEN=EAAA...  # or sq0atp-...
SQ_APP_ID=sq0idb-...
SQ_ENVIRONMENT=production
```

**Features**:
- Real payments
- Real money transactions
- Requires production credentials

**Important**: 
- Never use production credentials in development
- Keep production credentials secure
- Use environment-specific .env files

---

## Setting Up Webhooks (Optional but Recommended)

### Step 1: Create Webhook Endpoint

Your webhook endpoint is:
```
POST /api/v1/payments/webhook
```

Full URL example:
```
https://yourdomain.com/api/v1/payments/webhook
```

### Step 2: Configure in Square Dashboard

1. Go to Square Developer Dashboard → Your Application → Webhooks
2. Click **Add Webhook**
3. Enter your webhook URL
4. Select events to subscribe to:
   - `payment.updated` (Required)
   - `refund.updated` (Optional, for refunds)
5. Copy the **Webhook Signature Key** → Set as `SQ_WEBHOOK_SECRET`

### Step 3: Test Webhook

Square will send test events to verify your webhook is working.

---

## Verification Checklist

Before going live, verify:

- [ ] `SQ_ACCESS_TOKEN` is set and valid
- [ ] `SQ_LOCATION_ID` is set and matches your Square location
- [ ] `SQ_APP_ID` is set and matches your Square application
- [ ] `SQ_ENVIRONMENT` is set to `sandbox` for testing or `production` for live
- [ ] `SQ_WEBHOOK_SECRET` is set (recommended for production)
- [ ] Frontend has matching `REACT_APP_SQUARE_APPLICATION_ID` and `REACT_APP_SQUARE_LOCATION_ID`
- [ ] Test payment flow in sandbox mode
- [ ] Verify webhook receives events (if webhook secret is set)

---

## Security Best Practices

1. **Never commit `.env` file** to version control
2. **Use different credentials** for sandbox and production
3. **Rotate access tokens** regularly
4. **Use webhook secret** in production to verify webhook authenticity
5. **Store secrets securely** (use environment variable management tools in production)
6. **Limit access** to production credentials

---

## Troubleshooting

### Error: "Invalid access token"

- Check `SQ_ACCESS_TOKEN` is correct
- Verify token matches environment (sandbox vs production)
- Ensure token hasn't expired or been revoked

### Error: "Invalid location ID"

- Check `SQ_LOCATION_ID` is correct
- Verify location exists in your Square account
- Ensure location is active

### Error: "Webhook signature verification failed"

- Check `SQ_WEBHOOK_SECRET` is correct
- Verify webhook URL is correct in Square Dashboard
- Ensure webhook secret matches the one in Square Dashboard

### Payments not processing

- Verify `SQ_ENVIRONMENT` matches your access token type
- Check Square Dashboard for API errors
- Review backend logs for detailed error messages

---

## Quick Start

1. **Get Square credentials** from Square Developer Dashboard
2. **Add to `.env` file**:
   ```env
   SQ_ACCESS_TOKEN=your_token_here
   SQ_LOCATION_ID=your_location_id_here
   SQ_APP_ID=your_app_id_here
   SQ_ENVIRONMENT=sandbox
   ```
3. **Restart backend server**
4. **Test payment flow**

---

**Last Updated**: 2025-01-24
**Version**: 1.0.0

