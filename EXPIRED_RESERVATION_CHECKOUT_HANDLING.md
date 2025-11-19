# Expired Reservation Checkout Handling

## Scenario
**Question**: If a ticket stays in the cart after 15 minutes and is cleaned up, and the user later tries to create an order with that ticket and checkout, what happens?

## Answer

The system now **automatically handles this scenario** with the following behavior:

### What Happens

1. **When User Tries to Checkout** (`createCheckoutFromCart`):
   - The system checks for existing reserved tickets for that user and competition
   - If valid reservations exist (not expired), it uses them
   - If reservations expired or don't exist, it **automatically re-reserves tickets**
   - If tickets are no longer available, it returns a clear error message

2. **Automatic Re-reservation**:
   - Cleans up any expired reservations for the user
   - Checks current ticket availability (excluding expired reservations)
   - Finds available ticket numbers dynamically
   - Reserves new tickets atomically
   - Creates order with the newly reserved tickets

3. **Validation**:
   - Verifies competition is still available (not ended, drawn, or cancelled)
   - Checks if enough tickets are available
   - Handles race conditions with duplicate key detection

## Implementation Details

### Flow Diagram

```
User clicks "Checkout"
    ↓
System checks for existing reservations
    ↓
┌─────────────────────────────────────┐
│ Valid reservations exist?           │
│ (not expired, correct quantity)    │
└─────────────────────────────────────┘
    ↓ Yes                    ↓ No
Use existing          Clean up expired
reservations          reservations
    ↓                    ↓
Create order      Check availability
    ↓                    ↓
                  Reserve new tickets
                         ↓
                  Create order
```

### Code Flow

1. **Check Existing Reservations** (lines 87-89):
   ```typescript
   const existingReservations = await Ticket.find({
     competitionId: competition._id,
     userId: req.user._id,
     status: TicketStatus.RESERVED,
     reservedUntil: { $gt: now },
   });
   ```

2. **Use Existing or Re-reserve** (lines 94-227):
   - If `existingReservations.length >= cartItem.quantity`: Use existing
   - Otherwise: Clean up expired and reserve new tickets

3. **Create Order with Reserved Tickets** (line 257):
   ```typescript
   ticketsReserved, // Now populated with actual reserved ticket numbers
   ```

### Error Handling

The system handles several error scenarios:

1. **Tickets No Longer Available**:
   - Error: `"Only X tickets remaining for [Competition]. Please remove some items from your cart."`
   - Status: 400

2. **Competition Ended**:
   - Error: `"Competition [Title] is no longer accepting entries"`
   - Status: 400

3. **Race Condition (Tickets Taken)**:
   - Error: `"Tickets for [Competition] are no longer available. Please try again."`
   - Status: 409

4. **Reservation Failed**:
   - Error: `"Unable to reserve tickets for [Competition]. Please try again."`
   - Status: 500

## Additional Validation

### `createCheckoutPaymentIntent` Enhancement

The system also validates tickets when creating payment intent for existing orders:

```typescript
// Verify that the reserved tickets still exist and are valid
const reservedTickets = await Ticket.find({
  competitionId: order.competitionId,
  ticketNumber: { $in: order.ticketsReserved },
  status: TicketStatus.RESERVED,
  reservedUntil: { $gt: now },
});

if (reservedTickets.length !== order.quantity) {
  throw new ApiError(
    'Some reserved tickets have expired. Please refresh and try again.',
    400
  );
}
```

## Benefits

1. **Seamless User Experience**: Users don't need to manually re-reserve tickets
2. **Automatic Recovery**: System handles expired reservations transparently
3. **Clear Error Messages**: Users know exactly what went wrong
4. **Race Condition Protection**: Handles concurrent requests safely
5. **Data Integrity**: Ensures orders always have valid reserved tickets

## Edge Cases Handled

1. ✅ **Expired Reservations**: Automatically re-reserves
2. ✅ **Partial Expiration**: Uses valid reservations, re-reserves missing ones
3. ✅ **Competition Ended**: Clear error message
4. ✅ **Tickets Sold Out**: Clear error with remaining count
5. ✅ **Race Conditions**: Handles duplicate key errors gracefully
6. ✅ **Multiple Items**: Processes each cart item independently

## User Experience

**Before**: User would get an error and need to manually re-reserve tickets

**After**: 
- System automatically re-reserves tickets if expired
- User proceeds to checkout seamlessly
- Only fails if tickets are genuinely unavailable

## Testing Recommendations

1. **Expired Reservation Test**:
   - Add item to cart
   - Wait 15+ minutes
   - Try to checkout
   - Verify tickets are automatically re-reserved

2. **Sold Out Test**:
   - Add item to cart
   - Wait for competition to sell out
   - Try to checkout
   - Verify clear error message

3. **Concurrent Users Test**:
   - Multiple users checkout simultaneously
   - Verify no race conditions
   - Verify all users get valid reservations

4. **Partial Expiration Test**:
   - Reserve 5 tickets
   - Wait for 3 to expire
   - Try to checkout with 5 tickets
   - Verify system re-reserves the 3 missing tickets

