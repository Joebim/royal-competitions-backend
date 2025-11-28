# Competition Tickets List Endpoint - API Documentation

## Endpoint

**GET** `/api/v1/competitions/:id/tickets/list`

Returns a paginated list of tickets for a competition, showing their status (available, bought, reserved) and pagination information.

---

## Authentication

**Required**: Yes (User must be authenticated)

**Header**: `Authorization: Bearer <token>`

---

## Query Parameters

| Parameter     | Type   | Required | Default | Description                                                 |
| ------------- | ------ | -------- | ------- | ----------------------------------------------------------- |
| `range`       | number | No       | 1       | Range number (1 = tickets 1-100, 2 = tickets 101-200, etc.) |
| `startTicket` | number | No       | -       | Alternative: Start ticket number (overrides range)          |
| `endTicket`   | number | No       | -       | Alternative: End ticket number (overrides range)            |

### Examples

- **First 100 tickets**: `GET /api/v1/competitions/:id/tickets/list?range=1`
- **Next 100 tickets**: `GET /api/v1/competitions/:id/tickets/list?range=2`
- **Tickets 201-300**: `GET /api/v1/competitions/:id/tickets/list?range=3`
- **Custom range**: `GET /api/v1/competitions/:id/tickets/list?startTicket=50&endTicket=150`

---

## Response Structure

### Success Response (200 OK)

```typescript
{
  "success": true,
  "message": "Ticket list retrieved successfully",
  "data": {
    "competition": {
      "id": "6922428ef2104fdc938b27e2",
      "title": "Win the Ultimate Ham Radio & Tech Gear Bundle",
      "ticketLimit": 1000,        // null if unlimited
      "ticketsSold": 150
    },
    "tickets": [
      {
        "ticketNumber": 1,
        "status": "bought",      // "available" | "bought" | "reserved"
        "isValid": true          // Only present for bought tickets
      },
      {
        "ticketNumber": 2,
        "status": "available"
      },
      {
        "ticketNumber": 3,
        "status": "reserved",
        "isMine": true           // Only present for reserved tickets
      },
      // ... up to 100 tickets in this range
    ],
    "range": {
      "start": 1,                // Starting ticket number in this range
      "end": 100,                // Ending ticket number in this range
      "total": 100,              // Total tickets in this range
      "currentRange": 1,         // Current range number (1, 2, 3, etc.)
      "totalRanges": 10,         // Total number of ranges available (null if unlimited)
      "hasNextRange": true,      // Whether there's a next range available
      "hasPreviousRange": false, // Whether there's a previous range available
      "nextRangeStart": 101,     // Starting ticket number for next range (null if no next)
      "previousRangeStart": null // Starting ticket number for previous range (null if no previous)
    },
    "statistics": {
      "totalBought": 150,        // Total bought tickets across entire competition
      "totalReserved": 10,       // Total reserved tickets across entire competition
      "totalAvailable": 840      // Total available tickets (null if unlimited)
    }
  }
}
```

### Complete Example Response

```json
{
  "success": true,
  "message": "Ticket list retrieved successfully",
  "data": {
    "competition": {
      "id": "6922428ef2104fdc938b27e2",
      "title": "Win the Ultimate Ham Radio & Tech Gear Bundle",
      "ticketLimit": 1000,
      "ticketsSold": 150
    },
    "tickets": [
      {
        "ticketNumber": 1,
        "status": "bought",
        "isValid": true
      },
      {
        "ticketNumber": 2,
        "status": "available"
      },
      {
        "ticketNumber": 3,
        "status": "reserved",
        "isMine": false
      },
      {
        "ticketNumber": 4,
        "status": "available"
      },
      {
        "ticketNumber": 5,
        "status": "bought",
        "isValid": false
      }
      // ... continues up to ticket 100
    ],
    "range": {
      "start": 1,
      "end": 100,
      "total": 100,
      "currentRange": 1,
      "totalRanges": 10,
      "hasNextRange": true,
      "hasPreviousRange": false,
      "nextRangeStart": 101,
      "previousRangeStart": null
    },
    "statistics": {
      "totalBought": 150,
      "totalReserved": 10,
      "totalAvailable": 840
    }
  }
}
```

### Example: Range 2 (Tickets 101-200)

**Request**: `GET /api/v1/competitions/:id/tickets/list?range=2`

**Response**:

```json
{
  "success": true,
  "message": "Ticket list retrieved successfully",
  "data": {
    "competition": {
      "id": "6922428ef2104fdc938b27e2",
      "title": "Win the Ultimate Ham Radio & Tech Gear Bundle",
      "ticketLimit": 1000,
      "ticketsSold": 150
    },
    "tickets": [
      {
        "ticketNumber": 101,
        "status": "available"
      },
      {
        "ticketNumber": 102,
        "status": "bought",
        "isValid": true
      }
      // ... continues up to ticket 200
    ],
    "range": {
      "start": 101,
      "end": 200,
      "total": 100,
      "currentRange": 2,
      "totalRanges": 10,
      "hasNextRange": true,
      "hasPreviousRange": true,
      "nextRangeStart": 201,
      "previousRangeStart": 1
    },
    "statistics": {
      "totalBought": 150,
      "totalReserved": 10,
      "totalAvailable": 840
    }
  }
}
```

### Example: Last Range (Tickets 901-1000)

**Request**: `GET /api/v1/competitions/:id/tickets/list?range=10`

**Response**:

```json
{
  "success": true,
  "message": "Ticket list retrieved successfully",
  "data": {
    "competition": {
      "id": "6922428ef2104fdc938b27e2",
      "title": "Win the Ultimate Ham Radio & Tech Gear Bundle",
      "ticketLimit": 1000,
      "ticketsSold": 150
    },
    "tickets": [
      // ... tickets 901-1000
    ],
    "range": {
      "start": 901,
      "end": 1000,
      "total": 100,
      "currentRange": 10,
      "totalRanges": 10,
      "hasNextRange": false,
      "hasPreviousRange": true,
      "nextRangeStart": null,
      "previousRangeStart": 901
    },
    "statistics": {
      "totalBought": 150,
      "totalReserved": 10,
      "totalAvailable": 840
    }
  }
}
```

### Example: Unlimited Tickets Competition

For competitions with `ticketLimit: null` (unlimited tickets):

```json
{
  "success": true,
  "message": "Ticket list retrieved successfully",
  "data": {
    "competition": {
      "id": "6922428ef2104fdc938b27e2",
      "title": "Unlimited Competition",
      "ticketLimit": null,
      "ticketsSold": 150
    },
    "tickets": [
      // ... tickets in current range
    ],
    "range": {
      "start": 1,
      "end": 100,
      "total": 100,
      "currentRange": 1,
      "totalRanges": null, // null because unlimited
      "hasNextRange": true, // Always true for unlimited
      "hasPreviousRange": false,
      "nextRangeStart": 101,
      "previousRangeStart": null
    },
    "statistics": {
      "totalBought": 150,
      "totalReserved": 10,
      "totalAvailable": null // null because unlimited
    }
  }
}
```

---

## Ticket Status Values

### Status: `"available"`

- Ticket is not bought or reserved
- User can select this ticket

### Status: `"bought"`

- Ticket has been purchased
- Includes `isValid` field:
  - `true`: Valid ticket (can win in draws)
  - `false`: Invalid ticket (incorrect answer to skill-based question)

### Status: `"reserved"`

- Ticket is temporarily reserved (15-minute window)
- Includes `isMine` field:
  - `true`: Reserved by current user
  - `false`: Reserved by another user

---

## Error Responses

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Not authorized"
}
```

### 404 Not Found

```json
{
  "success": false,
  "message": "Competition not found"
}
```

### 400 Bad Request

```json
{
  "success": false,
  "message": "Start ticket number (1500) exceeds competition ticket limit (1000)"
}
```

---

## Frontend Implementation Guide

### Calculating Total Ranges

```typescript
// If competition has a ticket limit
const totalRanges = competition.ticketLimit
  ? Math.ceil(competition.ticketLimit / 100)
  : null; // Unlimited

// Example: 1000 tickets = 10 ranges (1-100, 101-200, ..., 901-1000)
```

### Navigation Between Ranges

```typescript
// Navigate to next range
if (rangeData.hasNextRange && rangeData.nextRangeStart) {
  const nextRange = Math.floor((rangeData.nextRangeStart - 1) / 100) + 1;
  fetchTickets(nextRange);
}

// Navigate to previous range
if (rangeData.hasPreviousRange && rangeData.previousRangeStart) {
  const prevRange = Math.floor((rangeData.previousRangeStart - 1) / 100) + 1;
  fetchTickets(prevRange);
}

// Navigate to specific range
const goToRange = (rangeNumber: number) => {
  if (
    rangeNumber >= 1 &&
    (totalRanges === null || rangeNumber <= totalRanges)
  ) {
    fetchTickets(rangeNumber);
  }
};
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

interface TicketListResponse {
  competition: {
    id: string;
    title: string;
    ticketLimit: number | null;
    ticketsSold: number;
  };
  tickets: Array<{
    ticketNumber: number;
    status: 'available' | 'bought' | 'reserved';
    isValid?: boolean;
    isMine?: boolean;
  }>;
  range: {
    start: number;
    end: number;
    total: number;
    currentRange: number;
    totalRanges: number | null;
    hasNextRange: boolean;
    hasPreviousRange: boolean;
    nextRangeStart: number | null;
    previousRangeStart: number | null;
  };
  statistics: {
    totalBought: number;
    totalReserved: number;
    totalAvailable: number | null;
  };
}

function useTicketList(competitionId: string, range: number = 1) {
  const [data, setData] = useState<TicketListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTickets() {
      try {
        setLoading(true);
        const response = await fetch(
          `${API_URL}/competitions/${competitionId}/tickets/list?range=${range}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const result = await response.json();
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.message);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchTickets();
  }, [competitionId, range]);

  return { data, loading, error };
}
```

### Pagination Component Example

```typescript
function TicketPagination({
  currentRange,
  totalRanges,
  onRangeChange
}: {
  currentRange: number;
  totalRanges: number | null;
  onRangeChange: (range: number) => void;
}) {
  const ranges = totalRanges
    ? Array.from({ length: totalRanges }, (_, i) => i + 1)
    : []; // For unlimited, show current and next ranges

  return (
    <div className="pagination">
      <button
        onClick={() => onRangeChange(currentRange - 1)}
        disabled={currentRange === 1}
      >
        Previous
      </button>

      {totalRanges ? (
        // Show page numbers for limited competitions
        ranges.map((range) => (
          <button
            key={range}
            onClick={() => onRangeChange(range)}
            className={range === currentRange ? 'active' : ''}
          >
            {range}
          </button>
        ))
      ) : (
        // Show current range for unlimited competitions
        <span>Range {currentRange}</span>
      )}

      <button
        onClick={() => onRangeChange(currentRange + 1)}
        disabled={totalRanges !== null && currentRange >= totalRanges}
      >
        Next
      </button>
    </div>
  );
}
```

---

## Notes

1. **Range Size**: Fixed at 100 tickets per range
2. **Unlimited Competitions**: When `ticketLimit` is `null`, `totalRanges` will be `null` and `hasNextRange` will always be `true`
3. **Statistics**: Always reflect the entire competition, not just the current range
4. **Reserved Tickets**: Only shows tickets reserved within the last 15 minutes
5. **Performance**: Each request fetches up to 100 tickets, making it efficient for large competitions

---

## UI Styling Guide - Compact Ticket Boxes

### Compact Ticket Number Picker

The ticket number picker boxes should be styled as **small, compact rectangles** with minimal height for a clean, space-efficient design:

```css
.ticket-picker-container {
  display: grid;
  grid-template-columns: repeat(10, 1fr); /* 10 columns */
  gap: 6px;
  padding: 12px;
}

.ticket-box {
  aspect-ratio: 2.5; /* Wide rectangle (width:height = 2.5:1) */
  height: 28px; /* Small, compact height */
  min-width: 70px;
  max-width: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #e0e0e0;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.15s ease;
  background-color: #ffffff;
  padding: 0 4px;
}

/* Available ticket */
.ticket-box.available {
  border-color: #4caf50;
  background-color: #f1f8f4;
  color: #2e7d32;
}

.ticket-box.available:hover {
  background-color: #4caf50;
  color: white;
  border-color: #4caf50;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(76, 175, 80, 0.2);
}

/* Bought ticket */
.ticket-box.bought {
  border-color: #9e9e9e;
  background-color: #f5f5f5;
  color: #757575;
  cursor: not-allowed;
  opacity: 0.7;
}

/* Invalid bought ticket */
.ticket-box.bought.invalid {
  border-color: #f44336;
  background-color: #ffebee;
  color: #c62828;
}

/* Reserved ticket */
.ticket-box.reserved {
  border-color: #ff9800;
  background-color: #fff3e0;
  color: #e65100;
  cursor: not-allowed;
  opacity: 0.8;
}

/* Reserved by current user */
.ticket-box.reserved.mine {
  border-color: #2196f3;
  background-color: #e3f2fd;
  color: #1565c0;
}

/* Selected ticket */
.ticket-box.selected {
  border-color: #2196f3;
  background-color: #2196f3;
  color: white;
  transform: scale(1.05);
  box-shadow: 0 2px 6px rgba(33, 150, 243, 0.4);
  font-weight: 600;
}
```

### React Component with Compact Styling

```typescript
import React from 'react';
import './TicketPicker.css';

interface TicketBoxProps {
  ticketNumber: number;
  status: 'available' | 'bought' | 'reserved';
  isValid?: boolean;
  isMine?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}

const TicketBox: React.FC<TicketBoxProps> = ({
  ticketNumber,
  status,
  isValid,
  isMine,
  isSelected,
  onClick,
}) => {
  const className = [
    'ticket-box',
    status,
    status === 'bought' && isValid === false ? 'invalid' : '',
    status === 'reserved' && isMine ? 'mine' : '',
    isSelected ? 'selected' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      onClick={status === 'available' ? onClick : undefined}
      title={
        status === 'bought'
          ? isValid === false
            ? 'Invalid ticket (incorrect answer)'
            : 'Ticket already purchased'
          : status === 'reserved'
          ? isMine
            ? 'Reserved by you'
            : 'Reserved by another user'
          : 'Available ticket'
      }
    >
      {ticketNumber}
    </div>
  );
};

interface TicketPickerProps {
  tickets: Array<{
    ticketNumber: number;
    status: 'available' | 'bought' | 'reserved';
    isValid?: boolean;
    isMine?: boolean;
  }>;
  selectedTickets: number[];
  onTicketSelect: (ticketNumber: number) => void;
}

export const TicketPicker: React.FC<TicketPickerProps> = ({
  tickets,
  selectedTickets,
  onTicketSelect,
}) => {
  return (
    <div className="ticket-picker-container">
      {tickets.map((ticket) => (
        <TicketBox
          key={ticket.ticketNumber}
          ticketNumber={ticket.ticketNumber}
          status={ticket.status}
          isValid={ticket.isValid}
          isMine={ticket.isMine}
          isSelected={selectedTickets.includes(ticket.ticketNumber)}
          onClick={() => onTicketSelect(ticket.ticketNumber)}
        />
      ))}
    </div>
  );
};
```

### Responsive Design for Mobile

```css
@media (max-width: 768px) {
  .ticket-picker-container {
    grid-template-columns: repeat(5, 1fr); /* 5 columns on tablet */
    gap: 5px;
    padding: 10px;
  }

  .ticket-box {
    height: 26px; /* Slightly smaller on mobile */
    min-width: 60px;
    max-width: 80px;
    font-size: 11px;
  }
}

@media (max-width: 480px) {
  .ticket-picker-container {
    grid-template-columns: repeat(4, 1fr); /* 4 columns on mobile */
    gap: 4px;
    padding: 8px;
  }

  .ticket-box {
    height: 24px; /* Even more compact on small screens */
    min-width: 55px;
    max-width: 70px;
    font-size: 10px;
    border-width: 1px;
  }
}
```

### Extra Compact Style (Optional)

For maximum space efficiency:

```css
.ticket-box-extra-compact {
  aspect-ratio: 3; /* Even wider rectangles */
  height: 24px; /* Very small height */
  min-width: 72px;
  max-width: 85px;
  font-size: 11px;
  padding: 0 3px;
  border-width: 1px;
  border-radius: 2px;
}
```

### Key Design Principles

1. **Height**: Keep height between 24-28px for compact design
2. **Aspect Ratio**: Use 2.5:1 or 3:1 for wide rectangles
3. **Font Size**: 10-12px for readability without taking too much space
4. **Spacing**: Minimal gaps (4-6px) between boxes
5. **Visual Hierarchy**: Clear color coding for different states
6. **Touch Targets**: Maintain minimum 24px height for mobile accessibility

---

**Last Updated**: 2025-01-24
**Version**: 1.0.0
