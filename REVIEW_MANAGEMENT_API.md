# Review Management API

This document describes all available endpoints for managing reviews.

**Base URL:** `/api/v1`

---

## Overview

Reviews allow users to submit feedback and ratings about their experience with Royal Competitions. Reviews can be verified by administrators and are displayed on the website to build trust and credibility.

**Key Features:**

- Public review submission (no authentication required)
- Review verification system
- Rating system (1-5 stars)
- Pagination support
- Filter by verification status

---

## Public Endpoints (No Authentication Required)

### Get All Reviews

Get all active reviews with pagination and filtering options.

**Endpoint:** `GET /api/v1/reviews`

**Authentication:** Not required (Public)

**Query Parameters:**

- `page` (optional) - Page number (default: `1`)
- `limit` (optional) - Items per page (default: `10`)
- `verified` (optional) - Filter by verification status (`true` or `false`). If not specified, returns both verified and unverified reviews.

**Response:**

```json
{
  "success": true,
  "message": "Reviews retrieved successfully",
  "data": {
    "reviews": [
      {
        "_id": "review_id",
        "title": "Great experience!",
        "body": "I won a fantastic prize and the whole process was smooth and easy.",
        "rating": 5,
        "reviewer": "John Smith",
        "location": "London, UK",
        "verified": true,
        "timeAgo": "2 weeks ago",
        "source": "Website",
        "publishedAt": "2024-01-15T10:00:00.000Z",
        "isActive": true,
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2024-01-15T10:00:00.000Z"
      },
      {
        "_id": "review_id_2",
        "title": "Amazing service",
        "body": "The customer service team was very helpful throughout the entire process.",
        "rating": 5,
        "reviewer": "Sarah Johnson",
        "location": "Manchester, UK",
        "verified": false,
        "publishedAt": "2024-01-14T08:30:00.000Z",
        "isActive": true,
        "createdAt": "2024-01-14T08:30:00.000Z",
        "updatedAt": "2024-01-14T08:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalItems": 25,
      "totalPages": 3
    }
  }
}
```

**Example Requests:**

```bash
# Get all reviews (first page)
GET /api/v1/reviews

# Get verified reviews only
GET /api/v1/reviews?verified=true

# Get unverified reviews only
GET /api/v1/reviews?verified=false

# Get reviews with custom pagination
GET /api/v1/reviews?page=2&limit=20
```

---

### Create Review

Submit a new review. Reviews are automatically published but start as unverified.

**Endpoint:** `POST /api/v1/reviews`

**Authentication:** Not required (Public)

**Request Body:**

```json
{
  "title": "Excellent service!",
  "body": "I had a wonderful experience with Royal Competitions. The process was straightforward and I received my prize quickly.",
  "rating": 5,
  "reviewer": "Jane Doe",
  "location": "Birmingham, UK"
}
```

**Request Body Fields:**

- `title` (required) - Review title (max 120 characters)
- `body` (required) - Review content (max 1000 characters)
- `rating` (required) - Rating from 1 to 5 (integer)
- `reviewer` (required) - Name of the reviewer (max 80 characters)
- `location` (optional) - Location of the reviewer (max 120 characters, can be empty or null)

**Response:**

```json
{
  "success": true,
  "message": "Review submitted successfully",
  "data": {
    "review": {
      "_id": "review_id",
      "title": "Excellent service!",
      "body": "I had a wonderful experience with Royal Competitions. The process was straightforward and I received my prize quickly.",
      "rating": 5,
      "reviewer": "Jane Doe",
      "location": "Birmingham, UK",
      "verified": false,
      "publishedAt": "2024-01-15T12:00:00.000Z",
      "isActive": true,
      "createdAt": "2024-01-15T12:00:00.000Z",
      "updatedAt": "2024-01-15T12:00:00.000Z"
    }
  }
}
```

**Error Responses:**

- `400` - Validation failed

  ```json
  {
    "success": false,
    "message": "Validation failed",
    "errors": {
      "title": ["Title is required"],
      "rating": ["Rating must be between 1 and 5"]
    }
  }
  ```

- `422` - Missing required fields
  ```json
  {
    "success": false,
    "message": "Missing required fields"
  }
  ```

**Validation Rules:**

- `title`: Required, max 120 characters
- `body`: Required, max 1000 characters
- `rating`: Required, must be between 1 and 5 (inclusive)
- `reviewer`: Required, max 80 characters
- `location`: Optional, max 120 characters

**Notes:**

- Reviews are automatically published (`publishedAt` is set to current date)
- Reviews start as unverified (`verified: false`) and can be verified by administrators
- Reviews are automatically set as active (`isActive: true`)
- The `timeAgo` and `source` fields are optional and can be set by administrators

---

## Review Model Fields

### Core Fields

- `_id` (ObjectId) - Unique review identifier
- `title` (String, required) - Review title (max 120 characters)
- `body` (String, required) - Review content (max 1000 characters)
- `rating` (Number, required) - Rating from 1 to 5
- `reviewer` (String, required) - Name of the reviewer (max 80 characters)
- `location` (String, optional) - Location of the reviewer (max 120 characters)

### Status Fields

- `verified` (Boolean, default: `false`) - Whether the review has been verified by an administrator
- `isActive` (Boolean, default: `true`) - Whether the review is active and should be displayed
- `publishedAt` (Date, default: current date) - When the review was published

### Metadata Fields

- `timeAgo` (String, optional) - Human-readable time since publication (e.g., "2 weeks ago")
- `source` (String, optional) - Source of the review (e.g., "Website", "Trustpilot", "Google")

### Timestamps

- `createdAt` (Date) - When the review was created
- `updatedAt` (Date) - When the review was last updated

---

## Frontend Integration Examples

### Get All Reviews

```javascript
const getReviews = async (page = 1, limit = 10, verified = null) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (verified !== null) {
    params.append('verified', verified.toString());
  }

  const response = await fetch(`/api/v1/reviews?${params.toString()}`);
  const data = await response.json();

  if (data.success) {
    return {
      reviews: data.data.reviews,
      pagination: data.data.pagination,
    };
  }

  throw new Error(data.message || 'Failed to fetch reviews');
};
```

### Get Verified Reviews Only

```javascript
const getVerifiedReviews = async (page = 1, limit = 10) => {
  return getReviews(page, limit, true);
};
```

### Create Review

```javascript
const createReview = async (reviewData) => {
  const response = await fetch('/api/v1/reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: reviewData.title,
      body: reviewData.body,
      rating: reviewData.rating,
      reviewer: reviewData.reviewer,
      location: reviewData.location || null,
    }),
  });

  const data = await response.json();

  if (data.success) {
    return data.data.review;
  }

  // Handle validation errors
  if (data.errors) {
    throw new Error(JSON.stringify(data.errors));
  }

  throw new Error(data.message || 'Failed to submit review');
};
```

### React Component Example

```jsx
import { useState, useEffect } from 'react';

const ReviewsSection = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/v1/reviews?page=${page}&limit=10&verified=true`
        );
        const data = await response.json();

        if (data.success) {
          setReviews(data.data.reviews);
          setPagination(data.data.pagination);
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [page]);

  const handleSubmitReview = async (reviewData) => {
    try {
      const response = await fetch('/api/v1/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData),
      });

      const data = await response.json();

      if (data.success) {
        alert('Review submitted successfully!');
        // Refresh reviews
        window.location.reload();
      } else {
        alert('Failed to submit review: ' + data.message);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('An error occurred while submitting your review');
    }
  };

  if (loading) {
    return <div>Loading reviews...</div>;
  }

  return (
    <div>
      <h2>Customer Reviews</h2>
      {reviews.map((review) => (
        <div key={review._id} className="review-card">
          <div className="review-header">
            <h3>{review.title}</h3>
            <div className="rating">
              {'★'.repeat(review.rating)}
              {'☆'.repeat(5 - review.rating)}
            </div>
          </div>
          <p className="review-body">{review.body}</p>
          <div className="review-footer">
            <span className="reviewer">{review.reviewer}</span>
            {review.location && (
              <span className="location">{review.location}</span>
            )}
            {review.verified && (
              <span className="verified-badge">Verified</span>
            )}
            <span className="date">
              {new Date(review.publishedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}

      {pagination && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewsSection;
```

### Review Form Component

```jsx
import { useState } from 'react';

const ReviewForm = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    rating: 5,
    reviewer: '',
    location: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'rating' ? parseInt(value) : value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 120) {
      newErrors.title = 'Title cannot exceed 120 characters';
    }

    if (!formData.body.trim()) {
      newErrors.body = 'Review content is required';
    } else if (formData.body.length > 1000) {
      newErrors.body = 'Review cannot exceed 1000 characters';
    }

    if (!formData.rating || formData.rating < 1 || formData.rating > 5) {
      newErrors.rating = 'Rating must be between 1 and 5';
    }

    if (!formData.reviewer.trim()) {
      newErrors.reviewer = 'Your name is required';
    } else if (formData.reviewer.length > 80) {
      newErrors.reviewer = 'Name cannot exceed 80 characters';
    }

    if (formData.location && formData.location.length > 120) {
      newErrors.location = 'Location cannot exceed 120 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      await onSubmit(formData);
      // Reset form
      setFormData({
        title: '',
        body: '',
        rating: 5,
        reviewer: '',
        location: '',
      });
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="review-form">
      <div className="form-group">
        <label htmlFor="title">Review Title *</label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          maxLength={120}
          required
        />
        {errors.title && <span className="error">{errors.title}</span>}
        <small>{formData.title.length}/120 characters</small>
      </div>

      <div className="form-group">
        <label htmlFor="body">Your Review *</label>
        <textarea
          id="body"
          name="body"
          value={formData.body}
          onChange={handleChange}
          maxLength={1000}
          rows={5}
          required
        />
        {errors.body && <span className="error">{errors.body}</span>}
        <small>{formData.body.length}/1000 characters</small>
      </div>

      <div className="form-group">
        <label htmlFor="rating">Rating *</label>
        <select
          id="rating"
          name="rating"
          value={formData.rating}
          onChange={handleChange}
          required
        >
          <option value={5}>5 - Excellent</option>
          <option value={4}>4 - Very Good</option>
          <option value={3}>3 - Good</option>
          <option value={2}>2 - Fair</option>
          <option value={1}>1 - Poor</option>
        </select>
        {errors.rating && <span className="error">{errors.rating}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="reviewer">Your Name *</label>
        <input
          type="text"
          id="reviewer"
          name="reviewer"
          value={formData.reviewer}
          onChange={handleChange}
          maxLength={80}
          required
        />
        {errors.reviewer && <span className="error">{errors.reviewer}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="location">Location (Optional)</label>
        <input
          type="text"
          id="location"
          name="location"
          value={formData.location}
          onChange={handleChange}
          maxLength={120}
        />
        {errors.location && <span className="error">{errors.location}</span>}
      </div>

      <button type="submit" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
};

export default ReviewForm;
```

---

## Summary Table

| Endpoint        | Method | Description            | Auth Required | Role Required |
| --------------- | ------ | ---------------------- | ------------- | ------------- |
| `GET /reviews`  | GET    | Get all active reviews | No            | -             |
| `POST /reviews` | POST   | Create a new review    | No            | -             |

---

## Important Notes

1. **Public Access**: All review endpoints are public and do not require authentication.

2. **Review Verification**: Reviews are submitted as unverified by default. Administrators can verify reviews through the admin panel.

3. **Active Status**: Only reviews with `isActive: true` are returned by the API. Inactive reviews are hidden from public view.

4. **Pagination**: The `GET /reviews` endpoint supports pagination. Use `page` and `limit` query parameters to control the results.

5. **Filtering**: You can filter reviews by verification status using the `verified` query parameter.

6. **Rating System**: Ratings must be integers between 1 and 5 (inclusive).

7. **Character Limits**:
   - Title: 120 characters
   - Body: 1000 characters
   - Reviewer: 80 characters
   - Location: 120 characters

8. **Sorting**: Reviews are sorted by `publishedAt` in descending order (newest first).

9. **Auto-Publishing**: Reviews are automatically published when created (no moderation queue).

10. **Validation**: All required fields are validated on the server side. Invalid requests will return detailed error messages.

---

## Error Handling

### Common Error Responses

**400 Bad Request - Validation Error:**

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "title": ["Title is required"],
    "rating": ["Rating must be between 1 and 5"],
    "body": ["Body is required"]
  }
}
```

**422 Unprocessable Entity - Missing Fields:**

```json
{
  "success": false,
  "message": "Missing required fields"
}
```

**500 Internal Server Error:**

```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Best Practices

1. **Display Verified Reviews**: Consider showing verified reviews more prominently or filtering to show only verified reviews by default.

2. **Character Counters**: Display character counters for title and body fields to help users stay within limits.

3. **Rating Display**: Use star icons or visual indicators to display ratings consistently.

4. **Error Handling**: Always handle validation errors gracefully and display them to users in a user-friendly format.

5. **Loading States**: Show loading indicators when fetching or submitting reviews.

6. **Success Feedback**: Provide clear feedback when a review is successfully submitted.

7. **Pagination**: Implement pagination controls for better user experience when there are many reviews.

8. **Responsive Design**: Ensure review components are responsive and work well on mobile devices.

---

## Future Enhancements (Not Currently Implemented)

The following features may be added in the future:

- Admin endpoints for managing reviews (verify, edit, delete)
- Review moderation queue
- Review replies/responses
- Review helpfulness voting
- Review images/attachments
- Review filtering by rating
- Review search functionality
- Review analytics and statistics
