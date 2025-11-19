# Competition Ending Implementation Documentation

## Overview

This document describes the implementation of automatic competition ending functionality. When a competition reaches its `endDate`, it automatically changes status to `'ended'` and becomes unavailable for ticket purchases.

## Table of Contents

1. [Status Changes](#status-changes)
2. [Automatic Ending Job](#automatic-ending-job)
3. [Purchase Prevention](#purchase-prevention)
4. [API Behavior](#api-behavior)
5. [Status Flow](#status-flow)
6. [Testing](#testing)

---

## Status Changes

### New Status: `ENDED`

A new competition status has been added to the `CompetitionStatus` enum:

```typescript
export enum CompetitionStatus {
  DRAFT = 'draft',
  LIVE = 'live',
  CLOSED = 'closed',
  ENDED = 'ended', // NEW
  DRAWN = 'drawn',
  CANCELLED = 'cancelled',
}
```

### Status Meaning

- **`ended`**: The competition has passed its `endDate` and is no longer accepting entries. The competition is automatically set to inactive (`isActive: false`).

### Status Validation

The `ended` status is now accepted in:

- Competition creation schema (`createCompetitionSchema`)
- Competition update schema (`updateCompetitionSchema`)

---

## Automatic Ending Job

### Implementation

A scheduled job runs every 5 minutes to automatically end competitions that have passed their `endDate`.

**Location**: `src/jobs/index.ts`

**Function**: `endCompetitionsPastEndDate()`

### How It Works

1. **Schedule**: Runs every 5 minutes (`*/5 * * * *`)
2. **Query**: Finds competitions where:
   - Status is `LIVE` or `CLOSED`
   - `endDate` exists and is less than or equal to current time
3. **Action**: For each matching competition:
   - Sets `status` to `ENDED`
   - Sets `isActive` to `false`
   - Saves the competition
   - Logs the action

### Code Example

```typescript
const endCompetitionsPastEndDate = async () => {
  try {
    const now = new Date();
    const competitions = await Competition.find({
      status: { $in: [CompetitionStatus.LIVE, CompetitionStatus.CLOSED] },
      endDate: { $exists: true, $lte: now },
    });

    for (const competition of competitions) {
      if (competition.endDate && competition.endDate <= now) {
        competition.status = CompetitionStatus.ENDED;
        competition.isActive = false;
        await competition.save();
        logger.info(`Ended competition ${competition._id} - endDate passed`);
      }
    }
  } catch (error: any) {
    logger.error('Error ending competitions past endDate:', error);
  }
};
```

### Job Registration

The job is automatically started when the server starts:

```typescript
// End competitions past endDate every 5 minutes
cron.schedule('*/5 * * * *', () => {
  logger.info('Running competition end date check job');
  endCompetitionsPastEndDate();
});
```

---

## Purchase Prevention

### Order Creation Validation

**Location**: `src/controllers/order.controller.ts`

When creating an order, the following validations are performed:

1. **Status Check**: Competition must not be `ended`, `drawn`, or `cancelled`
2. **End Date Check**: Competition's `endDate` must not have passed
3. **Active Check**: Competition must be `isActive: true`
4. **Live Status Check**: Competition must have status `live`

### Error Messages

- `"This competition is no longer accepting entries"` - When status is `ended`, `drawn`, or `cancelled`
- `"This competition has ended and is no longer accepting entries"` - When `endDate` has passed
- `"This competition is not currently accepting entries"` - When not active or not live

### Code Example

```typescript
// Check if competition is available for purchase
if (
  competition.status === 'ended' ||
  competition.status === 'drawn' ||
  competition.status === 'cancelled'
) {
  throw new ApiError('This competition is no longer accepting entries', 400);
}

// Check if competition has ended (endDate passed)
if (competition.endDate && competition.endDate <= new Date()) {
  throw new ApiError(
    'This competition has ended and is no longer accepting entries',
    400
  );
}

// Check if competition is active and live
if (!competition.isActive || competition.status !== 'live') {
  throw new ApiError(
    'This competition is not currently accepting entries',
    400
  );
}
```

### Ticket Reservation Validation

**Location**: `src/controllers/ticket.controller.ts`

When reserving/holding tickets, the same validations are performed:

1. **Status Check**: Competition must not be `ended`, `drawn`, or `cancelled`
2. **End Date Check**: Competition's `endDate` must not have passed
3. **Active Check**: Competition must be `isActive: true`
4. **Live Status Check**: Competition must have status `live`

---

## API Behavior

### Endpoints Affected

#### 1. `POST /api/v1/orders`

- **Before**: Could create orders for competitions past their `endDate`
- **After**: Returns `400 Bad Request` if competition has ended

#### 2. `POST /api/v1/competitions/:id/hold`

- **Before**: Could reserve tickets for competitions past their `endDate`
- **After**: Returns `400 Bad Request` if competition has ended

#### 3. `GET /api/v1/competitions`

- **Behavior**: Ended competitions are filtered out by default (when `includeInactive=false`)
- **Admin**: Can view ended competitions when using admin endpoints with `includeInactive=true`

### Response Examples

#### Successful Order Creation (Before End Date)

```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": { ... },
    "clientSecret": "pi_..."
  }
}
```

#### Failed Order Creation (After End Date)

```json
{
  "success": false,
  "message": "This competition has ended and is no longer accepting entries",
  "error": {
    "statusCode": 400
  }
}
```

---

## Status Flow

### Competition Lifecycle

```
DRAFT → LIVE → [endDate passes] → ENDED → DRAWN
                ↓
            CLOSED (if ticket limit reached)
                ↓
            ENDED (if endDate passes while CLOSED)
```

### Status Transitions

1. **DRAFT → LIVE**: Manual or automatic (when published)
2. **LIVE → CLOSED**: Automatic (when ticket limit reached)
3. **LIVE → ENDED**: Automatic (when `endDate` passes)
4. **CLOSED → ENDED**: Automatic (when `endDate` passes)
5. **ENDED → DRAWN**: Automatic (when draw is executed)

### Important Notes

- A competition can transition from `CLOSED` to `ENDED` if it reaches its ticket limit before the `endDate`, but then the `endDate` passes
- Once a competition is `ENDED`, it cannot transition back to `LIVE` or `CLOSED`
- Ended competitions can still be drawn (status changes to `DRAWN`)

---

## Automatic Draw Integration

### Updated Behavior

The automatic draw job has been updated to include `ENDED` competitions:

```typescript
const competitions = await Competition.find({
  status: {
    $in: [
      CompetitionStatus.LIVE,
      CompetitionStatus.CLOSED,
      CompetitionStatus.ENDED,
    ],
  },
  drawMode: DrawMode.AUTOMATIC,
  drawAt: { $lte: now, $gte: oneMinuteAgo },
  drawnAt: { $exists: false },
});
```

This ensures that ended competitions can still be drawn according to their `drawAt` schedule.

---

## Database Schema

### Competition Model

The competition model includes:

- `endDate` (Date, optional): When the competition ends
- `status` (String, enum): Includes `'ended'` as a valid value
- `isActive` (Boolean): Automatically set to `false` when competition ends

### Indexes

No new indexes were added, but existing indexes support the queries:

- `{ status: 1, drawAt: 1 }` - Used by draw scheduler
- `{ category: 1, status: 1 }` - Used for filtering

---

## Testing

### Manual Testing

1. **Create a competition with `endDate` in the past**:

   ```json
   {
     "title": "Test Competition",
     "description": "Test",
     "prize": "Test Prize",
     "ticketPricePence": 100,
     "drawAt": "2024-12-31T23:59:59Z",
     "endDate": "2024-01-01T00:00:00Z",
     "category": "Test",
     "status": "live"
   }
   ```

2. **Wait for scheduled job** (or trigger manually):
   - Competition should automatically change to `ENDED`
   - `isActive` should be `false`

3. **Attempt to create order**:

   ```bash
   POST /api/v1/orders
   {
     "competitionId": "...",
     "qty": 1,
     "ticketsReserved": [1]
   }
   ```

   - Should return `400 Bad Request`

4. **Attempt to reserve tickets**:
   ```bash
   POST /api/v1/competitions/:id/hold
   {
     "qty": 1
   }
   ```

   - Should return `400 Bad Request`

### Automated Testing Recommendations

1. **Unit Tests**:
   - Test `endCompetitionsPastEndDate()` function
   - Test order creation validation
   - Test ticket reservation validation

2. **Integration Tests**:
   - Test automatic status change when `endDate` passes
   - Test purchase prevention for ended competitions
   - Test that ended competitions can still be drawn

3. **E2E Tests**:
   - Test complete flow: create → wait for end → attempt purchase → verify rejection

---

## Configuration

### Job Schedule

The job runs every 5 minutes. To change the schedule, modify the cron expression in `src/jobs/index.ts`:

```typescript
cron.schedule('*/5 * * * *', () => {
  // Every 5 minutes
  endCompetitionsPastEndDate();
});
```

Common schedules:

- `'*/1 * * * *'` - Every minute
- `'*/5 * * * *'` - Every 5 minutes (current)
- `'0 * * * *'` - Every hour
- `'0 0 * * *'` - Daily at midnight

---

## Logging

### Log Messages

The implementation logs the following:

1. **Job Execution**:

   ```
   Running competition end date check job
   ```

2. **Competition Ended**:

   ```
   Ended competition <competitionId> - endDate passed
   ```

3. **Errors**:
   ```
   Error ending competitions past endDate: <error>
   ```

### Log Levels

- **Info**: Job execution and successful competition ending
- **Error**: Job failures and exceptions

---

## Troubleshooting

### Common Issues

1. **Competition not ending automatically**:
   - Check that `endDate` is set on the competition
   - Verify the scheduled job is running (check logs)
   - Ensure `endDate` is in the past

2. **Still able to purchase tickets**:
   - Verify the competition status is `ended`
   - Check that `isActive` is `false`
   - Ensure validation checks are in place

3. **Job not running**:
   - Check server logs for job startup messages
   - Verify `startScheduledJobs()` is called in `server.ts`
   - Check for cron job errors in logs

### Debugging

Enable debug logging to see detailed job execution:

```typescript
logger.debug('Checking competitions for endDate:', {
  now: new Date(),
  query: { status: [...], endDate: { $lte: now } }
});
```

---

## Migration Notes

### Existing Competitions

- Existing competitions with `endDate` in the past will be automatically ended on the next job run
- No manual migration is required

### API Compatibility

- The `ended` status is backward compatible
- Existing API clients will receive appropriate error messages
- No breaking changes to existing endpoints

---

## Future Enhancements

Potential improvements:

1. **Immediate Ending**: Add endpoint to manually end a competition immediately
2. **Notifications**: Send notifications when competitions end
3. **Grace Period**: Add configurable grace period after `endDate` before ending
4. **Analytics**: Track how many competitions ended automatically
5. **Webhooks**: Trigger webhooks when competitions end

---

## Related Files

- `src/models/Competition.model.ts` - Competition model and status enum
- `src/jobs/index.ts` - Scheduled jobs including ending job
- `src/controllers/order.controller.ts` - Order creation with validation
- `src/controllers/ticket.controller.ts` - Ticket reservation with validation
- `src/validators/competition.validator.ts` - Status validation schemas

---

## Changelog

### Version 1.0.0 (Current)

- Added `ENDED` status to `CompetitionStatus` enum
- Implemented automatic ending job (`endCompetitionsPastEndDate`)
- Added purchase prevention in order creation
- Added reservation prevention in ticket holding
- Updated automatic draw job to include `ENDED` competitions
- Updated validators to accept `ended` status

---

## Support

For questions or issues related to this implementation, please refer to:

- Competition model documentation
- API documentation
- Server logs for debugging

---

**Last Updated**: 2024
**Version**: 1.0.0
