# Activity Tracker API Documentation

## Overview

The Activity Tracker API provides comprehensive tracking and retrieval of all system activities. Activities are automatically logged when events occur in the system (ticket purchases, draws, winner selections, orders, etc.). This API allows administrators to view, filter, and analyze all activities for dashboard displays and audit purposes.

**Base URL:** `/api/v1`

---

## Table of Contents

1. [Activity Model](#activity-model)
2. [Event Types](#event-types)
3. [Admin Endpoints](#admin-endpoints)
4. [Request/Response Examples](#requestresponse-examples)
5. [Filtering and Querying](#filtering-and-querying)
6. [Activity Descriptions](#activity-descriptions)
7. [Code Examples](#code-examples)

---

## Activity Model

### Event Schema

| Field           | Type     | Required | Description                                                     |
| --------------- | -------- | -------- | --------------------------------------------------------------- |
| `_id`           | ObjectId | Auto     | Event unique identifier                                         |
| `type`          | Enum     | ✅ Yes   | Event type (see Event Types below)                              |
| `entity`        | String   | ✅ Yes   | Entity type: `ticket`, `order`, `draw`, `winner`, `competition` |
| `entityId`      | ObjectId | ✅ Yes   | Reference to the entity                                         |
| `userId`        | ObjectId | No       | Reference to User (if applicable)                               |
| `competitionId` | ObjectId | No       | Reference to Competition (if applicable)                        |
| `payload`       | Mixed    | No       | Event-specific data (flexible JSON object)                      |
| `createdAt`     | Date     | Auto     | Timestamp when event occurred                                   |

### Activity Response Format

Each activity in the response includes:

```typescript
{
  id: string;                    // Event ID
  type: string;                  // Event type
  entity: string;                 // Entity type
  entityId: string;               // Entity ID
  timestamp: Date;                // When the event occurred
  description: string;            // Human-readable description
  user?: {                        // User information (if applicable)
    id: string;
    name: string;
    email: string;
  };
  competition?: {                 // Competition information (if applicable)
    id: string;
    title: string;
    prize: string;
  };
  payload: any;                   // Event-specific data
}
```

---

## Event Types

The system tracks the following event types:

| Event Type           | Description                              | Entity        |
| -------------------- | ---------------------------------------- | ------------- |
| `ticket_reserved`    | User reserved tickets for a competition  | `ticket`      |
| `ticket_issued`      | Tickets were issued after payment        | `ticket`      |
| `ticket_cancelled`   | Ticket was cancelled                     | `ticket`      |
| `order_created`      | New order was created                    | `order`       |
| `order_paid`         | Order payment was successful             | `order`       |
| `order_failed`       | Order payment failed                     | `order`       |
| `order_refunded`     | Order was refunded                       | `order`       |
| `draw_created`       | Draw was completed (automatic or manual) | `draw`        |
| `winner_selected`    | Winner was selected from a draw          | `winner`      |
| `winner_notified`    | Winner was notified                      | `winner`      |
| `winner_claimed`     | Winner claimed their prize               | `winner`      |
| `competition_closed` | Competition was closed                   | `competition` |
| `competition_drawn`  | Competition draw was completed           | `competition` |

---

## Admin Endpoints

All activity endpoints require admin authentication.

**Headers:**

```
Authorization: Bearer <admin_token>
```

---

### 1. Get All Activities

**Endpoint:** `GET /api/v1/admin/activities`

**Access:** Private/Admin

**Description:** Get all activities with filtering and pagination options.

**Query Parameters:**

- `page` (optional, default: `1`) - Page number for pagination
- `limit` (optional, default: `50`) - Number of items per page
- `type` (optional) - Filter by event type (can be multiple: `?type=ticket_issued&type=order_paid`)
- `entity` (optional) - Filter by entity type: `ticket`, `order`, `draw`, `winner`, `competition`
- `entityId` (optional) - Filter by specific entity ID
- `userId` (optional) - Filter by user ID
- `competitionId` (optional) - Filter by competition ID
- `from` (optional) - Filter by start date (ISO 8601 format)
- `to` (optional) - Filter by end date (ISO 8601 format)

**Example Request:**

```bash
GET /api/v1/admin/activities?page=1&limit=50
GET /api/v1/admin/activities?type=order_paid&page=1&limit=20
GET /api/v1/admin/activities?competitionId=507f1f77bcf86cd799439011
GET /api/v1/admin/activities?from=2025-11-01T00:00:00.000Z&to=2025-11-15T23:59:59.999Z
GET /api/v1/admin/activities?type=ticket_issued&type=order_paid&page=1
```

**Response:**

```json
{
  "success": true,
  "message": "Activities retrieved successfully",
  "data": {
    "activities": [
      {
        "id": "event_id_1",
        "type": "order_paid",
        "entity": "order",
        "entityId": "order_id",
        "timestamp": "2025-11-15T14:30:00.000Z",
        "description": "Order paid for £500 ASOS Voucher by John Doe - £5.00",
        "user": {
          "id": "user_id",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "competition": {
          "id": "competition_id",
          "title": "£500 ASOS Voucher",
          "prize": "£500 ASOS Voucher"
        },
        "payload": {
          "amountPence": 500,
          "quantity": 5,
          "orderId": "order_id"
        }
      },
      {
        "id": "event_id_2",
        "type": "draw_created",
        "entity": "draw",
        "entityId": "draw_id",
        "timestamp": "2025-11-15T15:00:00.000Z",
        "description": "Draw completed for £500 ASOS Voucher (admin_triggered method)",
        "competition": {
          "id": "competition_id",
          "title": "£500 ASOS Voucher",
          "prize": "£500 ASOS Voucher"
        },
        "payload": {
          "drawMethod": "admin_triggered",
          "numWinners": 1,
          "reserveWinners": 3,
          "seed": "a1b2c3d4e5f6...",
          "algorithm": "hmac-sha256-v1"
        }
      },
      {
        "id": "event_id_3",
        "type": "winner_selected",
        "entity": "winner",
        "entityId": "winner_id",
        "timestamp": "2025-11-15T15:00:00.000Z",
        "description": "Winner selected for £500 ASOS Voucher - Ticket #1234",
        "user": {
          "id": "user_id",
          "name": "Jane Smith",
          "email": "jane@example.com"
        },
        "competition": {
          "id": "competition_id",
          "title": "£500 ASOS Voucher",
          "prize": "£500 ASOS Voucher"
        },
        "payload": {
          "ticketNumber": 1234,
          "isPrimary": true,
          "drawId": "draw_id"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "totalItems": 1250,
      "totalPages": 25
    }
  }
}
```

---

### 2. Get Recent Activities

**Endpoint:** `GET /api/v1/admin/activities/recent`

**Access:** Private/Admin

**Description:** Get recent activities for dashboard display. Returns the most recent activities sorted by timestamp.

**Query Parameters:**

- `limit` (optional, default: `20`) - Number of recent activities to return
- `types` (optional) - Filter by event types (can be multiple: `?types=order_paid&types=draw_created`)

**Example Request:**

```bash
GET /api/v1/admin/activities/recent?limit=20
GET /api/v1/admin/activities/recent?limit=10&types=order_paid&types=draw_created
```

**Response:**

```json
{
  "success": true,
  "message": "Recent activities retrieved successfully",
  "data": {
    "activities": [
      {
        "id": "event_id_1",
        "type": "order_paid",
        "entity": "order",
        "entityId": "order_id",
        "timestamp": "2025-11-15T16:00:00.000Z",
        "description": "Order paid for £500 ASOS Voucher by John Doe - £5.00",
        "user": {
          "id": "user_id",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "competition": {
          "id": "competition_id",
          "title": "£500 ASOS Voucher",
          "prize": "£500 ASOS Voucher"
        },
        "payload": {
          "amountPence": 500,
          "quantity": 5
        }
      }
      // ... more activities
    ],
    "total": 20
  }
}
```

---

### 3. Get Activities by Type

**Endpoint:** `GET /api/v1/admin/activities/type/:type`

**Access:** Private/Admin

**Description:** Get all activities of a specific event type.

**Path Parameters:**

- `type` (required) - Event type (e.g., `order_paid`, `draw_created`, `winner_selected`)

**Query Parameters:**

- `page` (optional, default: `1`)
- `limit` (optional, default: `50`)

**Example Request:**

```bash
GET /api/v1/admin/activities/type/order_paid?page=1&limit=50
GET /api/v1/admin/activities/type/draw_created
GET /api/v1/admin/activities/type/winner_selected?page=1&limit=20
```

**Response:**

```json
{
  "success": true,
  "message": "Activities retrieved successfully",
  "data": {
    "activities": [
      {
        "id": "event_id",
        "type": "order_paid",
        "entity": "order",
        "entityId": "order_id",
        "timestamp": "2025-11-15T14:30:00.000Z",
        "description": "Order paid for £500 ASOS Voucher by John Doe - £5.00",
        "user": {
          "id": "user_id",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "competition": {
          "id": "competition_id",
          "title": "£500 ASOS Voucher",
          "prize": "£500 ASOS Voucher"
        },
        "payload": {
          "amountPence": 500,
          "quantity": 5
        }
      }
    ],
    "type": "order_paid",
    "pagination": {
      "page": 1,
      "limit": 50,
      "totalItems": 150,
      "totalPages": 3
    }
  }
}
```

---

### 4. Get Activities by Entity

**Endpoint:** `GET /api/v1/admin/activities/entity/:entity/:entityId`

**Access:** Private/Admin

**Description:** Get all activities for a specific entity (e.g., all activities for a specific order, draw, or ticket).

**Path Parameters:**

- `entity` (required) - Entity type: `ticket`, `order`, `draw`, `winner`, `competition`
- `entityId` (required) - Entity ID

**Query Parameters:**

- `page` (optional, default: `1`)
- `limit` (optional, default: `50`)

**Example Request:**

```bash
GET /api/v1/admin/activities/entity/order/507f1f77bcf86cd799439011
GET /api/v1/admin/activities/entity/draw/507f1f77bcf86cd799439011?page=1&limit=20
```

**Response:**

```json
{
  "success": true,
  "message": "Activities retrieved successfully",
  "data": {
    "activities": [
      {
        "id": "event_id_1",
        "type": "order_created",
        "entity": "order",
        "entityId": "order_id",
        "timestamp": "2025-11-15T14:25:00.000Z",
        "description": "Order created for £500 ASOS Voucher by John Doe",
        "user": {
          "id": "user_id",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "competition": {
          "id": "competition_id",
          "title": "£500 ASOS Voucher",
          "prize": "£500 ASOS Voucher"
        },
        "payload": {
          "orderId": "order_id",
          "amountPence": 500
        }
      },
      {
        "id": "event_id_2",
        "type": "order_paid",
        "entity": "order",
        "entityId": "order_id",
        "timestamp": "2025-11-15T14:30:00.000Z",
        "description": "Order paid for £500 ASOS Voucher by John Doe - £5.00",
        "user": {
          "id": "user_id",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "competition": {
          "id": "competition_id",
          "title": "£500 ASOS Voucher",
          "prize": "£500 ASOS Voucher"
        },
        "payload": {
          "amountPence": 500,
          "quantity": 5
        }
      }
    ],
    "entity": "order",
    "entityId": "order_id",
    "pagination": {
      "page": 1,
      "limit": 50,
      "totalItems": 2,
      "totalPages": 1
    }
  }
}
```

---

### 5. Get Activities by User

**Endpoint:** `GET /api/v1/admin/activities/user/:userId`

**Access:** Private/Admin

**Description:** Get all activities for a specific user.

**Path Parameters:**

- `userId` (required) - User ID

**Query Parameters:**

- `page` (optional, default: `1`)
- `limit` (optional, default: `50`)

**Example Request:**

```bash
GET /api/v1/admin/activities/user/507f1f77bcf86cd799439011?page=1&limit=50
```

**Response:**

```json
{
  "success": true,
  "message": "User activities retrieved successfully",
  "data": {
    "activities": [
      {
        "id": "event_id_1",
        "type": "ticket_reserved",
        "entity": "ticket",
        "entityId": "competition_id",
        "timestamp": "2025-11-15T14:00:00.000Z",
        "description": "John Doe reserved 5 ticket(s) for £500 ASOS Voucher",
        "user": {
          "id": "user_id",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "competition": {
          "id": "competition_id",
          "title": "£500 ASOS Voucher",
          "prize": "£500 ASOS Voucher"
        },
        "payload": {
          "qty": 5,
          "ticketNumbers": [1, 2, 3, 4, 5],
          "reservedUntil": "2025-11-15T14:15:00.000Z"
        }
      },
      {
        "id": "event_id_2",
        "type": "order_paid",
        "entity": "order",
        "entityId": "order_id",
        "timestamp": "2025-11-15T14:30:00.000Z",
        "description": "Order paid for £500 ASOS Voucher by John Doe - £5.00",
        "user": {
          "id": "user_id",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "competition": {
          "id": "competition_id",
          "title": "£500 ASOS Voucher",
          "prize": "£500 ASOS Voucher"
        },
        "payload": {
          "amountPence": 500,
          "quantity": 5
        }
      }
    ],
    "userId": "user_id",
    "pagination": {
      "page": 1,
      "limit": 50,
      "totalItems": 25,
      "totalPages": 1
    }
  }
}
```

---

### 6. Get Activities by Competition

**Endpoint:** `GET /api/v1/admin/activities/competition/:competitionId`

**Access:** Private/Admin

**Description:** Get all activities for a specific competition.

**Path Parameters:**

- `competitionId` (required) - Competition ID

**Query Parameters:**

- `page` (optional, default: `1`)
- `limit` (optional, default: `50`)

**Example Request:**

```bash
GET /api/v1/admin/activities/competition/507f1f77bcf86cd799439011?page=1&limit=50
```

**Response:**

```json
{
  "success": true,
  "message": "Competition activities retrieved successfully",
  "data": {
    "activities": [
      {
        "id": "event_id_1",
        "type": "ticket_reserved",
        "entity": "ticket",
        "entityId": "competition_id",
        "timestamp": "2025-11-15T10:00:00.000Z",
        "description": "John Doe reserved 5 ticket(s) for £500 ASOS Voucher",
        "user": {
          "id": "user_id",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "competition": {
          "id": "competition_id",
          "title": "£500 ASOS Voucher",
          "prize": "£500 ASOS Voucher"
        },
        "payload": {
          "qty": 5,
          "ticketNumbers": [1, 2, 3, 4, 5]
        }
      },
      {
        "id": "event_id_2",
        "type": "draw_created",
        "entity": "draw",
        "entityId": "draw_id",
        "timestamp": "2025-11-15T15:00:00.000Z",
        "description": "Draw completed for £500 ASOS Voucher (admin_triggered method)",
        "competition": {
          "id": "competition_id",
          "title": "£500 ASOS Voucher",
          "prize": "£500 ASOS Voucher"
        },
        "payload": {
          "drawMethod": "admin_triggered",
          "numWinners": 1,
          "seed": "a1b2c3d4e5f6..."
        }
      }
    ],
    "competitionId": "competition_id",
    "pagination": {
      "page": 1,
      "limit": 50,
      "totalItems": 150,
      "totalPages": 3
    }
  }
}
```

---

### 7. Get Activity Statistics

**Endpoint:** `GET /api/v1/admin/activities/stats`

**Access:** Private/Admin

**Description:** Get activity statistics including total counts, counts by type, and recent activity metrics.

**Example Request:**

```bash
GET /api/v1/admin/activities/stats
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "success": true,
  "message": "Activity statistics retrieved successfully",
  "data": {
    "stats": {
      "total": 1250,
      "last24Hours": 45,
      "byType": {
        "ticket_reserved": 500,
        "ticket_issued": 450,
        "order_created": 200,
        "order_paid": 180,
        "order_failed": 20,
        "draw_created": 15,
        "winner_selected": 15,
        "winner_notified": 12,
        "winner_claimed": 8,
        "ticket_cancelled": 5,
        "order_refunded": 3,
        "competition_closed": 2,
        "competition_drawn": 2
      }
    }
  }
}
```

---

## Filtering and Querying

### Multiple Type Filtering

You can filter by multiple event types using multiple query parameters:

```bash
GET /api/v1/admin/activities?type=order_paid&type=draw_created&type=winner_selected
```

### Date Range Filtering

Filter activities by date range:

```bash
GET /api/v1/admin/activities?from=2025-11-01T00:00:00.000Z&to=2025-11-15T23:59:59.999Z
```

### Combined Filters

Combine multiple filters:

```bash
GET /api/v1/admin/activities?competitionId=507f1f77bcf86cd799439011&type=order_paid&from=2025-11-01T00:00:00.000Z&page=1&limit=20
```

---

## Activity Descriptions

Activities include human-readable descriptions automatically generated based on the event type and data. Examples:

| Event Type        | Description Example                                             |
| ----------------- | --------------------------------------------------------------- |
| `ticket_reserved` | "John Doe reserved 5 ticket(s) for £500 ASOS Voucher"           |
| `ticket_issued`   | "John Doe purchased 5 ticket(s) for £500 ASOS Voucher"          |
| `order_paid`      | "Order paid for £500 ASOS Voucher by John Doe - £5.00"          |
| `draw_created`    | "Draw completed for £500 ASOS Voucher (admin_triggered method)" |
| `winner_selected` | "Winner selected for £500 ASOS Voucher - Ticket #1234"          |
| `winner_notified` | "Winner notified for £500 ASOS Voucher"                         |
| `winner_claimed`  | "Prize claimed for £500 ASOS Voucher"                           |

---

## Code Examples

### JavaScript/TypeScript Examples

#### Get Recent Activities for Dashboard

```typescript
const getRecentActivities = async (limit = 20) => {
  const response = await fetch(
    `/api/v1/admin/activities/recent?limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    }
  );
  const data = await response.json();
  return data;
};
```

#### Get Activities with Filters

```typescript
const getActivities = async (filters: {
  type?: string[];
  competitionId?: string;
  userId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}) => {
  const params = new URLSearchParams();

  if (filters.type) {
    filters.type.forEach((t) => params.append('type', t));
  }
  if (filters.competitionId)
    params.append('competitionId', filters.competitionId);
  if (filters.userId) params.append('userId', filters.userId);
  if (filters.from) params.append('from', filters.from.toISOString());
  if (filters.to) params.append('to', filters.to.toISOString());
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());

  const response = await fetch(
    `/api/v1/admin/activities?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    }
  );
  return await response.json();
};
```

#### Get Activity Statistics

```typescript
const getActivityStats = async () => {
  const response = await fetch('/api/v1/admin/activities/stats', {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
  return await response.json();
};
```

#### Get User Activity Timeline

```typescript
const getUserActivityTimeline = async (userId: string) => {
  const response = await fetch(
    `/api/v1/admin/activities/user/${userId}?limit=100`,
    {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    }
  );
  return await response.json();
};
```

#### Get Competition Activity Log

```typescript
const getCompetitionActivityLog = async (competitionId: string) => {
  const response = await fetch(
    `/api/v1/admin/activities/competition/${competitionId}?limit=100`,
    {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    }
  );
  return await response.json();
};
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  user?: {
    name: string;
    email: string;
  };
  competition?: {
    title: string;
    prize: string;
  };
}

const useRecentActivities = (limit = 20) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/v1/admin/activities/recent?limit=${limit}`,
          {
            headers: {
              'Authorization': `Bearer ${adminToken}`,
            },
          }
        );
        const data = await response.json();

        if (data.success) {
          setActivities(data.data.activities);
        } else {
          setError(data.message || 'Failed to load activities');
        }
      } catch (err) {
        setError('Network error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();

    // Refresh every 30 seconds
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, [limit]);

  return { activities, loading, error };
};

// Usage in component
const DashboardActivities = () => {
  const { activities, loading, error } = useRecentActivities(20);

  if (loading) return <div>Loading activities...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Recent Activities</h2>
      <ul>
        {activities.map((activity) => (
          <li key={activity.id}>
            <div>
              <strong>{activity.description}</strong>
              <span>{new Date(activity.timestamp).toLocaleString()}</span>
            </div>
            {activity.user && (
              <div>User: {activity.user.name}</div>
            )}
            {activity.competition && (
              <div>Competition: {activity.competition.title}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
```

---

## Dashboard Integration

### Recommended Dashboard Display

For the admin dashboard, use the `/activities/recent` endpoint to show:

1. **Recent Activity Feed**
   - Last 20 activities
   - Auto-refresh every 30 seconds
   - Group by time (Today, Yesterday, This Week)

2. **Activity Statistics**
   - Total activities
   - Activities in last 24 hours
   - Breakdown by type

3. **Filtered Views**
   - Recent orders
   - Recent draws
   - Recent winners
   - Recent ticket purchases

### Example Dashboard Component Structure

```typescript
const Dashboard = () => {
  const { activities } = useRecentActivities(20);
  const { stats } = useActivityStats();

  return (
    <div>
      <ActivityStats stats={stats} />
      <ActivityFeed activities={activities} />
      <ActivityFilters />
    </div>
  );
};
```

---

## Event Payload Examples

### Ticket Reserved

```json
{
  "qty": 5,
  "ticketNumbers": [1, 2, 3, 4, 5],
  "reservedUntil": "2025-11-15T14:15:00.000Z"
}
```

### Order Paid

```json
{
  "amountPence": 500,
  "quantity": 5,
  "orderId": "order_id",
  "currency": "GBP"
}
```

### Draw Created

```json
{
  "drawMethod": "admin_triggered",
  "numWinners": 1,
  "reserveWinners": 3,
  "seed": "a1b2c3d4e5f6...",
  "algorithm": "hmac-sha256-v1"
}
```

### Winner Selected

```json
{
  "ticketNumber": 1234,
  "isPrimary": true,
  "drawId": "draw_id"
}
```

---

## Error Handling

### Common Error Responses

#### 401 Unauthorized

```json
{
  "success": false,
  "message": "Not authorized",
  "statusCode": 401
}
```

#### 403 Forbidden

```json
{
  "success": false,
  "message": "Access denied. Admin privileges required.",
  "statusCode": 403
}
```

#### 400 Bad Request

```json
{
  "success": false,
  "message": "Invalid event type: invalid_type",
  "statusCode": 400
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Internal server error",
  "statusCode": 500
}
```

---

## Best Practices

### For Frontend Developers

1. **Polling**: Use polling (every 30-60 seconds) for real-time activity feeds
2. **Pagination**: Always implement pagination for large activity lists
3. **Filtering**: Provide UI filters for type, date range, and entity
4. **Grouping**: Group activities by time (Today, Yesterday, This Week)
5. **Caching**: Cache recent activities to reduce API calls
6. **Error Handling**: Handle empty states gracefully

### For Backend Developers

1. **Indexing**: Event model has proper indexes for efficient queries
2. **Immutable**: Events are immutable (no updates, only creation)
3. **Automatic Logging**: Events are automatically created by controllers
4. **Performance**: Use pagination to limit query results
5. **Filtering**: Support multiple filter combinations

---

## Activity Tracking Implementation

### Automatic Event Creation

Events are automatically created in the following scenarios:

1. **Ticket Operations**
   - `TICKET_RESERVED` - When tickets are reserved
   - `TICKET_ISSUED` - When tickets are issued after payment
   - `TICKET_CANCELLED` - When tickets are cancelled

2. **Order Operations**
   - `ORDER_CREATED` - When order is created
   - `ORDER_PAID` - When payment is successful
   - `ORDER_FAILED` - When payment fails
   - `ORDER_REFUNDED` - When order is refunded

3. **Draw Operations**
   - `DRAW_CREATED` - When draw is completed
   - `WINNER_SELECTED` - When winner is selected
   - `WINNER_NOTIFIED` - When winner is notified
   - `WINNER_CLAIMED` - When prize is claimed

4. **Competition Operations**
   - `COMPETITION_CLOSED` - When competition closes
   - `COMPETITION_DRAWN` - When competition is drawn

---

## Support

For issues or questions regarding the Activity Tracker API, please contact the development team or refer to the main API documentation.

---

**Last Updated:** November 15, 2025  
**API Version:** v1  
**Documentation Version:** 1.0
