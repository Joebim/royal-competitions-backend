# Competition Creation API

This document provides comprehensive documentation for creating competitions in the Royal Competitions platform.

**Base URL:** `/api/v1`

---

## Overview

Creating a competition requires authentication (Admin or Super Admin role). The endpoint accepts both JSON data and file uploads (images) using `multipart/form-data`.

**Endpoint:** `POST /api/v1/competitions`

**Authentication:** Required (Admin or Super Admin)

---

## Required Fields

The following fields are **mandatory** when creating a competition:

### 1. `title` (String)

- **Required:** Yes
- **Min Length:** 5 characters
- **Max Length:** 200 characters
- **Description:** The competition title/name
- **Example:** `"Win a Luxury Car - Mercedes-Benz C-Class"`

### 2. `description` (String)

- **Required:** Yes
- **Min Length:** 20 characters
- **Max Length:** 5000 characters
- **Description:** Full description of the competition and prize
- **Example:** `"Enter now for your chance to win this stunning Mercedes-Benz C-Class..."`

### 3. `prize` (String)

- **Required:** Yes
- **Description:** Short description of the prize
- **Example:** `"Mercedes-Benz C-Class"`

### 4. `ticketPricePence` (Number)

- **Required:** Yes
- **Min Value:** 1
- **Description:** Ticket price in **pence** (not pounds)
- **Important:** Price must be in pence (e.g., £1.00 = 100, £5.00 = 500, £10.50 = 1050)
- **Example:** `100` (for £1.00), `500` (for £5.00), `1050` (for £10.50)

### 5. `category` (String)

- **Required:** Yes
- **Min Length:** 2 characters
- **Max Length:** 100 characters
- **Description:** Competition category name
- **Note:** Category will be auto-created if it doesn't exist
- **Example:** `"Luxury Cars"`, `"Tech & Gadgets"`, `"Holidays"`

### 6. `drawAt` (Date/String)

- **Required:** Yes
- **Description:** Date and time when the draw should occur
- **Format:** ISO 8601 date string or Date object
- **Example:** `"2024-12-31T23:59:59.000Z"` or `"2024-12-31T23:59:59"`

---

## Optional Fields

### Basic Information

#### `shortDescription` (String)

- **Max Length:** 280 characters
- **Description:** Brief summary for listings/cards
- **Example:** `"Win a luxury Mercedes-Benz C-Class worth £40,000"`

#### `prizeValue` (Number)

- **Min Value:** 0
- **Description:** Monetary value of the prize in pounds
- **Example:** `40000` (for £40,000)

#### `cashAlternative` (Number)

- **Min Value:** 0
- **Description:** Cash alternative amount in pounds (if winner prefers cash)
- **Example:** `35000` (for £35,000)

#### `cashAlternativeDetails` (String)

- **Max Length:** 500 characters
- **Description:** Details about the cash alternative option
- **Example:** `"Winner can choose to receive £35,000 cash instead"`

#### `originalPrice` (Number)

- **Min Value:** 0
- **Description:** Original retail price of the prize in pounds
- **Example:** `45000` (for £45,000)

### Ticket Configuration

#### `ticketLimit` (Number or null)

- **Min Value:** 10
- **Max Value:** 100000
- **Allow null:** Yes
- **Description:** Maximum number of tickets available. Set to `null` for unlimited tickets
- **Example:** `10000` or `null`

#### `ticketsSold` (Number)

- **Min Value:** 0
- **Description:** Number of tickets already sold (usually 0 for new competitions)
- **Default:** 0
- **Example:** `0`

### Competition Status

#### `status` (String)

- **Valid Values:** `"draft"`, `"live"`, `"closed"`, `"drawn"`, `"cancelled"`
- **Description:** Current status of the competition
- **Default:** Usually `"draft"` for new competitions
- **Example:** `"draft"` or `"live"`

#### `drawMode` (String)

- **Valid Values:** `"automatic"`, `"admin_triggered"`, `"manual"`
- **Description:** How the draw will be conducted
- **Example:** `"automatic"`

#### `featured` (Boolean)

- **Description:** Whether to feature this competition on the homepage
- **Default:** `false`
- **Example:** `true` or `false`

#### `isActive` (Boolean)

- **Description:** Whether the competition is active and visible
- **Default:** `true`
- **Example:** `true` or `false`

### Dates

#### `startDate` (Date/String)

- **Description:** When the competition starts accepting entries
- **Format:** ISO 8601 date string
- **Example:** `"2024-01-01T00:00:00.000Z"`

#### `endDate` (Date/String)

- **Description:** When the competition stops accepting entries
- **Format:** ISO 8601 date string
- **Note:** Must be greater than `startDate` if both are provided
- **Example:** `"2024-12-31T23:59:59.000Z"`

### Free Entry

#### `freeEntryEnabled` (Boolean)

- **Description:** Whether free postal entries are allowed
- **Default:** `false`
- **Example:** `true` or `false`

#### `noPurchasePostalAddress` (String)

- **Description:** Postal address for free entries (if free entry is enabled)
- **Can be empty:** Yes
- **Example:** `"Royal Competitions, 123 High Street, London, UK, SW1A 1AA"`

### Terms and Conditions

#### `termsUrl` (String)

- **Description:** URL to terms and conditions page
- **Format:** Valid URI
- **Can be empty:** Yes
- **Example:** `"https://www.royalcompetitions.co.uk/terms"`

#### `termsAndConditions` (String)

- **Description:** Terms and conditions text
- **Can be empty:** Yes
- **Example:** `"By entering this competition, you agree to..."`

### Additional Content

#### `features` (Array of Strings or String)

- **Description:** List of key features/benefits
- **Format:** Array of strings or comma-separated string
- **Example:** `["Air conditioning", "Leather seats", "Navigation system"]` or `"Air conditioning, Leather seats, Navigation system"`

#### `included` (Array of Strings or String)

- **Description:** What's included with the prize
- **Format:** Array of strings or comma-separated string
- **Example:** `["Full service history", "12 months warranty"]` or `"Full service history, 12 months warranty"`

#### `tags` (Array of Strings or String)

- **Description:** Tags for categorization and search
- **Format:** Array of strings or comma-separated string
- **Example:** `["luxury", "car", "mercedes"]` or `"luxury, car, mercedes"`

#### `specifications` (Array of Objects or String)

- **Description:** Technical specifications
- **Format:** Array of objects with `label` and `value`, or JSON string
- **Example:**
  ```json
  [
    { "label": "Engine", "value": "2.0L Turbo" },
    { "label": "Transmission", "value": "Automatic" },
    { "label": "Fuel Type", "value": "Petrol" }
  ]
  ```
  Or as JSON string:
  ```json
  "[{\"label\":\"Engine\",\"value\":\"2.0L Turbo\"}]"
  ```

### Skill Question (Optional)

#### `question` (Object or null)

- **Description:** Optional skill-based question for UK compliance
- **Can be null:** Yes
- **Structure:**
  ```json
  {
    "question": "What is the capital of England?",
    "options": ["London", "Manchester", "Birmingham", "Liverpool"],
    "correctAnswer": "London",
    "explanation": "London is the capital and largest city of England."
  }
  ```
- **Fields:**
  - `question` (String, required) - The question text
  - `options` or `answerOptions` (Array, required) - 2-6 answer options
  - `correctAnswer` (String, required) - The correct answer
  - `explanation` (String, optional) - Explanation of the answer

### Images

#### `images` (Files)

- **Description:** Competition images (uploaded as files)
- **Format:** `multipart/form-data` with file field name `images` (can be multiple)
- **Supported Formats:** Images (JPEG, PNG, etc.)
- **Note:** Images are uploaded to Cloudinary and processed automatically

### Other

#### `slug` (String)

- **Description:** URL-friendly slug (auto-generated from title if not provided)
- **Example:** `"win-luxury-car-mercedes-benz-c-class"`

#### `nextTicketNumber` (Number)

- **Min Value:** 1
- **Description:** Starting ticket number (usually 1 for new competitions)
- **Default:** 1
- **Example:** `1`

---

## Request Format

### Using FormData (Recommended for Images)

When uploading images, use `multipart/form-data`:

```javascript
const formData = new FormData();

// Required fields
formData.append('title', 'Win a Luxury Car - Mercedes-Benz C-Class');
formData.append(
  'description',
  'Enter now for your chance to win this stunning Mercedes-Benz C-Class...'
);
formData.append('prize', 'Mercedes-Benz C-Class');
formData.append('ticketPricePence', '100'); // £1.00
formData.append('category', 'Luxury Cars');
formData.append('drawAt', '2024-12-31T23:59:59.000Z');

// Optional fields
formData.append(
  'shortDescription',
  'Win a luxury Mercedes-Benz C-Class worth £40,000'
);
formData.append('prizeValue', '40000');
formData.append('ticketLimit', '10000');
formData.append('status', 'draft');
formData.append('featured', 'true');

// Images (can append multiple)
formData.append('images', file1);
formData.append('images', file2);

// Arrays (as JSON strings or comma-separated)
formData.append(
  'features',
  JSON.stringify(['Air conditioning', 'Leather seats'])
);
formData.append('tags', 'luxury, car, mercedes');

// Specifications (as JSON string)
formData.append(
  'specifications',
  JSON.stringify([
    { label: 'Engine', value: '2.0L Turbo' },
    { label: 'Transmission', value: 'Automatic' },
  ])
);

// Question (as JSON string)
formData.append(
  'question',
  JSON.stringify({
    question: 'What is the capital of England?',
    options: ['London', 'Manchester', 'Birmingham'],
    correctAnswer: 'London',
    explanation: 'London is the capital of England.',
  })
);
```

### Using JSON (No Images)

If you're not uploading images, you can use `application/json`:

```json
{
  "title": "Win a Luxury Car - Mercedes-Benz C-Class",
  "description": "Enter now for your chance to win this stunning Mercedes-Benz C-Class...",
  "prize": "Mercedes-Benz C-Class",
  "ticketPricePence": 100,
  "category": "Luxury Cars",
  "drawAt": "2024-12-31T23:59:59.000Z",
  "shortDescription": "Win a luxury Mercedes-Benz C-Class worth £40,000",
  "prizeValue": 40000,
  "ticketLimit": 10000,
  "status": "draft",
  "featured": true,
  "features": ["Air conditioning", "Leather seats"],
  "tags": ["luxury", "car", "mercedes"],
  "specifications": [
    { "label": "Engine", "value": "2.0L Turbo" },
    { "label": "Transmission", "value": "Automatic" }
  ]
}
```

---

## Complete Example Request

### JavaScript/Fetch with FormData

```javascript
const createCompetition = async (competitionData, imageFiles = []) => {
  const formData = new FormData();

  // Required fields
  formData.append('title', competitionData.title);
  formData.append('description', competitionData.description);
  formData.append('prize', competitionData.prize);
  formData.append(
    'ticketPricePence',
    competitionData.ticketPricePence.toString()
  );
  formData.append('category', competitionData.category);
  formData.append('drawAt', competitionData.drawAt);

  // Optional fields
  if (competitionData.shortDescription) {
    formData.append('shortDescription', competitionData.shortDescription);
  }
  if (competitionData.prizeValue) {
    formData.append('prizeValue', competitionData.prizeValue.toString());
  }
  if (competitionData.ticketLimit !== undefined) {
    formData.append(
      'ticketLimit',
      competitionData.ticketLimit?.toString() || 'null'
    );
  }
  if (competitionData.status) {
    formData.append('status', competitionData.status);
  }
  if (competitionData.featured !== undefined) {
    formData.append('featured', competitionData.featured.toString());
  }

  // Arrays
  if (competitionData.features) {
    if (Array.isArray(competitionData.features)) {
      formData.append('features', JSON.stringify(competitionData.features));
    } else {
      formData.append('features', competitionData.features);
    }
  }

  if (competitionData.tags) {
    if (Array.isArray(competitionData.tags)) {
      formData.append('tags', JSON.stringify(competitionData.tags));
    } else {
      formData.append('tags', competitionData.tags);
    }
  }

  if (competitionData.specifications) {
    formData.append(
      'specifications',
      JSON.stringify(competitionData.specifications)
    );
  }

  // Question
  if (competitionData.question) {
    formData.append('question', JSON.stringify(competitionData.question));
  }

  // Images
  imageFiles.forEach((file) => {
    formData.append('images', file);
  });

  const response = await fetch('/api/v1/competitions', {
    method: 'POST',
    headers: {
      // Don't set Content-Type header - browser will set it with boundary
      Authorization: `Bearer ${token}`, // If using token auth
    },
    credentials: 'include', // If using cookie auth
    body: formData,
  });

  const data = await response.json();
  return data;
};
```

### React Component Example

```jsx
import { useState } from 'react';

const CreateCompetitionForm = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    prize: '',
    ticketPricePence: '',
    category: '',
    drawAt: '',
    shortDescription: '',
    prizeValue: '',
    ticketLimit: '',
    status: 'draft',
    featured: false,
  });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleImageChange = (e) => {
    setImages(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formDataToSend = new FormData();

      // Required fields
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('prize', formData.prize);
      formDataToSend.append('ticketPricePence', formData.ticketPricePence);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('drawAt', formData.drawAt);

      // Optional fields
      if (formData.shortDescription) {
        formDataToSend.append('shortDescription', formData.shortDescription);
      }
      if (formData.prizeValue) {
        formDataToSend.append('prizeValue', formData.prizeValue);
      }
      if (formData.ticketLimit) {
        formDataToSend.append('ticketLimit', formData.ticketLimit);
      }
      formDataToSend.append('status', formData.status);
      formDataToSend.append('featured', formData.featured.toString());

      // Images
      images.forEach((image) => {
        formDataToSend.append('images', image);
      });

      const response = await fetch('/api/v1/competitions', {
        method: 'POST',
        credentials: 'include', // For cookie auth
        body: formDataToSend,
      });

      const data = await response.json();

      if (data.success) {
        alert('Competition created successfully!');
        // Reset form or redirect
      } else {
        setError(data.message || 'Failed to create competition');
        if (data.errors) {
          console.error('Validation errors:', data.errors);
        }
      }
    } catch (err) {
      setError('An error occurred while creating the competition');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Create Competition</h2>

      {/* Required Fields */}
      <div>
        <label>
          Title * <small>(5-200 characters)</small>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            minLength={5}
            maxLength={200}
          />
        </label>
      </div>

      <div>
        <label>
          Description * <small>(20-5000 characters)</small>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            minLength={20}
            maxLength={5000}
            rows={10}
          />
        </label>
      </div>

      <div>
        <label>
          Prize * <small>(Short description)</small>
          <input
            type="text"
            name="prize"
            value={formData.prize}
            onChange={handleChange}
            required
          />
        </label>
      </div>

      <div>
        <label>
          Ticket Price (Pence) * <small>(e.g., 100 = £1.00, 500 = £5.00)</small>
          <input
            type="number"
            name="ticketPricePence"
            value={formData.ticketPricePence}
            onChange={handleChange}
            required
            min={1}
          />
        </label>
      </div>

      <div>
        <label>
          Category * <small>(Will be created if it doesn't exist)</small>
          <input
            type="text"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
            minLength={2}
            maxLength={100}
          />
        </label>
      </div>

      <div>
        <label>
          Draw Date & Time * <small>(ISO 8601 format)</small>
          <input
            type="datetime-local"
            name="drawAt"
            value={formData.drawAt}
            onChange={handleChange}
            required
          />
        </label>
      </div>

      {/* Optional Fields */}
      <div>
        <label>
          Short Description <small>(Max 280 characters)</small>
          <textarea
            name="shortDescription"
            value={formData.shortDescription}
            onChange={handleChange}
            maxLength={280}
            rows={3}
          />
        </label>
      </div>

      <div>
        <label>
          Prize Value (£) <small>(Optional)</small>
          <input
            type="number"
            name="prizeValue"
            value={formData.prizeValue}
            onChange={handleChange}
            min={0}
          />
        </label>
      </div>

      <div>
        <label>
          Ticket Limit <small>(Leave empty for unlimited)</small>
          <input
            type="number"
            name="ticketLimit"
            value={formData.ticketLimit}
            onChange={handleChange}
            min={10}
            max={100000}
          />
        </label>
      </div>

      <div>
        <label>
          Status
          <select name="status" value={formData.status} onChange={handleChange}>
            <option value="draft">Draft</option>
            <option value="live">Live</option>
            <option value="closed">Closed</option>
          </select>
        </label>
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            name="featured"
            checked={formData.featured}
            onChange={handleChange}
          />
          Featured Competition
        </label>
      </div>

      <div>
        <label>
          Images <small>(Multiple images allowed)</small>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageChange}
          />
        </label>
      </div>

      {error && <div className="error">{error}</div>}

      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Competition'}
      </button>
    </form>
  );
};

export default CreateCompetitionForm;
```

---

## Response

### Success Response (201 Created)

```json
{
  "success": true,
  "message": "Competition created successfully",
  "data": {
    "competition": {
      "_id": "competition_id",
      "title": "Win a Luxury Car - Mercedes-Benz C-Class",
      "description": "Enter now for your chance to win...",
      "prize": "Mercedes-Benz C-Class",
      "ticketPricePence": 100,
      "category": "Luxury Cars",
      "drawAt": "2024-12-31T23:59:59.000Z",
      "status": "draft",
      "images": [
        {
          "url": "https://res.cloudinary.com/.../image.jpg",
          "publicId": "royal-competitions/...",
          "thumbnail": "https://res.cloudinary.com/.../thumb.jpg"
        }
      ],
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

### Error Responses

#### 400 Bad Request - Missing Required Fields

```json
{
  "success": false,
  "message": "Missing required fields"
}
```

#### 400 Bad Request - Ticket Price Required

```json
{
  "success": false,
  "message": "Ticket price is required"
}
```

#### 422 Validation Failed

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "title": ["Title must be at least 5 characters"],
    "ticketPricePence": ["ticketPricePence is required"],
    "drawAt": ["drawAt is required"],
    "description": ["Description must be at least 20 characters"]
  }
}
```

#### 401 Unauthorized

```json
{
  "success": false,
  "message": "Not authorized"
}
```

---

## Common Errors and Solutions

### Error: "ticketPricePence is required"

**Problem:** The `ticketPricePence` field is missing or not being sent correctly.

**Solutions:**

1. Ensure you're sending `ticketPricePence` (not `ticketPrice` or `price`)
2. Make sure the value is a number (not a string)
3. When using FormData, convert to string: `formData.append('ticketPricePence', '100')`
4. When using JSON, use a number: `"ticketPricePence": 100`

**Example Fix:**

```javascript
// ❌ Wrong
formData.append('ticketPrice', '100');
formData.append('price', '100');

// ✅ Correct
formData.append('ticketPricePence', '100');
```

### Error: "drawAt is required"

**Problem:** The `drawAt` field is missing or in wrong format.

**Solutions:**

1. Ensure you're sending `drawAt` (not `drawDate` or `draw_time`)
2. Use ISO 8601 format: `"2024-12-31T23:59:59.000Z"`
3. When using `datetime-local` input, convert to ISO format:
   ```javascript
   const drawAt = new Date(formData.drawAt).toISOString();
   formData.append('drawAt', drawAt);
   ```

**Example Fix:**

```javascript
// ❌ Wrong
formData.append('drawDate', '2024-12-31');
formData.append('drawAt', '2024-12-31'); // Missing time

// ✅ Correct
formData.append('drawAt', '2024-12-31T23:59:59.000Z');
// Or
const date = new Date('2024-12-31T23:59:59');
formData.append('drawAt', date.toISOString());
```

### Error: "Validation failed" with multiple field errors

**Problem:** Multiple required fields are missing or invalid.

**Solutions:**

1. Check all required fields are present:
   - `title` (5-200 chars)
   - `description` (20-5000 chars)
   - `prize`
   - `ticketPricePence` (number, min 1)
   - `category` (2-100 chars)
   - `drawAt` (valid date)
2. Verify field names match exactly (case-sensitive)
3. Check data types (numbers vs strings)
4. Validate character limits

### Error: Images not uploading

**Problem:** Images aren't being sent correctly.

**Solutions:**

1. Use `FormData` (not JSON) when uploading images
2. Don't set `Content-Type` header manually (browser sets it with boundary)
3. Use field name `images` (plural) for multiple files
4. Ensure files are actual File objects, not base64 strings

**Example Fix:**

```javascript
// ❌ Wrong
const data = { images: base64String }; // Can't send base64 in FormData like this

// ✅ Correct
const formData = new FormData();
formData.append('images', file1); // File object from input
formData.append('images', file2);
```

---

## Field Conversion Guide

### Converting Price from Pounds to Pence

```javascript
// User enters: £5.00
const priceInPounds = 5.0;
const priceInPence = Math.round(priceInPence * 100); // 500

// User enters: £10.50
const priceInPounds = 10.5;
const priceInPence = Math.round(priceInPence * 100); // 1050
```

### Converting Date from datetime-local to ISO

```javascript
// HTML input: <input type="datetime-local" name="drawAt" />
const localDateTime = '2024-12-31T23:59';
const isoDateTime = new Date(localDateTime).toISOString();
// Result: "2024-12-31T23:59:00.000Z"
```

### Handling Arrays in FormData

```javascript
// Option 1: JSON string
formData.append('features', JSON.stringify(['Feature 1', 'Feature 2']));

// Option 2: Comma-separated (if backend supports it)
formData.append('tags', 'tag1, tag2, tag3');
```

---

## Complete Field Reference Table

| Field                     | Type         | Required | Min | Max    | Format    | Notes                             |
| ------------------------- | ------------ | -------- | --- | ------ | --------- | --------------------------------- |
| `title`                   | String       | ✅       | 5   | 200    | -         | Competition title                 |
| `description`             | String       | ✅       | 20  | 5000   | -         | Full description                  |
| `prize`                   | String       | ✅       | -   | -      | -         | Prize name                        |
| `ticketPricePence`        | Number       | ✅       | 1   | -      | Integer   | Price in pence                    |
| `category`                | String       | ✅       | 2   | 100    | -         | Category name                     |
| `drawAt`                  | Date/String  | ✅       | -   | -      | ISO 8601  | Draw date/time                    |
| `shortDescription`        | String       | ❌       | -   | 280    | -         | Brief summary                     |
| `prizeValue`              | Number       | ❌       | 0   | -      | -         | Prize value in £                  |
| `cashAlternative`         | Number       | ❌       | 0   | -      | -         | Cash option in £                  |
| `cashAlternativeDetails`  | String       | ❌       | -   | 500    | -         | Cash option details               |
| `originalPrice`           | Number       | ❌       | 0   | -      | -         | Retail price in £                 |
| `ticketLimit`             | Number/null  | ❌       | 10  | 100000 | -         | Max tickets (null = unlimited)    |
| `ticketsSold`             | Number       | ❌       | 0   | -      | -         | Already sold                      |
| `status`                  | String       | ❌       | -   | -      | Enum      | draft/live/closed/drawn/cancelled |
| `drawMode`                | String       | ❌       | -   | -      | Enum      | automatic/admin_triggered/manual  |
| `featured`                | Boolean      | ❌       | -   | -      | -         | Feature on homepage               |
| `isActive`                | Boolean      | ❌       | -   | -      | -         | Active status                     |
| `startDate`               | Date/String  | ❌       | -   | -      | ISO 8601  | Competition start                 |
| `endDate`                 | Date/String  | ❌       | -   | -      | ISO 8601  | Competition end                   |
| `freeEntryEnabled`        | Boolean      | ❌       | -   | -      | -         | Allow free entries                |
| `noPurchasePostalAddress` | String       | ❌       | -   | -      | -         | Postal address                    |
| `termsUrl`                | String       | ❌       | -   | -      | URI       | Terms URL                         |
| `termsAndConditions`      | String       | ❌       | -   | -      | -         | Terms text                        |
| `features`                | Array/String | ❌       | -   | -      | -         | Key features                      |
| `included`                | Array/String | ❌       | -   | -      | -         | What's included                   |
| `tags`                    | Array/String | ❌       | -   | -      | -         | Tags                              |
| `specifications`          | Array/String | ❌       | -   | -      | JSON      | Specifications                    |
| `question`                | Object/null  | ❌       | -   | -      | JSON      | Skill question                    |
| `images`                  | Files        | ❌       | -   | -      | multipart | Image files                       |
| `slug`                    | String       | ❌       | -   | -      | -         | Auto-generated                    |
| `nextTicketNumber`        | Number       | ❌       | 1   | -      | -         | Starting ticket #                 |

---

## Best Practices

1. **Always validate on frontend first** - Check required fields and formats before submitting
2. **Use FormData for images** - Don't try to send images in JSON
3. **Convert prices correctly** - Always convert pounds to pence (multiply by 100)
4. **Format dates properly** - Use ISO 8601 format for dates
5. **Handle errors gracefully** - Display validation errors to users
6. **Test with minimal data first** - Start with only required fields, then add optional ones
7. **Use proper field names** - Field names are case-sensitive and must match exactly
8. **Handle arrays correctly** - Use JSON.stringify() for complex arrays in FormData

---

## Testing Checklist

Before submitting, ensure:

- [ ] All 6 required fields are present
- [ ] `ticketPricePence` is a number (in pence, not pounds)
- [ ] `drawAt` is a valid ISO 8601 date string
- [ ] `title` is between 5-200 characters
- [ ] `description` is between 20-5000 characters
- [ ] `category` is between 2-100 characters
- [ ] Images are sent as File objects in FormData (if uploading)
- [ ] Arrays are properly formatted (JSON string or comma-separated)
- [ ] Authentication token/cookie is included
- [ ] Content-Type header is not manually set when using FormData

---

## Quick Reference: Minimal Request

The absolute minimum required to create a competition:

```javascript
const formData = new FormData();
formData.append('title', 'Win a Prize');
formData.append(
  'description',
  'This is a detailed description of the competition and prize that is at least 20 characters long.'
);
formData.append('prize', 'Amazing Prize');
formData.append('ticketPricePence', '100'); // £1.00
formData.append('category', 'Other');
formData.append('drawAt', new Date('2024-12-31T23:59:59').toISOString());

fetch('/api/v1/competitions', {
  method: 'POST',
  credentials: 'include',
  body: formData,
});
```
