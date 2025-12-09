# Admin Winners Search API Documentation

## Overview

This document describes the admin endpoint for retrieving winners with advanced search and filtering capabilities, including the ability to search by ticket number or winner name, and retrieve contact information (phone number and address).

---

## Endpoint

**GET** `/api/v1/admin/winners`

**Authentication:** Required (Admin only)

**Description:** Get all winners with advanced filtering and search capabilities. This endpoint allows admins to search for winners by ticket number, claim code, or winner name, and includes contact information (phone number and shipping address) in the response.

---

## Query Parameters

### Pagination

| Parameter | Type   | Required | Default | Description                |
| --------- | ------ | -------- | ------- | -------------------------- |
| `page`    | number | No       | 1       | Page number for pagination |
| `limit`   | number | No       | 20      | Number of items per page   |

### Filters

| Parameter       | Type    | Required | Description                                       |
| --------------- | ------- | -------- | ------------------------------------------------- |
| `competitionId` | string  | No       | Filter winners by competition ID                  |
| `userId`        | string  | No       | Filter winners by user ID                         |
| `notified`      | boolean | No       | Filter by notification status (`true` or `false`) |
| `claimed`       | boolean | No       | Filter by claim status (`true` or `false`)        |

### Search

| Parameter | Type   | Required | Description                                                                                                                                                                                                     |
| --------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search`  | string | No       | Search term that matches:<br>- **Ticket number** (exact match if numeric)<br>- **Claim code** (case-insensitive partial match)<br>- **Winner name** (case-insensitive partial match on first name or last name) |

---

## Search Functionality

The `search` parameter performs a case-insensitive search across multiple fields:

1. **Ticket Number**: If the search term is numeric, it will match exact ticket numbers
2. **Claim Code**: Partial match on claim codes (e.g., "ABCD-1234")
3. **Winner Name**: Searches in both first name and last name fields

**Example Search Queries:**

- `?search=12345` - Finds winners with ticket number 12345
- `?search=ABCD` - Finds winners with claim codes containing "ABCD"
- `?search=John` - Finds winners with first name or last name containing "John"
- `?search=Smith` - Finds winners with first name or last name containing "Smith"

---

## Request Examples

### Get all winners (paginated)

```
GET /api/v1/admin/winners?page=1&limit=20
```

### Search by ticket number

```
GET /api/v1/admin/winners?search=12345
```

### Search by winner name

```
GET /api/v1/admin/winners?search=John
```

### Filter by competition and search

```
GET /api/v1/admin/winners?competitionId=507f1f77bcf86cd799439011&search=12345
```

### Filter by claim status

```
GET /api/v1/admin/winners?claimed=false&notified=true
```

### Combined filters and search

```
GET /api/v1/admin/winners?competitionId=507f1f77bcf86cd799439011&search=John&claimed=false&page=1&limit=10
```

---

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Winners retrieved successfully",
  "data": {
    "winners": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "drawId": {
          "_id": "507f1f77bcf86cd799439012",
          "drawTime": "2024-01-15T10:00:00.000Z",
          "drawMethod": "random",
          "seed": "abc123",
          "algorithm": "SHA-256",
          "snapshotTicketCount": 1000
        },
        "competitionId": {
          "_id": "507f1f77bcf86cd799439013",
          "title": "£10,000 Cash Prize",
          "prize": "£10,000 Cash",
          "prizeValue": 10000,
          "images": [
            {
              "url": "https://example.com/image.jpg",
              "publicId": "image123",
              "thumbnail": "https://example.com/thumb.jpg"
            }
          ]
        },
        "ticketId": {
          "_id": "507f1f77bcf86cd799439014",
          "ticketNumber": 12345
        },
        "userId": {
          "_id": "507f1f77bcf86cd799439015",
          "firstName": "John",
          "lastName": "Smith",
          "email": "john.smith@example.com",
          "phone": "+447123456789"
        },
        "ticketNumber": 12345,
        "prize": "£10,000 Cash",
        "prizeValue": 10000,
        "notified": true,
        "notifiedAt": "2024-01-15T11:00:00.000Z",
        "claimed": false,
        "claimedAt": null,
        "claimCode": "ABCD-1234",
        "verified": true,
        "verifiedAt": "2024-01-15T12:00:00.000Z",
        "publicAnnouncement": "Congratulations to our winner!",
        "proofImageUrl": "https://example.com/proof.jpg",
        "drawVideoUrl": "https://example.com/video.mp4",
        "testimonial": {
          "text": "Amazing experience!",
          "rating": 5,
          "approved": true
        },
        "address": {
          "line1": "123 Main Street",
          "line2": "Apartment 4B",
          "city": "London",
          "postalCode": "SW1A 1AA",
          "country": "GB"
        },
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2024-01-15T12:00:00.000Z"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 150,
    "totalPages": 8
  }
}
```

### Response Fields

#### Winner Object

| Field                | Type    | Description                                          |
| -------------------- | ------- | ---------------------------------------------------- |
| `_id`                | string  | Winner ID                                            |
| `drawId`             | object  | Draw information (ID, time, method, algorithm, etc.) |
| `competitionId`      | object  | Competition information (ID, title, prize, images)   |
| `ticketId`           | object  | Ticket information (ID, ticket number)               |
| `userId`             | object  | **User information including contact details**       |
| `userId.firstName`   | string  | Winner's first name                                  |
| `userId.lastName`    | string  | Winner's last name                                   |
| `userId.email`       | string  | Winner's email address                               |
| `userId.phone`       | string  | **Winner's phone number** (may be null)              |
| `ticketNumber`       | number  | The winning ticket number                            |
| `prize`              | string  | Prize description                                    |
| `prizeValue`         | number  | Prize value in currency                              |
| `notified`           | boolean | Whether winner has been notified                     |
| `notifiedAt`         | date    | When winner was notified                             |
| `claimed`            | boolean | Whether prize has been claimed                       |
| `claimedAt`          | date    | When prize was claimed                               |
| `claimCode`          | string  | Unique claim code for verification                   |
| `verified`           | boolean | Verification status                                  |
| `verifiedAt`         | date    | When winner was verified                             |
| `publicAnnouncement` | string  | Public announcement text                             |
| `proofImageUrl`      | string  | URL to winner proof image                            |
| `drawVideoUrl`       | string  | URL to draw video                                    |
| `testimonial`        | object  | Winner testimonial (if available)                    |
| `address`            | object  | **Shipping address from order** (may be null)        |
| `address.line1`      | string  | Address line 1                                       |
| `address.line2`      | string  | Address line 2 (optional)                            |
| `address.city`       | string  | City                                                 |
| `address.postalCode` | string  | Postal/ZIP code                                      |
| `address.country`    | string  | Country code (default: "GB")                         |
| `createdAt`          | date    | When winner record was created                       |
| `updatedAt`          | date    | When winner record was last updated                  |

---

## Key Features

### 1. Search by Ticket Number

- Enter a numeric value to search for exact ticket number matches
- Example: `?search=12345` finds winner with ticket number 12345

### 2. Search by Winner Name

- Enter any text to search in first name or last name fields
- Case-insensitive partial matching
- Example: `?search=John` finds winners named "John", "Johnson", "Johnny", etc.

### 3. Contact Information

- **Phone Number**: Retrieved from user profile (`userId.phone`)
- **Address**: Retrieved from the order's shipping address (via ticket → order relationship)
- Both fields may be `null` if not available

### 4. Combined Search

- The search parameter checks all three fields (ticket number, claim code, name) simultaneously
- Results include winners matching any of the search criteria

---

## Error Responses

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Not authorized"
}
```

### 403 Forbidden

```json
{
  "success": false,
  "message": "Access denied. Admin privileges required."
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Notes

1. **Phone Number**: May be `null` if the user hasn't provided a phone number in their profile
2. **Address**: May be `null` if:
   - The ticket wasn't purchased through an order
   - The order doesn't have a shipping address
   - The order was a guest checkout without address
3. **Search Performance**: Name searches may be slower on large datasets. Consider using indexes on user name fields for better performance
4. **Pagination**: Always use pagination for large result sets to avoid performance issues
5. **Case Sensitivity**: All text searches are case-insensitive

---

## Use Cases

### Finding a Winner by Ticket Number

```
GET /api/v1/admin/winners?search=12345
```

Useful when a customer provides their ticket number and you need to find their contact details.

### Finding a Winner by Name

```
GET /api/v1/admin/winners?search=John Smith
```

Useful when you have a winner's name but need to find their ticket number, phone, and address.

### Getting Contact Information

After finding a winner through search, the response includes:

- Phone number in `userId.phone`
- Full address in `address` object

This allows admins to contact winners directly without needing to look up information in multiple places.

---

## Example Workflow

1. **Customer calls**: "I won with ticket number 12345, can you send me my prize?"
2. **Admin searches**: `GET /api/v1/admin/winners?search=12345`
3. **Response includes**: Winner details, phone number, and shipping address
4. **Admin can**: Verify the winner and ship the prize to the provided address

---

## Related Endpoints

- `GET /api/v1/admin/winners/:id` - Get specific winner by ID
- `PUT /api/v1/admin/winners/:id` - Update winner information
- `DELETE /api/v1/admin/winners/:id` - Delete winner record

