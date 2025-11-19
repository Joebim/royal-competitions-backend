# Email Address Configuration Guide

## Overview

The system supports using different email addresses with separate SMTP credentials for different types of emails:
- **noreply@royalcompetitions.co.uk** - For verification and password reset (no-reply emails)
- **info@royalcompetitions.co.uk** - For order updates, payment confirmations, winner notifications (action emails)

Each email address has its own SMTP user and password for maximum flexibility.

---

## Environment Variables

Add these to your `.env` file:

```env
# SMTP Server Configuration (shared for both email addresses)
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# No-Reply Email Configuration (for verification, password reset)
EMAIL_NOREPLY=noreply@royalcompetitions.co.uk
EMAIL_NOREPLY_NAME=Royal Competitions
EMAIL_NOREPLY_USER=your_noreply_smtp_user@gmail.com
EMAIL_NOREPLY_PASSWORD=your_noreply_smtp_password

# Info Email Configuration (for order updates, payments, winners)
EMAIL_INFO=info@royalcompetitions.co.uk
EMAIL_INFO_NAME=Royal Competitions
EMAIL_INFO_USER=your_info_smtp_user@gmail.com
EMAIL_INFO_PASSWORD=your_info_smtp_password
```

---

## Email Address Usage

### noreply@royalcompetitions.co.uk

Used for:
- ✅ **Email Verification** - When user registers
- ✅ **Password Reset** - When user requests password reset

**Why**: These are automated system emails that don't require replies.

### info@royalcompetitions.co.uk

Used for:
- ✅ **Order Confirmation** - When order is created
- ✅ **Payment Success** - When payment is captured
- ✅ **Winner Notification** - When user wins a competition
- ✅ **Order Refunded** - When refund is processed
- ✅ **Draw Completed** - When draw is executed
- ✅ **Competition Closed** - When competition closes

**Why**: These are transactional emails that users might want to reply to or contact support about.

---

## Configuration Examples

### Example 1: Using Gmail SMTP (Same Account)

```env
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# Both using same Gmail account (with app password)
EMAIL_NOREPLY=noreply@royalcompetitions.co.uk
EMAIL_NOREPLY_NAME=Royal Competitions
EMAIL_NOREPLY_USER=your-account@gmail.com
EMAIL_NOREPLY_PASSWORD=your-app-password

EMAIL_INFO=info@royalcompetitions.co.uk
EMAIL_INFO_NAME=Royal Competitions
EMAIL_INFO_USER=your-account@gmail.com
EMAIL_INFO_PASSWORD=your-app-password
```

### Example 2: Using Gmail SMTP (Different Accounts)

```env
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# Separate Gmail accounts
EMAIL_NOREPLY=noreply@royalcompetitions.co.uk
EMAIL_NOREPLY_NAME=Royal Competitions
EMAIL_NOREPLY_USER=noreply-account@gmail.com
EMAIL_NOREPLY_PASSWORD=noreply-app-password

EMAIL_INFO=info@royalcompetitions.co.uk
EMAIL_INFO_NAME=Royal Competitions
EMAIL_INFO_USER=info-account@gmail.com
EMAIL_INFO_PASSWORD=info-app-password
```

### Example 3: Using Custom SMTP Server

```env
EMAIL_SERVICE=
EMAIL_HOST=smtp.royalcompetitions.co.uk
EMAIL_PORT=587

EMAIL_NOREPLY=noreply@royalcompetitions.co.uk
EMAIL_NOREPLY_NAME=Royal Competitions
EMAIL_NOREPLY_USER=noreply@royalcompetitions.co.uk
EMAIL_NOREPLY_PASSWORD=noreply-smtp-password

EMAIL_INFO=info@royalcompetitions.co.uk
EMAIL_INFO_NAME=Royal Competitions
EMAIL_INFO_USER=info@royalcompetitions.co.uk
EMAIL_INFO_PASSWORD=info-smtp-password
```

### Example 4: Using SendGrid

```env
EMAIL_SERVICE=SendGrid
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587

EMAIL_NOREPLY=noreply@royalcompetitions.co.uk
EMAIL_NOREPLY_NAME=Royal Competitions
EMAIL_NOREPLY_USER=apikey
EMAIL_NOREPLY_PASSWORD=your-sendgrid-api-key

EMAIL_INFO=info@royalcompetitions.co.uk
EMAIL_INFO_NAME=Royal Competitions
EMAIL_INFO_USER=apikey
EMAIL_INFO_PASSWORD=your-sendgrid-api-key
```

---

## Important Notes

### Separate SMTP Credentials

**Each email address has its own SMTP user and password:**
- `EMAIL_NOREPLY_USER` and `EMAIL_NOREPLY_PASSWORD` for noreply emails
- `EMAIL_INFO_USER` and `EMAIL_INFO_PASSWORD` for info emails

This allows you to:
- Use different SMTP accounts for each email address
- Have separate authentication credentials
- Better security isolation between email types

### SMTP Server Configuration

The SMTP server settings (`EMAIL_SERVICE`, `EMAIL_HOST`, `EMAIL_PORT`) are shared between both email addresses. Both accounts must be able to connect to the same SMTP server.

### Email Verification

Make sure both email addresses are:
- ✅ Properly configured in your email provider
- ✅ Verified/authenticated if required by your provider
- ✅ Have valid SMTP credentials that can send through the configured SMTP server

---

## Testing

### Test No-Reply Emails

1. Register a new user
2. Check inbox for verification email
3. Verify it's from: `noreply@royalcompetitions.co.uk`

### Test Info Emails

1. Create an order
2. Complete payment
3. Check inbox for payment success email
4. Verify it's from: `info@royalcompetitions.co.uk`

---

## Code Implementation

The email service automatically uses the correct "from" address:

```typescript
// Verification email uses noreply@
await emailService.sendVerificationEmail(email, firstName, token);
// Sends from: noreply@royalcompetitions.co.uk

// Payment success email uses info@
await emailService.sendPaymentSuccessEmail({...});
// Sends from: info@royalcompetitions.co.uk
```

---

## Summary

### Email Address Mapping

| Email Type | From Address | Environment Variable |
|------------|--------------|---------------------|
| Email Verification | noreply@ | `EMAIL_NOREPLY` |
| Password Reset | noreply@ | `EMAIL_NOREPLY` |
| Order Confirmation | info@ | `EMAIL_INFO` |
| Payment Success | info@ | `EMAIL_INFO` |
| Winner Notification | info@ | `EMAIL_INFO` |
| Order Refunded | info@ | `EMAIL_INFO` |
| Draw Completed | info@ | `EMAIL_INFO` |
| Competition Closed | info@ | `EMAIL_INFO` |

### Quick Setup

1. Add environment variables to `.env`
2. Configure SMTP settings
3. Ensure both email addresses can send through SMTP
4. Test email sending
5. Done! ✅

The system will automatically use the correct email address for each notification type.

