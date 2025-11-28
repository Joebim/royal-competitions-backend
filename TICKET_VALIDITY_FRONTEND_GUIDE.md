# Ticket Validity Feature - Frontend Implementation Guide

## Overview

This feature allows customers to purchase tickets even if they answer the skill-based question incorrectly. Invalid tickets (those with incorrect answers) will be excluded from draws and winner selection.

## Key Changes

### 1. New Field: `isValid` on Tickets

All tickets now have an `isValid` boolean field:
- `true` (default): Ticket is valid and eligible for draws
- `false`: Ticket is invalid (incorrect answer) and will be excluded from draws

### 2. New Field: `ticketsValid` on Orders

Orders now accept an optional `ticketsValid` boolean field:
- `true` (default): All tickets in the order are valid
- `false`: All tickets in the order are invalid (incorrect answer)

## Implementation Flow

### Scenario 1: Answer Known Before Checkout

If the user answers the question **before** clicking "Buy Now":

1. **Validate Answer** (existing endpoint):
   ```
   POST /api/v1/competitions/:id/entries/validate-answer
   Body: { "answer": "user's answer" }
   Response: { "isCorrect": true/false }
   ```

2. **Create Order with Validity**:
   ```
   POST /api/v1/orders
   Body: {
     "competitionId": "...",
     "qty": 1,
     "ticketsValid": false,  // Set to false if answer was incorrect
     "billingDetails": {...},
     ...
   }
   ```

3. **Proceed with Payment**: The order is created and payment proceeds normally, but tickets will be marked as invalid if `ticketsValid: false`.

### Scenario 2: Answer Submitted After Payment

If the user answers the question **after** payment (via entry submission):

1. **Submit Entry** (existing endpoint):
   ```
   POST /api/v1/entries/submit
   Body: {
     "competitionId": "...",
     "orderId": "...",
     "ticketNumber": 123,
     "answer": "user's answer"
   }
   ```

2. **Automatic Ticket Update**: 
   - If `isCorrect: false` in the response, the ticket is automatically marked as `isValid: false`
   - No additional API call needed

## API Endpoints

### 1. Create Order (Updated)

**Endpoint**: `POST /api/v1/orders`

**New Optional Field**:
```json
{
  "competitionId": "string",
  "qty": 1,
  "ticketsValid": true,  // NEW: Optional boolean (default: true)
  "billingDetails": {...},
  ...
}
```

**Behavior**:
- If `ticketsValid` is `false`, all tickets in the order will be marked as invalid
- If `ticketsValid` is `true` or omitted, tickets will be valid (default)
- Tickets are marked with `isValid` when payment is completed

### 2. Submit Entry (Updated Response)

**Endpoint**: `POST /api/v1/entries/submit`

**Response** (unchanged):
```json
{
  "success": true,
  "data": {
    "entry": {...},
    "isCorrect": false,  // Indicates if answer was correct
    "message": "Entry submitted successfully! However, your answer is incorrect."
  }
}
```

**Backend Behavior**:
- If `isCorrect: false`, the ticket is automatically updated to `isValid: false`
- This happens automatically - no frontend action needed

### 3. Get Ticket List (Updated Response)

**Endpoint**: `GET /api/v1/competitions/:id/tickets/list`

**Response** (updated):
```json
{
  "success": true,
  "data": {
    "tickets": [
      {
        "ticketNumber": 1,
        "status": "bought",
        "isValid": true  // NEW: Only present for bought tickets
      },
      {
        "ticketNumber": 2,
        "status": "bought",
        "isValid": false  // Invalid ticket (incorrect answer)
      },
      {
        "ticketNumber": 3,
        "status": "available"
        // isValid not present for available/reserved tickets
      }
    ]
  }
}
```

## Frontend Implementation

### Step 1: Update Order Creation

When creating an order, include `ticketsValid` based on answer validation:

```javascript
// After validating answer
const isAnswerCorrect = await validateAnswer(competitionId, userAnswer);

// Create order with validity
const order = await createOrder({
  competitionId,
  qty: 1,
  ticketsValid: isAnswerCorrect,  // Set based on answer correctness
  billingDetails: {...},
  // ... other fields
});
```

### Step 2: Handle Entry Submission

When submitting an entry after payment, check the response:

```javascript
const response = await submitEntry({
  competitionId,
  orderId,
  ticketNumber,
  answer: userAnswer
});

if (!response.data.isCorrect) {
  // Answer was incorrect
  // Ticket is automatically marked as invalid by backend
  // You can show a message to the user:
  showMessage('Your answer was incorrect. This ticket will not be eligible for the draw.');
}
```

### Step 3: Display Ticket Validity

When displaying user's tickets, show validity status:

```javascript
// Get user's tickets
const tickets = await getUserTickets(userId, competitionId);

tickets.forEach(ticket => {
  if (ticket.status === 'bought' || ticket.status === 'active') {
    if (ticket.isValid === false) {
      // Show warning that ticket is invalid
      displayInvalidTicketWarning(ticket);
    }
  }
});
```

### Step 4: Update UI Flow

**Before (Blocked Checkout)**:
```
User answers question → Answer incorrect → Show error → Block checkout
```

**After (Allow Checkout)**:
```
User answers question → Answer incorrect → Show warning → Allow checkout → Ticket marked invalid
```

**Example UI Flow**:
```javascript
async function handleBuyNow(competitionId, selectedTickets, userAnswer) {
  // Validate answer
  const validation = await validateAnswer(competitionId, userAnswer);
  
  if (!validation.isCorrect) {
    // Show warning but allow checkout
    const proceed = await showWarningDialog(
      'Your answer is incorrect. You can still purchase the ticket, ' +
      'but it will not be eligible for the draw. Do you want to continue?'
    );
    
    if (!proceed) {
      return; // User cancelled
    }
  }
  
  // Create order with validity
  const order = await createOrder({
    competitionId,
    qty: selectedTickets.length,
    ticketsValid: validation.isCorrect,  // false if incorrect
    // ... other fields
  });
  
  // Proceed with payment
  proceedToPayment(order);
}
```

## Important Notes

### 1. Default Behavior
- If `ticketsValid` is not provided, it defaults to `true`
- Tickets are valid by default unless explicitly marked as invalid

### 2. Draw Exclusion
- Invalid tickets (`isValid: false`) are **automatically excluded** from all draws
- Only valid tickets are included in winner selection
- This happens automatically in the backend - no frontend action needed

### 3. Ticket Status vs Validity
- **Status**: `reserved`, `active`, `winner`, etc. (ticket lifecycle)
- **Validity**: `true`/`false` (whether ticket is eligible for draws)
- A ticket can be `active` but `invalid` (bought with incorrect answer)

### 4. Entry Submission
- If entry is submitted **after** payment, the ticket validity is updated automatically
- If `isCorrect: false`, ticket is marked as `isValid: false`
- This happens regardless of the `ticketsValid` value sent during order creation

### 5. Multiple Tickets
- Currently, `ticketsValid` applies to **all tickets** in an order
- If you need per-ticket validity, you'll need to create separate orders

## Example: Complete Flow

```javascript
// 1. User views competition and answers question
const userAnswer = getUserAnswer();

// 2. Validate answer (optional - can skip if submitting after payment)
const validation = await fetch('/api/v1/competitions/123/entries/validate-answer', {
  method: 'POST',
  body: JSON.stringify({ answer: userAnswer })
});

// 3. User clicks "Buy Now"
// Show warning if incorrect, but allow checkout
if (!validation.isCorrect) {
  const proceed = confirm(
    'Your answer is incorrect. You can still purchase, but the ticket ' +
    'will not be eligible for the draw. Continue?'
  );
  if (!proceed) return;
}

// 4. Create order with validity
const order = await fetch('/api/v1/orders', {
  method: 'POST',
  body: JSON.stringify({
    competitionId: '123',
    qty: 1,
    ticketsValid: validation.isCorrect,  // false if incorrect
    billingDetails: {...},
    // ... other fields
  })
});

// 5. Process payment
// ... payment flow ...

// 6. After payment, submit entry (if not done before)
const entry = await fetch('/api/v1/entries/submit', {
  method: 'POST',
  body: JSON.stringify({
    competitionId: '123',
    orderId: order.id,
    ticketNumber: order.ticketsReserved[0],
    answer: userAnswer
  })
});

// 7. Check entry response
if (!entry.isCorrect) {
  // Ticket is now marked as invalid
  // Show message to user
  showMessage('Your answer was incorrect. This ticket is not eligible for the draw.');
}
```

## Testing Checklist

- [ ] Create order with `ticketsValid: true` → Ticket should be valid
- [ ] Create order with `ticketsValid: false` → Ticket should be invalid
- [ ] Create order without `ticketsValid` → Ticket should default to valid
- [ ] Submit entry with incorrect answer → Ticket should be marked invalid
- [ ] Submit entry with correct answer → Ticket should remain valid
- [ ] Verify invalid tickets are excluded from draws
- [ ] Display validity status in ticket list
- [ ] Show warning when answer is incorrect but allow checkout

## Migration Notes

### Existing Tickets
- All existing tickets will have `isValid: true` by default
- No migration needed - existing tickets remain valid

### Backward Compatibility
- If `ticketsValid` is not provided, it defaults to `true`
- Existing frontend code will continue to work without changes
- New functionality is opt-in via the `ticketsValid` field

## Support

For questions or issues, contact the backend team or refer to the API documentation.

