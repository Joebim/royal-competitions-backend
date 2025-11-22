# Entry System - Frontend Quick Guide

## 🎯 What the Frontend Needs to Do

The entry system is **fully implemented in the backend**. The frontend just needs to:

1. **Call start endpoint** when user views the competition question page
2. **Call submit endpoint** when user submits their answer
3. **Display user's entries** (optional - for user dashboard)
4. **Admin: View all entries** for a competition

**All Klaviyo tracking happens automatically** - no frontend Klaviyo code needed! 🎉

---

## 📋 Frontend Implementation (3 Simple Steps)

### Step 1: Start Entry (When User Views Question Page)

```typescript
// Call this when user navigates to entry/question page
POST /api/v1/entries/start
{
  "competitionId": "507f1f77bcf86cd799439011",
  "orderId": "507f1f77bcf86cd799439012", // Optional
  "ticketNumber": 12345 // Optional
}

// Response includes the question
{
  "success": true,
  "data": {
    "competitionName": "Win a Luxury Car",
    "hasQuestion": true,
    "question": "What is the capital of England?",
    "answerOptions": ["London", "Manchester", "Birmingham"]
  }
}
```

**What happens:** "Started Competition Entry" event is automatically tracked in Klaviyo ✅

---

### Step 2: Submit Entry (When User Submits Answer)

```typescript
// Call this when user submits their answer
POST /api/v1/entries/submit
{
  "competitionId": "507f1f77bcf86cd799439011",
  "orderId": "507f1f77bcf86cd799439012", // Required
  "ticketNumber": 12345, // Required
  "answer": "London" // Required
}

// Response tells you if answer is correct
{
  "success": true,
  "data": {
    "entry": { ... },
    "isCorrect": true,
    "message": "Entry submitted successfully! Your answer is correct."
  }
}
```

**What happens:**

- Entry is created in database
- "Submitted Competition Entry" event is automatically tracked in Klaviyo ✅

---

### Step 3: View User's Entries (Optional - for Dashboard)

```typescript
// Get user's entries for a competition
GET /api/v1/entries/competition/:competitionId?page=1&limit=20

// Response
{
  "success": true,
  "data": {
    "entries": [
      {
        "id": "...",
        "ticketNumber": "12345",
        "answer": "London",
        "isCorrect": true,
        "isWinner": false,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  },
  "pagination": { ... }
}
```

---

## 🔐 Admin API - View All Entries

### Endpoint

```
GET /api/v1/entries/admin/competition/:competitionId
```

### Authentication

Requires **admin token** in Authorization header:

```
Authorization: Bearer <admin_token>
```

### Query Parameters

```
page?: number    // Optional - Page number (default: 1)
limit?: number   // Optional - Items per page (default: 50)
```

### Example Request

```typescript
const competitionId = '507f1f77bcf86cd799439011';

const response = await fetch(
  `/api/v1/entries/admin/competition/${competitionId}?page=1&limit=50`,
  {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  }
);
```

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Entries retrieved successfully",
  "data": {
    "entries": [
      {
        "id": "507f1f77bcf86cd799439013",
        "userId": {
          "_id": "507f1f77bcf86cd799439014",
          "firstName": "Jane",
          "lastName": "Doe",
          "email": "jane@example.com"
        },
        "competitionId": "507f1f77bcf86cd799439011",
        "orderId": {
          "_id": "507f1f77bcf86cd799439012",
          "orderNumber": "ORD-2024-001",
          "amount": 5.99
        },
        "ticketNumber": "12345",
        "answer": "London",
        "isCorrect": true,
        "isWinner": false,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 50,
    "totalItems": 150,
    "totalPages": 3
  }
}
```

### Response Fields

- `entries[]` - Array of all entries for the competition
  - `id` - Entry ID
  - `userId` - User object (firstName, lastName, email)
  - `competitionId` - Competition ID
  - `orderId` - Order object (orderNumber, amount)
  - `ticketNumber` - Ticket number
  - `answer` - Submitted answer
  - `isCorrect` - Whether answer is correct
  - `isWinner` - Whether entry is a winner
  - `createdAt` - Entry creation timestamp
- `pagination` - Pagination metadata

### Error Responses

**401 Unauthorized**

```json
{
  "success": false,
  "message": "Not authorized",
  "statusCode": 401
}
```

**403 Forbidden** - Not admin

```json
{
  "success": false,
  "message": "Access denied. Admin only.",
  "statusCode": 403
}
```

**404 Not Found** - Competition not found

```json
{
  "success": false,
  "message": "Competition not found",
  "statusCode": 404
}
```

---

## 💻 Admin Frontend Example

```typescript
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

interface Entry {
  id: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  competitionId: string;
  orderId: {
    _id: string;
    orderNumber: string;
    amount: number;
  };
  ticketNumber: string;
  answer: string;
  isCorrect: boolean;
  isWinner: boolean;
  createdAt: string;
}

export const AdminEntriesPage: React.FC = () => {
  const { competitionId } = useParams<{ competitionId: string }>();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    totalItems: 0,
    totalPages: 1,
  });

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const adminToken = localStorage.getItem('adminToken'); // or get from auth context

        const response = await fetch(
          `/api/v1/entries/admin/competition/${competitionId}?page=${pagination.page}&limit=${pagination.limit}`,
          {
            headers: {
              'Authorization': `Bearer ${adminToken}`,
            },
          }
        );

        const data = await response.json();

        if (data.success) {
          setEntries(data.data.entries);
          setPagination(data.pagination);
        } else {
          console.error('Error:', data.message);
        }
      } catch (error) {
        console.error('Error fetching entries:', error);
      } finally {
        setLoading(false);
      }
    };

    if (competitionId) {
      fetchEntries();
    }
  }, [competitionId, pagination.page]);

  if (loading) return <div>Loading entries...</div>;

  return (
    <div className="admin-entries-page">
      <h1>All Entries for Competition</h1>

      <div className="entries-table">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Ticket #</th>
              <th>Answer</th>
              <th>Correct?</th>
              <th>Winner?</th>
              <th>Order</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.userId.firstName} {entry.userId.lastName}</td>
                <td>{entry.userId.email}</td>
                <td>{entry.ticketNumber}</td>
                <td>{entry.answer}</td>
                <td>
                  <span className={entry.isCorrect ? 'correct' : 'incorrect'}>
                    {entry.isCorrect ? '✓' : '✗'}
                  </span>
                </td>
                <td>
                  {entry.isWinner && <span className="winner-badge">🏆</span>}
                </td>
                <td>{entry.orderId.orderNumber}</td>
                <td>{new Date(entry.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={pagination.page === 1}
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
          >
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.totalPages}
            ({pagination.totalItems} total entries)
          </span>
          <button
            disabled={pagination.page === pagination.totalPages}
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
          >
            Next
          </button>
        </div>
      )}

      {/* Export/Download Options */}
      <div className="export-options">
        <button onClick={() => exportToCSV(entries)}>Export to CSV</button>
        <button onClick={() => exportToExcel(entries)}>Export to Excel</button>
      </div>
    </div>
  );
};
```

---

## 🎯 Complete User Entry Flow

```typescript
// 1. User navigates to competition entry page
// → Call POST /api/v1/entries/start
// → Display question from response

// 2. User submits answer
// → Call POST /api/v1/entries/submit
// → Show success/error message based on response

// 3. (Optional) Show user's entries in dashboard
// → Call GET /api/v1/entries/competition/:id
// → Display list of entries
```

---

## ✅ Implementation Checklist

### User Entry Flow

- [ ] Call `POST /api/v1/entries/start` when user views question page
- [ ] Display question from start response
- [ ] Call `POST /api/v1/entries/submit` when user submits answer
- [ ] Show feedback based on `isCorrect` in response
- [ ] Handle errors gracefully (404, 400, 401)

### User Dashboard (Optional)

- [ ] Call `GET /api/v1/entries/competition/:id` to show user's entries
- [ ] Display entry history with pagination
- [ ] Show entry status (correct/incorrect, winner)

### Admin Dashboard

- [ ] Call `GET /api/v1/entries/admin/competition/:id` to view all entries
- [ ] Display entries in table/grid format
- [ ] Show user information, answers, correctness
- [ ] Implement pagination
- [ ] Add export functionality (CSV/Excel) - frontend only

---

## 🎨 UI Recommendations

### Entry Form

- Show question prominently
- Display answer options clearly (if multiple choice)
- Show submit button with loading state
- Display immediate feedback after submission (correct/incorrect)

### Admin Entries Table

- Sortable columns (user, ticket, answer, date)
- Filter by correctness (correct/incorrect)
- Filter by winner status
- Search by user email/name
- Export to CSV/Excel

---

## 📊 Klaviyo Events (Automatic)

**No frontend code needed!** These events are tracked automatically:

1. **"Started Competition Entry"** - When `POST /api/v1/entries/start` is called
2. **"Submitted Competition Entry"** - When `POST /api/v1/entries/submit` is called

Both events include:

- `competition_id`
- `competition_name`
- `order_id` (if provided)
- `ticket_number` (if provided)
- `is_correct` (for submitted event)
- `entry_id` (for submitted event)

---

## ❓ FAQ

### Q: Do I need to call "start" before "submit"?

**A:** No, but it's recommended for better analytics. You can call "submit" directly.

### Q: What if user submits duplicate entry?

**A:** API returns 400 error: "Entry already submitted for this ticket". Show error message to user.

### Q: Can I filter admin entries by correctness?

**A:** Not in the API, but you can filter on the frontend using the `isCorrect` field.

### Q: How do I get orderId and ticketNumber?

**A:** These come from the order/ticket system when user purchases tickets.

### Q: Are entries required to win?

**A:** Depends on your competition rules. The backend tracks entries, but draw logic determines winners.

---

## 📚 Summary

**Frontend Integration = 3 API Calls!**

1. ✅ `POST /api/v1/entries/start` - When user views question
2. ✅ `POST /api/v1/entries/submit` - When user submits answer
3. ✅ `GET /api/v1/entries/admin/competition/:id` - Admin: View all entries

**That's it!** All Klaviyo tracking happens automatically. No frontend Klaviyo code needed! 🎉
