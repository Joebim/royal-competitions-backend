# About Page Content API Documentation

## Overview

The About Page Content API provides endpoints for managing the "About Us" page content on the Royal Competitions platform. This API allows administrators to create and update the about page content, while public users can retrieve the active about page content.

**Base URL:** `/api/v1`

---

## Table of Contents

1. [Model Schema](#model-schema)
2. [Public Endpoints](#public-endpoints)
3. [Admin Endpoints](#admin-endpoints)
4. [Request/Response Examples](#requestresponse-examples)
5. [Error Handling](#error-handling)
6. [Field Descriptions](#field-descriptions)

---

## Model Schema

### AboutPage Model

The AboutPage model represents the complete about page content structure:

```typescript
interface IAboutPage {
  hero: {
    title: string; // Main hero title
    subtitle: string; // Hero subtitle/description
  };
  story: {
    heading: string; // Story section heading
    paragraphs: string[]; // Array of story paragraphs
  };
  companyDetails: {
    companyName: string; // Legal company name
    tradingAs: string; // Trading name
    companyNumber: string; // Company registration number
    location: string; // Company location
  };
  features: Array<{
    icon: string; // Icon identifier (e.g., 'FaTrophy', 'FaUsers')
    title: string; // Feature title
    description: string; // Feature description
  }>;
  isActive: boolean; // Whether the page is active
  createdAt: Date;
  updatedAt: Date;
  createdBy?: ObjectId; // User who created the page
  updatedBy?: ObjectId; // User who last updated the page
}
```

### Field Constraints

- **Hero Title**: Max 200 characters, required
- **Hero Subtitle**: Max 500 characters, required
- **Story Heading**: Max 200 characters, required
- **Story Paragraphs**: At least 1 paragraph required, each paragraph min 1 character
- **Company Name**: Max 200 characters, required
- **Trading As**: Max 200 characters, required
- **Company Number**: Max 50 characters, required
- **Location**: Max 200 characters, required
- **Features**: At least 1 feature required
  - **Icon**: Max 100 characters, required
  - **Title**: Max 200 characters, required
  - **Description**: Max 500 characters, required

---

## Public Endpoints

### Get About Page Content

Retrieve the active about page content for public display.

**Endpoint:** `GET /api/v1/content/about`

**Access:** Public (no authentication required)

**Response:** Returns the active about page content

#### Response Structure

```json
{
  "success": true,
  "message": "About page content retrieved successfully",
  "data": {
    "about": {
      "_id": "507f1f77bcf86cd799439011",
      "hero": {
        "title": "About Royal Competitions",
        "subtitle": "The UK and Ireland's leading competition company"
      },
      "story": {
        "heading": "Our Story",
        "paragraphs": [
          "Top Gear Autos NI LTD, trading as Royal Competitions, Company Number NI667309. We are the UK and Ireland's leading competition company, dedicated to providing exciting and fair competitions with premium prizes.",
          "Since our inception, we've awarded over £65 million in prizes and created thousands of happy winners. Our commitment to transparency, fairness, and customer satisfaction has made us a trusted name in the competition industry.",
          "We believe in giving back, which is why we've donated over £550,000 to charitable causes across the UK and Ireland, supporting communities and making a positive impact."
        ]
      },
      "companyDetails": {
        "companyName": "Top Gear Autos NI LTD",
        "tradingAs": "Royal Competitions",
        "companyNumber": "NI667309",
        "location": "UK & Ireland"
      },
      "features": [
        {
          "icon": "FaTrophy",
          "title": "Premium Prizes",
          "description": "We offer the most luxurious and exciting prizes in the UK and Ireland."
        },
        {
          "icon": "FaUsers",
          "title": "Trusted by Thousands",
          "description": "Join over 500,000 satisfied customers who trust Royal Competitions."
        },
        {
          "icon": "FaHeart",
          "title": "Charity Support",
          "description": "We've donated over £550,000 to charitable causes across the UK."
        },
        {
          "icon": "FaAward",
          "title": "Award Winning",
          "description": "Recognized as the UK and Ireland's leading competition company."
        }
      ],
      "isActive": true,
      "createdAt": "2025-11-15T10:00:00.000Z",
      "updatedAt": "2025-11-15T14:30:00.000Z"
    }
  }
}
```

#### Error Responses

**404 Not Found** - No active about page found:

```json
{
  "success": false,
  "message": "About page not found",
  "errors": {
    "about": ["About page content is not available"]
  },
  "statusCode": 404
}
```

#### Example Request

```bash
curl -X GET https://api.royalcompetitions.co.uk/api/v1/content/about
```

#### Example Response (JavaScript/TypeScript)

```typescript
const response = await fetch('/api/v1/content/about');
const data = await response.json();

if (data.success) {
  const { hero, story, companyDetails, features } = data.data.about;
  // Use the about page content
}
```

---

## Admin Endpoints

All admin endpoints require authentication with an admin or super admin role.

### Get About Page Content (Admin)

Retrieve the about page content for admin editing. Returns the page even if it's inactive.

**Endpoint:** `GET /api/v1/admin/content/about`

**Access:** Private/Admin

**Headers:**

```
Authorization: Bearer <admin_token>
```

#### Response Structure

```json
{
  "success": true,
  "message": "About page content retrieved successfully",
  "data": {
    "about": {
      "_id": "507f1f77bcf86cd799439011",
      "hero": {
        "title": "About Royal Competitions",
        "subtitle": "The UK and Ireland's leading competition company"
      },
      "story": {
        "heading": "Our Story",
        "paragraphs": [
          "Top Gear Autos NI LTD, trading as Royal Competitions...",
          "Since our inception, we've awarded over £65 million...",
          "We believe in giving back..."
        ]
      },
      "companyDetails": {
        "companyName": "Top Gear Autos NI LTD",
        "tradingAs": "Royal Competitions",
        "companyNumber": "NI667309",
        "location": "UK & Ireland"
      },
      "features": [
        {
          "icon": "FaTrophy",
          "title": "Premium Prizes",
          "description": "We offer the most luxurious and exciting prizes in the UK and Ireland."
        }
        // ... more features
      ],
      "isActive": true,
      "createdAt": "2025-11-15T10:00:00.000Z",
      "updatedAt": "2025-11-15T14:30:00.000Z",
      "createdBy": "507f1f77bcf86cd799439012",
      "updatedBy": "507f1f77bcf86cd799439012"
    }
  }
}
```

**Note:** If no about page exists, the response will be:

```json
{
  "success": true,
  "message": "No about page content found",
  "data": {
    "about": null
  }
}
```

#### Example Request

```bash
curl -X GET https://api.royalcompetitions.co.uk/api/v1/admin/content/about \
  -H "Authorization: Bearer <admin_token>"
```

---

### Create About Page

Create a new about page. If an about page already exists, this will update it instead.

**Endpoint:** `POST /api/v1/admin/content/about`

**Access:** Private/Admin

**Headers:**

```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

#### Request Body

```json
{
  "hero": {
    "title": "About Royal Competitions",
    "subtitle": "The UK and Ireland's leading competition company"
  },
  "story": {
    "heading": "Our Story",
    "paragraphs": [
      "Top Gear Autos NI LTD, trading as Royal Competitions, Company Number NI667309. We are the UK and Ireland's leading competition company, dedicated to providing exciting and fair competitions with premium prizes.",
      "Since our inception, we've awarded over £65 million in prizes and created thousands of happy winners. Our commitment to transparency, fairness, and customer satisfaction has made us a trusted name in the competition industry.",
      "We believe in giving back, which is why we've donated over £550,000 to charitable causes across the UK and Ireland, supporting communities and making a positive impact."
    ]
  },
  "companyDetails": {
    "companyName": "Top Gear Autos NI LTD",
    "tradingAs": "Royal Competitions",
    "companyNumber": "NI667309",
    "location": "UK & Ireland"
  },
  "features": [
    {
      "icon": "FaTrophy",
      "title": "Premium Prizes",
      "description": "We offer the most luxurious and exciting prizes in the UK and Ireland."
    },
    {
      "icon": "FaUsers",
      "title": "Trusted by Thousands",
      "description": "Join over 500,000 satisfied customers who trust Royal Competitions."
    },
    {
      "icon": "FaHeart",
      "title": "Charity Support",
      "description": "We've donated over £550,000 to charitable causes across the UK."
    },
    {
      "icon": "FaAward",
      "title": "Award Winning",
      "description": "Recognized as the UK and Ireland's leading competition company."
    }
  ],
  "isActive": true
}
```

#### Response Structure

**201 Created** (new page) or **200 OK** (updated existing page):

```json
{
  "success": true,
  "message": "About page created successfully",
  "data": {
    "about": {
      "_id": "507f1f77bcf86cd799439011",
      "hero": {
        /* ... */
      },
      "story": {
        /* ... */
      },
      "companyDetails": {
        /* ... */
      },
      "features": [
        /* ... */
      ],
      "isActive": true,
      "createdAt": "2025-11-15T10:00:00.000Z",
      "updatedAt": "2025-11-15T10:00:00.000Z",
      "createdBy": "507f1f77bcf86cd799439012",
      "updatedBy": "507f1f77bcf86cd799439012"
    }
  }
}
```

#### Validation Errors

**422 Unprocessable Entity** - Validation failed:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "hero.title": ["hero.title is required"],
    "hero.subtitle": ["hero.subtitle cannot exceed 500 characters"],
    "story.paragraphs": ["story.paragraphs must contain at least 1 items"],
    "companyDetails.companyNumber": [
      "companyDetails.companyNumber is required"
    ],
    "features": ["features must contain at least 1 items"]
  },
  "statusCode": 422
}
```

#### Example Request

```bash
curl -X POST https://api.royalcompetitions.co.uk/api/v1/admin/content/about \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "hero": {
      "title": "About Royal Competitions",
      "subtitle": "The UK and Ireland'\''s leading competition company"
    },
    "story": {
      "heading": "Our Story",
      "paragraphs": [
        "First paragraph...",
        "Second paragraph...",
        "Third paragraph..."
      ]
    },
    "companyDetails": {
      "companyName": "Top Gear Autos NI LTD",
      "tradingAs": "Royal Competitions",
      "companyNumber": "NI667309",
      "location": "UK & Ireland"
    },
    "features": [
      {
        "icon": "FaTrophy",
        "title": "Premium Prizes",
        "description": "We offer the most luxurious prizes."
      }
    ],
    "isActive": true
  }'
```

---

### Update About Page

Update an existing about page. All fields are optional - only provided fields will be updated.

**Endpoint:** `PUT /api/v1/admin/content/about`

**Access:** Private/Admin

**Headers:**

```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

#### Request Body

All fields are optional. Only include the fields you want to update:

```json
{
  "hero": {
    "title": "Updated Title",
    "subtitle": "Updated Subtitle"
  },
  "story": {
    "heading": "Updated Heading",
    "paragraphs": ["Updated paragraph 1", "Updated paragraph 2"]
  },
  "companyDetails": {
    "companyName": "Updated Company Name",
    "tradingAs": "Updated Trading Name",
    "companyNumber": "NI667309",
    "location": "Updated Location"
  },
  "features": [
    {
      "icon": "FaTrophy",
      "title": "Updated Feature Title",
      "description": "Updated feature description"
    }
  ],
  "isActive": false
}
```

#### Response Structure

**200 OK**:

```json
{
  "success": true,
  "message": "About page updated successfully",
  "data": {
    "about": {
      "_id": "507f1f77bcf86cd799439011",
      "hero": {
        /* updated hero */
      },
      "story": {
        /* updated story */
      },
      "companyDetails": {
        /* updated company details */
      },
      "features": [
        /* updated features */
      ],
      "isActive": false,
      "createdAt": "2025-11-15T10:00:00.000Z",
      "updatedAt": "2025-11-15T15:00:00.000Z",
      "createdBy": "507f1f77bcf86cd799439012",
      "updatedBy": "507f1f77bcf86cd799439012"
    }
  }
}
```

**Note:** If no about page exists, the update will create a new one (same behavior as POST).

#### Example Request

```bash
curl -X PUT https://api.royalcompetitions.co.uk/api/v1/admin/content/about \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "hero": {
      "title": "Updated About Title"
    },
    "isActive": true
  }'
```

#### Example: Partial Update (JavaScript/TypeScript)

```typescript
// Update only the hero section
const updateHero = async (newTitle: string, newSubtitle: string) => {
  const response = await fetch('/api/v1/admin/content/about', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      hero: {
        title: newTitle,
        subtitle: newSubtitle,
      },
    }),
  });

  return await response.json();
};

// Update only company details
const updateCompanyDetails = async (details: CompanyDetails) => {
  const response = await fetch('/api/v1/admin/content/about', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      companyDetails: details,
    }),
  });

  return await response.json();
};
```

---

## Request/Response Examples

### Complete Create Example

```typescript
const createAboutPage = async () => {
  const aboutPageData = {
    hero: {
      title: 'About Royal Competitions',
      subtitle: "The UK and Ireland's leading competition company",
    },
    story: {
      heading: 'Our Story',
      paragraphs: [
        "Top Gear Autos NI LTD, trading as Royal Competitions, Company Number NI667309. We are the UK and Ireland's leading competition company, dedicated to providing exciting and fair competitions with premium prizes.",
        "Since our inception, we've awarded over £65 million in prizes and created thousands of happy winners. Our commitment to transparency, fairness, and customer satisfaction has made us a trusted name in the competition industry.",
        "We believe in giving back, which is why we've donated over £550,000 to charitable causes across the UK and Ireland, supporting communities and making a positive impact.",
      ],
    },
    companyDetails: {
      companyName: 'Top Gear Autos NI LTD',
      tradingAs: 'Royal Competitions',
      companyNumber: 'NI667309',
      location: 'UK & Ireland',
    },
    features: [
      {
        icon: 'FaTrophy',
        title: 'Premium Prizes',
        description:
          'We offer the most luxurious and exciting prizes in the UK and Ireland.',
      },
      {
        icon: 'FaUsers',
        title: 'Trusted by Thousands',
        description:
          'Join over 500,000 satisfied customers who trust Royal Competitions.',
      },
      {
        icon: 'FaHeart',
        title: 'Charity Support',
        description:
          "We've donated over £550,000 to charitable causes across the UK.",
      },
      {
        icon: 'FaAward',
        title: 'Award Winning',
        description:
          "Recognized as the UK and Ireland's leading competition company.",
      },
    ],
    isActive: true,
  };

  const response = await fetch('/api/v1/admin/content/about', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(aboutPageData),
  });

  const result = await response.json();
  return result;
};
```

### Frontend Integration Example (React)

```typescript
import { useState, useEffect } from 'react';

interface AboutPage {
  hero: {
    title: string;
    subtitle: string;
  };
  story: {
    heading: string;
    paragraphs: string[];
  };
  companyDetails: {
    companyName: string;
    tradingAs: string;
    companyNumber: string;
    location: string;
  };
  features: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
}

const useAboutPage = () => {
  const [aboutPage, setAboutPage] = useState<AboutPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAboutPage = async () => {
      try {
        const response = await fetch('/api/v1/content/about');
        const data = await response.json();

        if (data.success) {
          setAboutPage(data.data.about);
        } else {
          setError(data.message || 'Failed to load about page');
        }
      } catch (err) {
        setError('Network error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAboutPage();
  }, []);

  return { aboutPage, loading, error };
};

// Usage in component
const AboutPageComponent = () => {
  const { aboutPage, loading, error } = useAboutPage();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!aboutPage) return <div>About page not found</div>;

  return (
    <div>
      <h1>{aboutPage.hero.title}</h1>
      <p>{aboutPage.hero.subtitle}</p>

      <h2>{aboutPage.story.heading}</h2>
      {aboutPage.story.paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}

      <div>
        <h3>Company Details</h3>
        <p>Company Name: {aboutPage.companyDetails.companyName}</p>
        <p>Trading As: {aboutPage.companyDetails.tradingAs}</p>
        <p>Company Number: {aboutPage.companyDetails.companyNumber}</p>
        <p>Location: {aboutPage.companyDetails.location}</p>
      </div>

      <div>
        <h3>Features</h3>
        {aboutPage.features.map((feature, index) => (
          <div key={index}>
            <h4>{feature.title}</h4>
            <p>{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
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

**Cause:** Missing or invalid authentication token for admin endpoints.

#### 403 Forbidden

```json
{
  "success": false,
  "message": "Access denied. Admin privileges required.",
  "statusCode": 403
}
```

**Cause:** User does not have admin or super admin role.

#### 404 Not Found

```json
{
  "success": false,
  "message": "About page not found",
  "errors": {
    "about": ["About page content is not available"]
  },
  "statusCode": 404
}
```

**Cause:** No active about page exists (public endpoint only).

#### 422 Unprocessable Entity

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "hero.title": ["hero.title is required"],
    "story.paragraphs": ["story.paragraphs must contain at least 1 items"],
    "features": ["features must contain at least 1 items"]
  },
  "statusCode": 422
}
```

**Cause:** Request body validation failed. Check the errors object for specific field issues.

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Internal server error",
  "statusCode": 500
}
```

**Cause:** Unexpected server error. Check server logs for details.

---

## Field Descriptions

### Hero Section

| Field      | Type   | Required | Max Length | Description                                            |
| ---------- | ------ | -------- | ---------- | ------------------------------------------------------ |
| `title`    | string | Yes      | 200        | Main hero title displayed at the top of the about page |
| `subtitle` | string | Yes      | 500        | Subtitle or tagline displayed below the title          |

### Story Section

| Field        | Type     | Required | Max Length | Description                                                                                                       |
| ------------ | -------- | -------- | ---------- | ----------------------------------------------------------------------------------------------------------------- |
| `heading`    | string   | Yes      | 200        | Heading for the story section (e.g., "Our Story")                                                                 |
| `paragraphs` | string[] | Yes      | -          | Array of paragraph strings. Minimum 1 paragraph required. Each paragraph can be any length but must not be empty. |

### Company Details

| Field           | Type   | Required | Max Length | Description                                       |
| --------------- | ------ | -------- | ---------- | ------------------------------------------------- |
| `companyName`   | string | Yes      | 200        | Legal registered company name                     |
| `tradingAs`     | string | Yes      | 200        | Trading name or brand name                        |
| `companyNumber` | string | Yes      | 50         | Company registration number (e.g., "NI667309")    |
| `location`      | string | Yes      | 200        | Company location or region (e.g., "UK & Ireland") |

### Features

| Field         | Type   | Required | Max Length | Description                                                                                                                          |
| ------------- | ------ | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `icon`        | string | Yes      | 100        | Icon identifier (e.g., "FaTrophy", "FaUsers", "FaHeart", "FaAward"). This should match the icon component name used in the frontend. |
| `title`       | string | Yes      | 200        | Feature title or heading                                                                                                             |
| `description` | string | Yes      | 500        | Feature description text                                                                                                             |

**Note:** The `features` array must contain at least 1 feature.

### General Fields

| Field      | Type    | Required | Description                                                                                     |
| ---------- | ------- | -------- | ----------------------------------------------------------------------------------------------- |
| `isActive` | boolean | No       | Whether the about page is active and visible to public users. Defaults to `true` when creating. |

---

## Important Notes

### Singleton Pattern

The About Page follows a singleton pattern - there is only **one** about page in the system. When you:

- **POST** to create: If a page already exists, it will be updated instead
- **PUT** to update: If no page exists, it will be created

This ensures there's always at most one about page, simplifying content management.

### Active vs Inactive Pages

- **Public endpoint** (`GET /api/v1/content/about`): Only returns pages where `isActive: true`
- **Admin endpoint** (`GET /api/v1/admin/content/about`): Returns the page regardless of `isActive` status

### Icon Identifiers

The `icon` field in features should match the icon component names used in your frontend. Common examples:

- `FaTrophy` - Trophy icon
- `FaUsers` - Users icon
- `FaHeart` - Heart icon
- `FaAward` - Award icon
- `FaStar` - Star icon
- `FaShield` - Shield icon

Make sure the frontend can map these identifiers to actual icon components.

### Partial Updates

When using `PUT` to update, you can provide only the fields you want to update. All other fields will remain unchanged. For example:

```json
{
  "hero": {
    "title": "New Title"
  }
}
```

This will only update the hero title, leaving all other fields (subtitle, story, companyDetails, features) unchanged.

### Paragraphs Array

The `story.paragraphs` field is an array of strings. Each string represents one paragraph. The frontend should render these as separate paragraphs. For example:

```json
{
  "paragraphs": [
    "First paragraph text.",
    "Second paragraph text.",
    "Third paragraph text."
  ]
}
```

---

## Best Practices

1. **Always validate on frontend**: Even though the API validates, validate on the frontend for better UX
2. **Handle loading states**: Show loading indicators while fetching about page content
3. **Error handling**: Always handle 404 errors gracefully (about page might not exist yet)
4. **Icon mapping**: Ensure your frontend has a mapping from icon identifiers to actual icon components
5. **Content preview**: For admin, consider showing a preview of how the page will look before publishing
6. **Version control**: Consider keeping a history of changes for content auditing

---

## Support

For issues or questions regarding the About Page Content API, please contact the development team or refer to the main API documentation.

---

**Last Updated:** November 15, 2025  
**API Version:** v1
