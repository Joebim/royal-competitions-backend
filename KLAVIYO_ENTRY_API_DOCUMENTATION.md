# Entry API Documentation - Frontend Guide

## 🎯 Overview

This document provides complete API documentation for the Competition Entry endpoints. These endpoints allow users to:

- Start an entry process (tracks "Started Competition Entry" in Klaviyo)
- Submit an entry with their answer (tracks "Submitted Competition Entry" in Klaviyo)
- View their entries for a competition

**All Klaviyo tracking happens automatically** - no frontend Klaviyo code needed! 🎉

---

## 📋 Base URL

All endpoints are prefixed with `/api/v1/entries`

---

## 🔐 Authentication

All entry endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## 📚 API Endpoints

### 1. **Start Competition Entry**

Tracks "Started Competition Entry" event in Klaviyo when user begins the entry process.

#### Endpoint

```
POST /api/v1/entries/start
```

#### Headers

```
Content-Type: application/json
Authorization: Bearer <token>
```

#### Request Body

```typescript
{
  competitionId: string;      // Required - Competition ID
  orderId?: string;           // Optional - Order ID (if entry is for a paid ticket)
  ticketNumber?: number;      // Optional - Ticket number (if entry is for a specific ticket)
}
```

#### Example Request

```typescript
const response = await fetch('/api/v1/entries/start', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    competitionId: '507f1f77bcf86cd799439011',
    orderId: '507f1f77bcf86cd799439012', // Optional
    ticketNumber: 12345, // Optional
  }),
});
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Entry process started",
  "data": {
    "competitionId": "507f1f77bcf86cd799439011",
    "competitionName": "Win a Luxury Car",
    "hasQuestion": true,
    "question": "What is the capital of England?",
    "answerOptions": ["London", "Manchester", "Birmingham", "Liverpool"]
  }
}
```

#### Response Fields

- `competitionId` - The competition ID
- `competitionName` - The competition title
- `hasQuestion` - Boolean indicating if competition has a question
- `question` - The competition question (if exists)
- `answerOptions` - Array of possible answers (if multiple choice)

#### Error Responses

**401 Unauthorized**

```json
{
  "success": false,
  "message": "Not authorized",
  "statusCode": 401
}
```

**400 Bad Request** - Missing competitionId

```json
{
  "success": false,
  "message": "Competition ID is required",
  "statusCode": 400
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

**404 Not Found** - Order/Ticket not found or not authorized

```json
{
  "success": false,
  "message": "Order not found or not authorized",
  "statusCode": 404
}
```

#### When to Call This Endpoint

Call this endpoint when:

- User navigates to the competition entry/question page
- User clicks "Enter Competition" button
- User starts viewing the competition question
- **Before** displaying the question form

#### Frontend Implementation Example

```typescript
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

interface CompetitionQuestion {
  competitionId: string;
  competitionName: string;
  hasQuestion: boolean;
  question?: string;
  answerOptions?: string[];
}

export const CompetitionEntryPage: React.FC = () => {
  const { competitionId } = useParams<{ competitionId: string }>();
  const [question, setQuestion] = useState<CompetitionQuestion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const startEntry = async () => {
      try {
        const response = await fetch('/api/v1/entries/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            competitionId,
            // Optionally include orderId and ticketNumber if available
          }),
        });

        const data = await response.json();

        if (data.success) {
          setQuestion(data.data);
          // "Started Competition Entry" event is automatically tracked in Klaviyo
        }
      } catch (error) {
        console.error('Error starting entry:', error);
      } finally {
        setLoading(false);
      }
    };

    if (competitionId) {
      startEntry();
    }
  }, [competitionId]);

  if (loading) return <div>Loading...</div>;
  if (!question) return <div>Competition not found</div>;

  return (
    <div>
      <h1>{question.competitionName}</h1>
      {question.hasQuestion && (
        <div>
          <p>{question.question}</p>
          {/* Render answer form */}
        </div>
      )}
    </div>
  );
};
```

---

### 2. **Submit Competition Entry**

Creates an Entry record and tracks "Submitted Competition Entry" event in Klaviyo.

#### Endpoint

```
POST /api/v1/entries/submit
```

#### Headers

```
Content-Type: application/json
Authorization: Bearer <token>
```

#### Request Body

```typescript
{
  competitionId: string; // Required - Competition ID
  orderId: string; // Required - Order ID
  ticketNumber: number; // Required - Ticket number
  answer: string; // Required - User's answer to the question
}
```

#### Example Request

```typescript
const response = await fetch('/api/v1/entries/submit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    competitionId: '507f1f77bcf86cd799439011',
    orderId: '507f1f77bcf86cd799439012',
    ticketNumber: 12345,
    answer: 'London',
  }),
});
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Entry submitted successfully",
  "data": {
    "entry": {
      "id": "507f1f77bcf86cd799439013",
      "competitionId": "507f1f77bcf86cd799439011",
      "orderId": "507f1f77bcf86cd799439012",
      "ticketNumber": "12345",
      "isCorrect": true,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "isCorrect": true,
    "message": "Entry submitted successfully! Your answer is correct."
  }
}
```

#### Response Fields

- `entry.id` - The created entry ID
- `entry.competitionId` - Competition ID
- `entry.orderId` - Order ID
- `entry.ticketNumber` - Ticket number
- `entry.isCorrect` - Boolean indicating if answer is correct
- `entry.createdAt` - Entry creation timestamp
- `isCorrect` - Same as entry.isCorrect (for convenience)
- `message` - Success message (varies based on correctness)

#### Error Responses

**401 Unauthorized**

```json
{
  "success": false,
  "message": "Not authorized",
  "statusCode": 401
}
```

**400 Bad Request** - Missing required fields

```json
{
  "success": false,
  "message": "Competition ID is required",
  "statusCode": 400
}
```

**400 Bad Request** - Entry already exists

```json
{
  "success": false,
  "message": "Entry already submitted for this ticket",
  "statusCode": 400
}
```

**404 Not Found** - Competition/Order/Ticket not found

```json
{
  "success": false,
  "message": "Competition not found",
  "statusCode": 404
}
```

#### When to Call This Endpoint

Call this endpoint when:

- User submits the answer form
- User clicks "Submit Entry" button
- After validating the answer format on frontend (optional)

#### Frontend Implementation Example

```typescript
import { useState } from 'react';

interface SubmitEntryData {
  competitionId: string;
  orderId: string;
  ticketNumber: number;
  answer: string;
}

export const EntryForm: React.FC<{
  competitionId: string;
  orderId: string;
  ticketNumber: number;
  question: string;
  answerOptions?: string[];
}> = ({ competitionId, orderId, ticketNumber, question, answerOptions }) => {
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ isCorrect: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!answer.trim()) {
      alert('Please enter an answer');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/v1/entries/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          competitionId,
          orderId,
          ticketNumber,
          answer: answer.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        // "Submitted Competition Entry" event is automatically tracked in Klaviyo
        setResult({
          isCorrect: data.data.isCorrect,
          message: data.data.message,
        });

        // Show success message
        if (data.data.isCorrect) {
          // Answer is correct - show success
          alert('✅ Correct! Your entry has been submitted.');
        } else {
          // Answer is incorrect - still submitted but show message
          alert('❌ Incorrect answer. Your entry has been submitted, but you may not be eligible to win.');
        }
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error submitting entry:', error);
      alert('Failed to submit entry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>{question}</h2>

      {answerOptions ? (
        // Multiple choice
        <div>
          {answerOptions.map((option, index) => (
            <label key={index}>
              <input
                type="radio"
                name="answer"
                value={option}
                checked={answer === option}
                onChange={(e) => setAnswer(e.target.value)}
              />
              {option}
            </label>
          ))}
        </div>
      ) : (
        // Free text
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Enter your answer"
          required
        />
      )}

      <button type="submit" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit Entry'}
      </button>

      {result && (
        <div className={`result ${result.isCorrect ? 'correct' : 'incorrect'}`}>
          {result.message}
        </div>
      )}
    </form>
  );
};
```

---

### 3. **Get User's Entries for a Competition**

Retrieves all entries submitted by the authenticated user for a specific competition.

#### Endpoint

```
GET /api/v1/entries/competition/:competitionId
```

#### Headers

```
Authorization: Bearer <token>
```

#### Query Parameters

```
page?: number    // Optional - Page number (default: 1)
limit?: number   // Optional - Items per page (default: 20)
```

#### Example Request

```typescript
const competitionId = '507f1f77bcf86cd799439011';
const page = 1;
const limit = 20;

const response = await fetch(
  `/api/v1/entries/competition/${competitionId}?page=${page}&limit=${limit}`,
  {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Entries retrieved successfully",
  "data": {
    "entries": [
      {
        "id": "507f1f77bcf86cd799439013",
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
    "limit": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

#### Response Fields

- `entries[]` - Array of entry objects
  - `id` - Entry ID
  - `competitionId` - Competition ID
  - `orderId` - Order object (with orderNumber, amount)
  - `ticketNumber` - Ticket number
  - `answer` - Submitted answer
  - `isCorrect` - Whether answer is correct
  - `isWinner` - Whether entry is a winner
  - `createdAt` - Entry creation timestamp
- `pagination` - Pagination metadata

#### Error Responses

**401 Unauthorized**

```json
{
  "success": false,
  "message": "Not authorized",
  "statusCode": 401
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

#### When to Call This Endpoint

Call this endpoint when:

- User views "My Entries" page
- User wants to see their entry history for a competition
- Displaying entry status in user dashboard

#### Frontend Implementation Example

```typescript
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

interface Entry {
  id: string;
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

export const MyEntriesPage: React.FC = () => {
  const { competitionId } = useParams<{ competitionId: string }>();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 1,
  });

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const response = await fetch(
          `/api/v1/entries/competition/${competitionId}?page=${pagination.page}&limit=${pagination.limit}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        const data = await response.json();

        if (data.success) {
          setEntries(data.data.entries);
          setPagination(data.pagination);
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

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>My Entries</h1>

      {entries.length === 0 ? (
        <p>You haven't submitted any entries for this competition yet.</p>
      ) : (
        <div>
          {entries.map((entry) => (
            <div key={entry.id} className="entry-card">
              <div className="entry-header">
                <span>Ticket #{entry.ticketNumber}</span>
                <span className={`status ${entry.isCorrect ? 'correct' : 'incorrect'}`}>
                  {entry.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                </span>
                {entry.isWinner && <span className="winner-badge">🏆 Winner</span>}
              </div>
              <div className="entry-details">
                <p><strong>Answer:</strong> {entry.answer}</p>
                <p><strong>Order:</strong> {entry.orderId.orderNumber}</p>
                <p><strong>Submitted:</strong> {new Date(entry.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

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
          </span>
          <button
            disabled={pagination.page === pagination.totalPages}
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
```

---

### 4. **Get All Entries for a Competition (Admin Only)**

Retrieves all entries for a competition. **Admin access required.**

#### Endpoint

```
GET /api/v1/entries/admin/competition/:competitionId
```

#### Headers

```
Authorization: Bearer <admin_token>
```

#### Query Parameters

```
page?: number    // Optional - Page number (default: 1)
limit?: number   // Optional - Items per page (default: 50)
```

#### Example Request

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

#### Success Response (200 OK)

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

#### Error Responses

**401 Unauthorized** - Not authenticated

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

---

## 🔄 Complete Entry Flow Example

Here's a complete example of the entry flow from start to finish:

```typescript
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export const CompleteEntryFlow: React.FC = () => {
  const { competitionId } = useParams<{ competitionId: string }>();
  const [step, setStep] = useState<'loading' | 'question' | 'submitted'>('loading');
  const [question, setQuestion] = useState<any>(null);
  const [answer, setAnswer] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [ticketNumber, setTicketNumber] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);

  // Step 1: Start entry (when page loads)
  useEffect(() => {
    const startEntry = async () => {
      try {
        const response = await fetch('/api/v1/entries/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            competitionId,
            orderId, // If available
            ticketNumber, // If available
          }),
        });

        const data = await response.json();

        if (data.success) {
          setQuestion(data.data);
          setStep('question');
          // "Started Competition Entry" tracked in Klaviyo ✅
        }
      } catch (error) {
        console.error('Error starting entry:', error);
      }
    };

    if (competitionId) {
      startEntry();
    }
  }, [competitionId]);

  // Step 2: Submit entry
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orderId || !ticketNumber) {
      alert('Order ID and Ticket Number are required');
      return;
    }

    try {
      const response = await fetch('/api/v1/entries/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          competitionId,
          orderId,
          ticketNumber,
          answer: answer.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        setStep('submitted');
        // "Submitted Competition Entry" tracked in Klaviyo ✅
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error submitting entry:', error);
      alert('Failed to submit entry. Please try again.');
    }
  };

  if (step === 'loading') {
    return <div>Loading competition question...</div>;
  }

  if (step === 'submitted') {
    return (
      <div className="submission-result">
        <h2>{result.isCorrect ? '✅ Correct!' : '❌ Incorrect'}</h2>
        <p>{result.message}</p>
        <p>Your entry has been submitted successfully.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>{question.competitionName}</h1>

      {question.hasQuestion ? (
        <>
          <p className="question">{question.question}</p>

          {question.answerOptions ? (
            <div className="multiple-choice">
              {question.answerOptions.map((option: string, index: number) => (
                <label key={index}>
                  <input
                    type="radio"
                    name="answer"
                    value={option}
                    checked={answer === option}
                    onChange={(e) => setAnswer(e.target.value)}
                  />
                  {option}
                </label>
              ))}
            </div>
          ) : (
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Enter your answer"
              required
            />
          )}

          <button type="submit">Submit Entry</button>
        </>
      ) : (
        <p>This competition does not require an answer.</p>
      )}
    </form>
  );
};
```

---

## 🎯 Klaviyo Event Tracking

Both entry endpoints automatically track events in Klaviyo:

### "Started Competition Entry"

- **Triggered by:** `POST /api/v1/entries/start`
- **Event Properties:**
  - `competition_id`
  - `competition_name`
  - `order_id` (if provided)
  - `ticket_number` (if provided)

### "Submitted Competition Entry"

- **Triggered by:** `POST /api/v1/entries/submit`
- **Event Properties:**
  - `competition_id`
  - `competition_name`
  - `order_id`
  - `ticket_number`
  - `is_correct` (boolean)
  - `entry_id`

**No frontend code needed** - tracking happens automatically! 🎉

---

## 🧪 Testing Checklist

### Start Entry Endpoint

- [ ] Call endpoint with valid competitionId
- [ ] Call endpoint with optional orderId and ticketNumber
- [ ] Verify "Started Competition Entry" event appears in Klaviyo
- [ ] Handle 404 if competition not found
- [ ] Handle 401 if not authenticated

### Submit Entry Endpoint

- [ ] Submit entry with correct answer
- [ ] Submit entry with incorrect answer
- [ ] Verify "Submitted Competition Entry" event appears in Klaviyo
- [ ] Verify entry is created in database
- [ ] Handle duplicate entry error (entry already exists)
- [ ] Handle 404 if competition/order/ticket not found
- [ ] Handle 401 if not authenticated

### Get Entries Endpoint

- [ ] Fetch user's entries for a competition
- [ ] Test pagination (page, limit)
- [ ] Verify entries are filtered by user
- [ ] Handle empty results gracefully

---

## ❓ FAQ

### Q: Do I need to call "start entry" before "submit entry"?

**A:** No, but it's recommended. Calling "start entry" tracks when users begin the process, which is useful for analytics. You can call "submit entry" directly if needed.

### Q: What happens if a user submits multiple entries for the same ticket?

**A:** The API will return a 400 error: "Entry already submitted for this ticket". Each ticket can only have one entry.

### Q: Can users see if their answer is correct?

**A:** Yes! The submit endpoint returns `isCorrect` in the response, so you can show immediate feedback.

### Q: What if the competition doesn't have a question?

**A:** The "start entry" endpoint will return `hasQuestion: false`. You can still submit an entry, but the answer validation will be skipped.

### Q: How do I get the orderId and ticketNumber?

**A:** These come from the order/ticket system. When a user purchases tickets, they receive an order with ticket numbers. Use those values when submitting entries.

### Q: Are entries required to win?

**A:** This depends on your competition rules. The backend tracks entries, but the draw system determines winners based on your business logic.

---

## 📚 Summary

**Entry API Integration = Simple!**

1. ✅ Call `POST /api/v1/entries/start` when user views question page
2. ✅ Call `POST /api/v1/entries/submit` when user submits answer
3. ✅ Call `GET /api/v1/entries/competition/:id` to show user's entries

**That's it!** All Klaviyo tracking happens automatically in the backend. No frontend Klaviyo code needed! 🎉
