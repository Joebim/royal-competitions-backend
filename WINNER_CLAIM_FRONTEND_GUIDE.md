# Winner Claim Frontend Implementation Guide

## Overview

This guide provides comprehensive documentation for implementing the winner claim functionality on the frontend. When a user wins a competition, they receive an email with a claim link containing a unique claim code. The frontend needs to handle the claim verification and submission process.

## Table of Contents

1. [Current Backend State](#current-backend-state)
2. [User Flow](#user-flow)
3. [API Endpoints](#api-endpoints)
4. [Frontend Implementation](#frontend-implementation)
5. [UI/UX Recommendations](#uiux-recommendations)
6. [Error Handling](#error-handling)
7. [Security Considerations](#security-considerations)

---

## Current Backend State

### Available Endpoints

The backend currently provides the following endpoints for winner management:

1. **GET `/api/v1/winners/:id`** - Get winner details (public)
2. **GET `/api/v1/winners`** - Get list of winners (public)
3. **PUT `/api/v1/admin/winners/:id`** - Update winner (admin only)

### Missing Endpoint

**⚠️ Important:** There is currently **no public endpoint for winners to claim their prize**. The `claimed` status can only be updated by admins.

### Recommendation

You have two options:

**Option 1: Use Admin Endpoint (Quick Solution)**
- Create a frontend endpoint that calls the admin endpoint
- Requires the winner to be authenticated
- Less secure but faster to implement

**Option 2: Create New Public Claim Endpoint (Recommended)**
- Backend needs to add a new endpoint: `POST /api/v1/winners/:id/claim`
- Verifies the claim code
- Updates the `claimed` status
- More secure and proper separation of concerns

---

## User Flow

### 1. Winner Receives Email

When a winner is selected, they receive an email with:
- Competition details
- Prize information
- Claim URL: `https://yourdomain.com/winners/{winnerId}/claim?code={claimCode}`

Example URL:
```
https://royalcompetitions.com/winners/6922065eaaee4e0b51e2f9ad/claim?code=ABCD-1234
```

### 2. User Clicks Claim Link

The frontend should:
- Extract `winnerId` from URL path
- Extract `code` from URL query parameters
- Verify the claim code matches the winner's record
- Display claim form if valid

### 3. User Submits Claim Form

The user should:
- Review their prize details
- Confirm their contact information
- Submit the claim
- Receive confirmation

### 4. Claim Confirmation

After successful claim:
- Show success message
- Update UI to show "Claimed" status
- Provide next steps (e.g., "Our team will contact you within 24 hours")

---

## API Endpoints

### 1. Get Winner Details

**Endpoint:** `GET /api/v1/winners/:id`

**Description:** Retrieve winner information including claim code verification.

**Authentication:** Not required (public endpoint)

**Request:**
```http
GET /api/v1/winners/6922065eaaee4e0b51e2f9ad
```

**Response:**
```json
{
  "success": true,
  "message": "Winner retrieved successfully",
  "data": {
    "winner": {
      "_id": "6922065eaaee4e0b51e2f9ad",
      "drawId": {
        "_id": "draw_id",
        "drawTime": "2025-11-22T22:00:00.000Z",
        "drawMethod": "automatic"
      },
      "competitionId": {
        "_id": "competition_id",
        "title": "Win a £10,000 Cash Prize",
        "prize": "£10,000 Cash",
        "prizeValue": 10000,
        "images": [...]
      },
      "userId": {
        "_id": "user_id",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "ticketId": {
        "_id": "ticket_id",
        "ticketNumber": 12345
      },
      "ticketNumber": 12345,
      "prize": "£10,000 Cash",
      "prizeValue": 10000,
      "notified": true,
      "notifiedAt": "2025-11-22T22:00:00.000Z",
      "claimed": false,
      "claimedAt": null,
      "claimCode": "ABCD-1234",
      "verified": false,
      "createdAt": "2025-11-22T22:00:00.000Z",
      "updatedAt": "2025-11-22T22:00:00.000Z"
    }
  }
}
```

**Usage:**
```typescript
// Verify claim code on frontend
const winner = await fetch(`/api/v1/winners/${winnerId}`);
const winnerData = await winner.json();

if (winnerData.data.winner.claimCode === urlClaimCode) {
  // Claim code is valid, show claim form
} else {
  // Invalid claim code, show error
}
```

---

### 2. Update Winner (Admin Endpoint - Option 1)

**Endpoint:** `PUT /api/v1/admin/winners/:id`

**Description:** Update winner status (admin only, but can be used if winner is authenticated).

**Authentication:** Required (admin or authenticated user)

**Request:**
```http
PUT /api/v1/admin/winners/6922065eaaee4e0b51e2f9ad
Content-Type: application/json
Cookie: authToken=...

{
  "claimed": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Winner updated successfully",
  "data": {
    "winner": {
      "_id": "6922065eaaee4e0b51e2f9ad",
      "claimed": true,
      "claimedAt": "2025-11-22T22:30:00.000Z",
      ...
    }
  }
}
```

**⚠️ Note:** This endpoint requires authentication. If the winner is not logged in, they'll need to log in first.

---

### 3. Recommended: Create Public Claim Endpoint (Option 2)

**⚠️ This endpoint needs to be created in the backend.**

**Endpoint:** `POST /api/v1/winners/:id/claim`

**Description:** Public endpoint for winners to claim their prize using their claim code.

**Authentication:** Not required

**Request:**
```http
POST /api/v1/winners/6922065eaaee4e0b51e2f9ad/claim
Content-Type: application/json

{
  "claimCode": "ABCD-1234"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Prize claimed successfully",
  "data": {
    "winner": {
      "_id": "6922065eaaee4e0b51e2f9ad",
      "claimed": true,
      "claimedAt": "2025-11-22T22:30:00.000Z",
      ...
    }
  }
}
```

**Response (Error - Invalid Code):**
```json
{
  "success": false,
  "message": "Invalid claim code",
  "error": {
    "statusCode": 400,
    "message": "The claim code provided does not match"
  }
}
```

**Response (Error - Already Claimed):**
```json
{
  "success": false,
  "message": "Prize already claimed",
  "error": {
    "statusCode": 400,
    "message": "This prize has already been claimed"
  }
}
```

---

## Frontend Implementation

### Step 1: Create Claim Page Route

```typescript
// routes.tsx or App.tsx
<Route path="/winners/:winnerId/claim" element={<ClaimPrizePage />} />
```

### Step 2: Claim Page Component Structure

```typescript
// pages/ClaimPrizePage.tsx
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

interface Winner {
  _id: string;
  competitionId: {
    title: string;
    prize: string;
    prizeValue: number;
    images: Array<{ url: string }>;
  };
  ticketNumber: number;
  prize: string;
  prizeValue: number;
  claimCode: string;
  claimed: boolean;
  claimedAt: string | null;
  userId: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export const ClaimPrizePage = () => {
  const { winnerId } = useParams<{ winnerId: string }>();
  const [searchParams] = useSearchParams();
  const claimCodeFromUrl = searchParams.get('code');

  const [winner, setWinner] = useState<Winner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  // Step 1: Fetch winner details and verify claim code
  useEffect(() => {
    const fetchWinner = async () => {
      if (!winnerId || !claimCodeFromUrl) {
        setError('Invalid claim link');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/winners/${winnerId}`,
          {
            credentials: 'include', // Include cookies for auth
          }
        );

        if (!response.ok) {
          throw new Error('Winner not found');
        }

        const data = await response.json();
        const winnerData = data.data.winner;

        // Verify claim code
        if (winnerData.claimCode !== claimCodeFromUrl) {
          setError('Invalid claim code. Please use the link from your email.');
          setLoading(false);
          return;
        }

        // Check if already claimed
        if (winnerData.claimed) {
          setClaimed(true);
          setWinner(winnerData);
          setLoading(false);
          return;
        }

        setWinner(winnerData);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to load winner details');
        setLoading(false);
      }
    };

    fetchWinner();
  }, [winnerId, claimCodeFromUrl]);

  // Step 2: Handle claim submission
  const handleClaim = async () => {
    if (!winner || !claimCodeFromUrl) return;

    setClaiming(true);
    setError(null);

    try {
      // Option 1: Use admin endpoint (requires authentication)
      const response = await fetch(
        `${API_BASE_URL}/admin/winners/${winnerId}/claim`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            claimed: true,
          }),
        }
      );

      // Option 2: Use public claim endpoint (if implemented)
      // const response = await fetch(
      //   `${API_BASE_URL}/winners/${winnerId}/claim`,
      //   {
      //     method: 'POST',
      //     headers: {
      //       'Content-Type': 'application/json',
      //     },
      //     credentials: 'include',
      //     body: JSON.stringify({
      //       claimCode: claimCodeFromUrl,
      //     }),
      //   }
      // );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to claim prize');
      }

      const data = await response.json();
      setWinner(data.data.winner);
      setClaimed(true);
    } catch (err: any) {
      setError(err.message || 'Failed to claim prize. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="claim-page">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (error && !winner) {
    return (
      <div className="claim-page">
        <div className="error">
          <h1>Invalid Claim Link</h1>
          <p>{error}</p>
          <p>Please use the link provided in your winner notification email.</p>
        </div>
      </div>
    );
  }

  if (!winner) {
    return (
      <div className="claim-page">
        <div className="error">Winner not found</div>
      </div>
    );
  }

  if (claimed || winner.claimed) {
    return (
      <div className="claim-page">
        <div className="claim-success">
          <h1>🎉 Prize Claimed Successfully!</h1>
          <div className="prize-details">
            <h2>{winner.competitionId.title}</h2>
            <p className="prize">{winner.prize}</p>
            <p className="ticket-number">Ticket Number: {winner.ticketNumber}</p>
          </div>
          <div className="next-steps">
            <h3>What Happens Next?</h3>
            <p>
              Our team will contact you at <strong>{winner.userId.email}</strong> within 24 hours
              to arrange prize delivery.
            </p>
            <p>
              Claimed on: {new Date(winner.claimedAt || Date.now()).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="claim-page">
      <div className="claim-form">
        <h1>🎉 Congratulations! You're a Winner!</h1>
        
        <div className="prize-details">
          <h2>{winner.competitionId.title}</h2>
          <div className="prize-image">
            {winner.competitionId.images[0] && (
              <img 
                src={winner.competitionId.images[0].url} 
                alt={winner.competitionId.title}
              />
            )}
          </div>
          <p className="prize">{winner.prize}</p>
          {winner.prizeValue && (
            <p className="prize-value">Value: £{winner.prizeValue.toLocaleString()}</p>
          )}
          <p className="ticket-number">Winning Ticket: #{winner.ticketNumber}</p>
        </div>

        <div className="winner-info">
          <h3>Winner Information</h3>
          <p><strong>Name:</strong> {winner.userId.firstName} {winner.userId.lastName}</p>
          <p><strong>Email:</strong> {winner.userId.email}</p>
        </div>

        {error && (
          <div className="error-message">{error}</div>
        )}

        <div className="claim-actions">
          <button 
            onClick={handleClaim} 
            disabled={claiming}
            className="claim-button"
          >
            {claiming ? 'Claiming...' : 'Claim My Prize'}
          </button>
        </div>

        <div className="claim-info">
          <p>
            <strong>Important:</strong> By claiming this prize, you confirm that:
          </p>
          <ul>
            <li>You are the rightful winner of this competition</li>
            <li>Your contact information is correct</li>
            <li>You understand that our team will contact you to arrange delivery</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
```

### Step 3: API Service Function

```typescript
// services/winner.service.ts
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

export const winnerService = {
  /**
   * Get winner details by ID
   */
  async getWinner(winnerId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/winners/${winnerId}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch winner details');
    }

    const data = await response.json();
    return data.data.winner;
  },

  /**
   * Verify claim code
   */
  verifyClaimCode(winner: any, claimCode: string): boolean {
    return winner.claimCode === claimCode;
  },

  /**
   * Claim prize (using admin endpoint - requires auth)
   */
  async claimPrize(winnerId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/winners/${winnerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        claimed: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to claim prize');
    }

    const data = await response.json();
    return data.data.winner;
  },

  /**
   * Claim prize with claim code (if public endpoint is implemented)
   */
  async claimPrizeWithCode(winnerId: string, claimCode: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/winners/${winnerId}/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        claimCode,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to claim prize');
    }

    const data = await response.json();
    return data.data.winner;
  },
};
```

---

## UI/UX Recommendations

### 1. Claim Page Design

**Visual Elements:**
- Large celebration icon/emoji (🎉)
- Competition image
- Prize details prominently displayed
- Clear call-to-action button
- Trust indicators (security badges, verification)

**Layout:**
```
┌─────────────────────────────────────┐
│         🎉 Congratulations!         │
│        You're a Winner!              │
├─────────────────────────────────────┤
│  [Competition Image]                 │
│                                      │
│  Competition: Win £10,000 Cash       │
│  Prize: £10,000 Cash                 │
│  Ticket Number: #12345               │
├─────────────────────────────────────┤
│  Winner Information:                 │
│  Name: John Doe                      │
│  Email: john@example.com             │
├─────────────────────────────────────┤
│  [Claim My Prize Button]             │
├─────────────────────────────────────┤
│  Important Information:             │
│  • Our team will contact you         │
│  • Delivery arranged within 24h      │
└─────────────────────────────────────┘
```

### 2. Success State

After successful claim:
- Show success animation
- Display confirmation message
- Show next steps
- Provide contact information
- Option to share on social media

### 3. Error States

**Invalid Claim Code:**
- Clear error message
- Instructions to use email link
- Contact support option

**Already Claimed:**
- Show "Already Claimed" status
- Display claim date
- Show contact information

**Network Errors:**
- Retry button
- Contact support option

### 4. Mobile Responsiveness

- Full-width design on mobile
- Large, touch-friendly buttons
- Readable text sizes
- Optimized images

---

## Error Handling

### Common Error Scenarios

1. **Invalid Winner ID**
   ```typescript
   if (!winner) {
     return <ErrorComponent message="Winner not found" />;
   }
   ```

2. **Invalid Claim Code**
   ```typescript
   if (winner.claimCode !== claimCodeFromUrl) {
     return <ErrorComponent message="Invalid claim code" />;
   }
   ```

3. **Already Claimed**
   ```typescript
   if (winner.claimed) {
     return <AlreadyClaimedComponent winner={winner} />;
   }
   ```

4. **Network Errors**
   ```typescript
   try {
     await claimPrize();
   } catch (error) {
     setError(error.message);
     // Show retry button
   }
   ```

5. **Authentication Required**
   ```typescript
   if (response.status === 401) {
     // Redirect to login with return URL
     navigate('/login?returnUrl=/winners/.../claim?code=...');
   }
   ```

---

## Security Considerations

### 1. Claim Code Verification

- **Always verify claim code on the frontend** before allowing claim submission
- Never trust URL parameters alone
- Compare claim code from URL with winner's actual claim code from API

### 2. Rate Limiting

- Implement rate limiting on claim attempts
- Show appropriate error messages
- Prevent brute force attacks

### 3. HTTPS

- Always use HTTPS for claim links
- Protect claim codes in transit

### 4. Session Management

- If using authenticated endpoint, ensure secure session handling
- Clear sensitive data after claim completion

### 5. Input Validation

- Validate winner ID format
- Validate claim code format (ABCD-1234)
- Sanitize all user inputs

---

## Testing Checklist

### Functional Tests

- [ ] User can access claim page with valid link
- [ ] Invalid claim code shows error
- [ ] Invalid winner ID shows error
- [ ] Already claimed shows appropriate message
- [ ] Claim submission works correctly
- [ ] Success state displays correctly
- [ ] Error messages are clear and helpful

### Security Tests

- [ ] Invalid claim codes are rejected
- [ ] Claim codes cannot be guessed
- [ ] Already claimed prizes cannot be claimed again
- [ ] Unauthorized users cannot claim prizes

### UI/UX Tests

- [ ] Page is mobile responsive
- [ ] Loading states are shown
- [ ] Error states are user-friendly
- [ ] Success state is celebratory
- [ ] All text is readable
- [ ] Images load correctly

---

## Backend Implementation Needed (Optional)

If you want to implement the recommended public claim endpoint, here's what needs to be added to the backend:

### 1. Create Claim Endpoint

**File:** `src/controllers/winner.controller.ts`

```typescript
/**
 * Claim prize (public endpoint)
 * POST /api/v1/winners/:id/claim
 */
export const claimPrize = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const winnerId = req.params.id;
    const { claimCode } = req.body;

    if (!claimCode) {
      throw new ApiError('Claim code is required', 400);
    }

    const winner = await Winner.findById(winnerId);
    if (!winner) {
      throw new ApiError('Winner not found', 404);
    }

    // Verify claim code
    if (winner.claimCode !== claimCode.trim().toUpperCase()) {
      throw new ApiError('Invalid claim code', 400);
    }

    // Check if already claimed
    if (winner.claimed) {
      throw new ApiError('Prize has already been claimed', 400);
    }

    // Update claimed status
    winner.claimed = true;
    winner.claimedAt = new Date();
    await winner.save();

    // Get updated winner with populated fields
    const updatedWinner = await Winner.findById(winnerId)
      .populate('competitionId', 'title prize images prizeValue')
      .populate('userId', 'firstName lastName email')
      .lean();

    res.json(
      ApiResponse.success(
        { winner: updatedWinner },
        'Prize claimed successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};
```

### 2. Add Route

**File:** `src/routes/winner.routes.ts`

```typescript
import { claimPrize } from '../controllers/winner.controller';

router.post('/:id/claim', claimPrize);
```

### 3. Add Validation

**File:** `src/validators/winner.validator.ts`

```typescript
export const claimPrizeSchema = Joi.object({
  claimCode: Joi.string()
    .pattern(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/)
    .required()
    .messages({
      'string.pattern.base': 'Claim code must be in format ABCD-1234',
      'any.required': 'Claim code is required',
    }),
});
```

---

## Summary

### Current State
- ✅ Backend has winner retrieval endpoints
- ✅ Backend has admin update endpoint
- ❌ No public claim endpoint (recommended to add)

### Implementation Steps

1. **Frontend:**
   - Create claim page route
   - Implement claim verification
   - Implement claim submission
   - Add error handling
   - Style the page

2. **Backend (Optional but Recommended):**
   - Add public claim endpoint
   - Add claim code validation
   - Add proper error handling

### Quick Start

For a quick implementation, you can:
1. Use the existing `GET /api/v1/winners/:id` endpoint to verify claim codes
2. Use the existing `PUT /api/v1/admin/winners/:id` endpoint for claiming (requires authentication)
3. Add the public claim endpoint later for better security

---

## Support

If you encounter any issues or need clarification, please refer to:
- Backend API documentation
- Winner model schema
- Email template service (for claim URL format)

---

**Last Updated:** November 22, 2025

