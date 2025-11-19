# Ticket Lifecycle Explanation

## Complete Ticket Flow: When Tickets Are Created and Status Changes

### Overview

Tickets go through several stages from reservation to winner selection. Here's the complete flow:

---

## 1. **TICKET RESERVATION** (Status: `RESERVED`)

### When Tickets Are Created:

Tickets are **FIRST CREATED** during the checkout process, **BEFORE** payment is captured.

### Where This Happens:

#### A. During Checkout from Cart (`createCheckoutFromCart`)

**File:** `src/controllers/checkout.controller.ts`
**Lines:** 196-205

```typescript
// Reserve tickets atomically
const ticketsToCreate = availableNumbers.map((ticketNumber) => ({
  competitionId: competition._id,
  ticketNumber,
  userId: req.user!._id,
  status: TicketStatus.RESERVED, // ← Created as RESERVED
  reservedUntil, // Expires in 15 minutes
}));

await Ticket.insertMany(ticketsToCreate, { ordered: false });
```

**What Happens:**

- User clicks "Checkout" from cart
- System checks for existing reservations
- If no valid reservations exist, **tickets are created** with status `RESERVED`
- Tickets have a `reservedUntil` timestamp (15 minutes from now)
- Order is created with `ticketsReserved` array containing ticket numbers
- **Tickets exist in database at this point** ✅

#### B. When Holding Tickets Directly (`holdTickets`)

**File:** `src/controllers/ticket.controller.ts`
**Lines:** 193-196

```typescript
const reservedTickets = await findAvailableTicketNumbers(
  new mongoose.Types.ObjectId(competitionId),
  qty
);
```

**What Happens:**

- User adds items to cart (calls `/competitions/:id/hold`)
- Tickets are created with status `RESERVED`
- These are temporary reservations

### Why Tickets Are Created Before Payment:

1. **Prevents Double Booking**: Ensures ticket numbers are reserved and can't be taken by another user
2. **Race Condition Prevention**: Uses atomic operations to prevent conflicts
3. **User Experience**: User knows which ticket numbers they're purchasing
4. **Inventory Management**: System knows exactly how many tickets are available

---

## 2. **PAYMENT CAPTURE** (Status: `RESERVED` → `ACTIVE`)

### When Tickets Are Updated:

Tickets are **UPDATED FROM RESERVED TO ACTIVE** when payment is successfully captured.

### Where This Happens:

**File:** `src/controllers/payment.controller.ts`
**Function:** `handlePaymentSuccess`
**Lines:** 321-407

#### Step 1: Try to Update Existing RESERVED Tickets

```typescript
// Update reserved tickets to active
const updateResult = await Ticket.updateMany(
  {
    competitionId: order.competitionId,
    ticketNumber: { $in: order.ticketsReserved },
    status: TicketStatus.RESERVED, // Find RESERVED tickets
  },
  {
    $set: {
      status: TicketStatus.ACTIVE, // ← Change to ACTIVE
      orderId: order._id,
      userId: order.userId || null,
    },
    $unset: {
      reservedUntil: 1, // Remove expiration
    },
  }
);
```

#### Step 2: If Tickets Don't Exist, Create Them

```typescript
// If no tickets were updated, check if tickets exist at all
if (updateResult.matchedCount === 0) {
  // Check which ticket numbers need to be created
  const missingNumbers = order.ticketsReserved.filter(
    (num) => !existingNumbers.has(num)
  );

  // If tickets don't exist, create them as ACTIVE
  if (missingNumbers.length > 0) {
    const ticketsToCreate = missingNumbers.map((ticketNumber) => ({
      competitionId: order.competitionId,
      ticketNumber,
      status: TicketStatus.ACTIVE, // ← Created as ACTIVE
      orderId: order._id,
      userId: order.userId || null,
    }));

    await Ticket.insertMany(ticketsToCreate);
  }
}
```

**What Happens:**

- PayPal payment is captured successfully
- System finds tickets with numbers from `order.ticketsReserved`
- Updates them from `RESERVED` → `ACTIVE`
- If tickets don't exist (edge case), creates them as `ACTIVE`
- Links tickets to order and user
- Removes `reservedUntil` expiration

### Why This Two-Step Process:

1. **Primary Path**: Tickets should already exist from checkout (RESERVED)
2. **Fallback Path**: If tickets were deleted/expired, create them as ACTIVE
3. **Data Integrity**: Ensures tickets always exist for paid orders

---

## 3. **DRAW EXECUTION** (Status: `ACTIVE` → `WINNER`)

### When Tickets Become Winners:

Tickets are **UPDATED TO WINNER** when a draw is executed and a ticket is selected.

### Where This Happens:

**File:** `src/controllers/draw.controller.ts`
**Lines:** 95-102

```typescript
// Mark ticket as winner
ticket.status = TicketStatus.WINNER; // ← Changed to WINNER
await ticket.save({ session });
```

**What Happens:**

- Admin runs a draw for a competition
- System randomly selects a ticket from all `ACTIVE` tickets
- Selected ticket status is changed to `WINNER`
- Winner record is created
- User is notified

### Why You See WINNER Status:

If you see tickets with `status: "WINNER"` in MongoDB, it means:

1. ✅ The ticket was purchased (was ACTIVE)
2. ✅ A draw was run for that competition
3. ✅ This specific ticket was selected as the winner
4. ✅ The ticket status was updated to WINNER

**This is CORRECT behavior!** Winners should have WINNER status.

---

## Complete Ticket Status Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    TICKET LIFECYCLE                          │
└─────────────────────────────────────────────────────────────┘

1. USER ADDS TO CART
   ↓
   Ticket Created: status = "RESERVED"
   reservedUntil = now + 15 minutes
   └─> Stored in MongoDB ✅

2. USER CHECKS OUT
   ↓
   Order Created with ticketsReserved: [14, 15, 16...]
   Tickets remain: status = "RESERVED"
   └─> Still in MongoDB ✅

3. USER PAYS (Payment Captured)
   ↓
   Ticket Updated: status = "RESERVED" → "ACTIVE"
   orderId = <order_id>
   userId = <user_id>
   reservedUntil = removed
   └─> Updated in MongoDB ✅

4. DRAW IS RUN (Admin executes draw)
   ↓
   Winning Ticket Updated: status = "ACTIVE" → "WINNER"
   Winner record created
   └─> Updated in MongoDB ✅

5. OTHER POSSIBLE STATUSES:
   - CANCELLED: Order cancelled before payment
   - REFUNDED: Payment refunded
   - INVALID: Ticket marked as invalid
```

---

## Summary: When Tickets Are Created

### ✅ YES - Tickets ARE Created During Checkout

1. **During Checkout (`createCheckoutFromCart`)**:
   - Tickets are created with status `RESERVED`
   - Happens BEFORE payment
   - Stored in MongoDB immediately

2. **During Payment Capture (`handlePaymentSuccess`)**:
   - RESERVED tickets are updated to ACTIVE
   - If tickets don't exist (edge case), they're created as ACTIVE
   - This is a safety mechanism

### Why Tickets Are Created Before Payment:

- **Inventory Control**: Prevents overselling
- **User Experience**: User knows their ticket numbers
- **Race Conditions**: Prevents conflicts between concurrent users
- **Data Integrity**: Ensures tickets exist for orders

---

## Why You See WINNER Status

### ✅ This is CORRECT!

Tickets with `status: "WINNER"` means:

1. The ticket was successfully purchased (was ACTIVE)
2. A draw was executed for that competition
3. This ticket was randomly selected as the winner
4. The status was correctly updated to WINNER

**This is the expected behavior!** Winners should have WINNER status.

### How to Verify:

1. Check if a draw was run for that competition
2. Check the `Winner` collection - should have a record
3. Check the `Draw` collection - should have a draw record
4. This confirms the ticket legitimately won

---

## Verification Checklist

To verify tickets are being created correctly:

1. **After Checkout (Before Payment)**:

   ```javascript
   db.tickets.find({
     competitionId: ObjectId('...'),
     status: 'reserved',
   });
   ```

   Should show tickets with `status: "reserved"`

2. **After Payment (After Capture)**:

   ```javascript
   db.tickets.find({
     orderId: ObjectId('...'),
     status: 'active',
   });
   ```

   Should show tickets with `status: "active"`

3. **After Draw**:
   ```javascript
   db.tickets.find({
     competitionId: ObjectId('...'),
     status: 'winner',
   });
   ```
   Should show winning ticket with `status: "winner"`

---

## Edge Cases Handled

1. **Tickets Expire Before Payment**:
   - System creates new tickets as ACTIVE during payment capture
   - Ensures paid orders always have tickets

2. **Tickets Don't Exist**:
   - Fallback creates tickets as ACTIVE
   - Links them to order and user

3. **Concurrent Checkouts**:
   - Atomic operations prevent conflicts
   - Retry logic handles race conditions

---

## Conclusion

✅ **Tickets ARE created during checkout** (as RESERVED)
✅ **Tickets are updated to ACTIVE** when payment is captured
✅ **Tickets become WINNER** when selected in a draw
✅ **WINNER status is CORRECT** - it means the ticket won

The system is working as designed! 🎉
