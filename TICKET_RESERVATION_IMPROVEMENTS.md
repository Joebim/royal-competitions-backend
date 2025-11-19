# Ticket Reservation System Improvements

## Overview
This document describes the improvements made to the ticket reservation system to handle concurrent users, prevent race conditions, and properly manage ticket reservations in relation to cart operations.

## Problems Solved

### 1. Race Condition Errors
**Problem**: The previous implementation used `nextTicketNumber` increment which caused race conditions when multiple users tried to reserve tickets simultaneously, resulting in "Some tickets are already reserved" errors.

**Solution**: Implemented a dynamic ticket number finding algorithm that:
- Queries existing tickets to find available numbers
- Uses retry logic with exponential backoff (up to 5 retries)
- Atomically reserves tickets using `insertMany` with unique index protection
- Handles duplicate key errors gracefully by retrying with new numbers

### 2. Cart Item Removal
**Problem**: When users removed items from cart, reserved tickets were not being unreserved, causing tickets to remain locked until expiration.

**Solution**: 
- Updated `removeCartItem` to automatically unreserve tickets when an item is removed
- Updated `clearCart` to unreserve all tickets for all competitions in the cart
- Only unreserves non-expired reservations to avoid conflicts

### 3. Expired Reservations
**Problem**: Expired reservations (15 minutes) were not being cleaned up aggressively enough.

**Solution**:
- Reduced cleanup interval from 5 minutes to 2 minutes
- Added safety net to clean up reservations older than 20 minutes
- Handles tickets without `reservedUntil` field

## Implementation Details

### New Functions

#### `findAvailableTicketNumbers()`
Finds available ticket numbers dynamically by:
1. Querying all existing tickets (active, winner, and non-expired reserved)
2. Finding gaps in ticket numbers starting from 1
3. Attempting to reserve those numbers atomically
4. Retrying with exponential backoff if duplicates are found

**Key Features**:
- Up to 5 retry attempts
- Exponential backoff (100ms, 200ms, 400ms, 800ms, 1000ms max)
- Safety check to prevent infinite loops
- Handles race conditions gracefully

#### `unreserveTickets()`
New endpoint to unreserve tickets:
- `DELETE /api/v1/tickets/competitions/:id/hold`
- Accepts optional `ticketNumbers` array in body
- Only unreserves tickets belonging to the authenticated user
- Only unreserves tickets that are still in RESERVED status

### Updated Functions

#### `holdTickets()`
**Improvements**:
- Uses `findAvailableTicketNumbers()` instead of incrementing `nextTicketNumber`
- More accurate availability calculation (excludes expired reservations)
- Better error messages
- Handles concurrent requests without race conditions

#### `removeCartItem()`
**New Behavior**:
- Automatically unreserves tickets for the removed competition
- Only unreserves non-expired reservations
- Logs unreservation activity
- Doesn't fail if unreservation fails (logs warning)

#### `clearCart()`
**New Behavior**:
- Unreserves tickets for all competitions in the cart
- Processes all competitions before clearing cart
- Handles errors gracefully

#### `cleanupExpiredReservations()`
**Improvements**:
- Runs every 2 minutes (was 5 minutes)
- Cleans up expired reservations based on `reservedUntil`
- Safety net: cleans up reservations older than 20 minutes
- Handles tickets without `reservedUntil` field

## API Endpoints

### Reserve Tickets
```
POST /api/v1/tickets/competitions/:id/hold
Body: { "qty": 2 }
Response: {
  "reservationId": "res_...",
  "reservedTickets": [1, 2],
  "reservedUntil": "2025-11-18T19:30:00.000Z",
  "costPence": 730,
  "costGBP": "7.30",
  ...
}
```

### Unreserve Tickets
```
DELETE /api/v1/tickets/competitions/:id/hold
Body: { "ticketNumbers": [1, 2] } // Optional - if not provided, unreserves all for that competition
Response: {
  "unreservedCount": 2
}
```

## How It Works

### Reservation Flow
1. User requests to reserve tickets
2. System validates competition availability
3. System finds available ticket numbers dynamically
4. System attempts to reserve tickets atomically
5. If duplicate found, retries with new numbers (up to 5 times)
6. Returns reserved ticket numbers

### Cart Integration
1. **Adding to Cart**: User adds item to cart (no automatic reservation)
2. **Reserving Tickets**: User must call `/hold` endpoint to reserve tickets
3. **Removing from Cart**: Automatically unreserves tickets for that competition
4. **Clearing Cart**: Automatically unreserves all tickets for all competitions

### Expiration Handling
1. Reservations expire after 15 minutes (`reservedUntil` field)
2. Cleanup job runs every 2 minutes
3. Expired reservations are automatically deleted
4. Safety net cleans up reservations older than 20 minutes

## Benefits

1. **No More Race Conditions**: Dynamic ticket finding prevents conflicts
2. **Better User Experience**: Automatic unreservation when removing from cart
3. **Faster Cleanup**: Expired reservations are cleaned up more frequently
4. **Concurrent User Support**: System handles multiple simultaneous requests
5. **Retry Logic**: Automatic retries with backoff for high-demand scenarios

## Testing Recommendations

1. **Concurrent Requests**: Test multiple users reserving tickets simultaneously
2. **Cart Operations**: Test adding/removing items and verify ticket unreservation
3. **Expiration**: Test that expired reservations are cleaned up properly
4. **Edge Cases**: Test with limited tickets, high demand scenarios
5. **Error Handling**: Test behavior when tickets are already taken

## Migration Notes

- No database migration required
- Existing reservations will continue to work
- New reservations use the improved algorithm
- Cleanup job automatically handles old reservations

## Monitoring

Key metrics to monitor:
- Number of retry attempts (should be low)
- Cleanup job execution frequency
- Unreservation counts when removing from cart
- Error rates for ticket reservations

