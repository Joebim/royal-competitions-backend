# Content Management UI Documentation

This document provides detailed UI specifications for managing Legal Pages (Terms & Conditions, Terms of Use, Acceptable Use, Privacy Policy) and FAQs in the admin panel.

---

## Legal Pages Management

### Overview
Legal pages are structured documents with multiple sections. Each section can contain headings, body paragraphs, and optional lists.

**Data Structure:**
- **Slug**: URL-friendly identifier (e.g., "terms-and-conditions", "privacy-policy")
- **Title**: Main page title (max 200 characters)
- **Subtitle**: Optional subtitle (max 500 characters)
- **Sections**: Array of section objects, each containing:
  - **Heading**: Section heading (max 200 characters)
  - **Body**: Array of paragraph strings (at least one required)
  - **List** (optional): Object with:
    - **Title**: Optional list title (max 200 characters)
    - **Items**: Array of list item strings (at least one required)
- **Is Active**: Boolean to show/hide the page

---

## Page 1: Legal Pages List

**Route:** `/admin/content/legal-pages`

### Layout
- **Header Section:**
  - Page title: "Legal Pages"
  - "Create New Page" button (top right, primary style)
  - Breadcrumb: Admin > Content > Legal Pages

### Main Content Area

**Table/List View:**
Display all legal pages in a table with the following columns:

1. **Title** (sortable)
   - Display the page title
   - Clickable to edit

2. **Slug** (sortable)
   - Display the slug (e.g., "terms-and-conditions")
   - Monospace font, muted color

3. **Status**
   - Badge showing "Active" (green) or "Inactive" (gray)
   - Toggle switch to quickly activate/deactivate

4. **Last Updated**
   - Display formatted date (e.g., "Jan 15, 2024")
   - Show relative time on hover (e.g., "2 days ago")

5. **Actions**
   - "Edit" button (icon: pencil)
   - "View" button (icon: eye) - opens public page in new tab
   - "Delete" button (icon: trash) - with confirmation

**Empty State:**
If no pages exist, show:
- Illustration/icon
- Message: "No legal pages yet"
- "Create Your First Page" button

**Search/Filter:**
- Search bar at top to filter by title or slug
- Filter dropdown for status (All, Active, Inactive)

---

## Page 2: Create Legal Page

**Route:** `/admin/content/legal-pages/create`

### Layout
- **Header Section:**
  - Page title: "Create Legal Page"
  - "Cancel" button (secondary style, left side)
  - "Save Draft" button (secondary style, right side)
  - "Publish" button (primary style, right side)
  - Breadcrumb: Admin > Content > Legal Pages > Create

### Form Structure

**Section 1: Basic Information**
- **Page Slug** (required)
  - Input field with label
  - Helper text: "URL-friendly identifier (lowercase, numbers, hyphens only)"
  - Auto-generate from title on blur (optional toggle)
  - Validation: lowercase, alphanumeric + hyphens
  - Show error if slug already exists

- **Page Title** (required)
  - Input field
  - Max length: 200 characters
  - Character counter

- **Subtitle** (optional)
  - Textarea (2-3 rows)
  - Max length: 500 characters
  - Character counter

- **Status Toggle**
  - Switch: "Active" / "Inactive"
  - Default: Active
  - Helper text: "Inactive pages won't be visible to users"

**Section 2: Page Sections**

**Section Management:**
- "Add Section" button at top
- Each section displayed as a card/accordion

**Section Card Layout:**
For each section, display:

1. **Section Header**
   - Drag handle (for reordering)
   - Section number (e.g., "Section 1")
   - "Delete Section" button (icon: trash, right side)
   - Collapse/expand toggle

2. **Section Heading** (required)
   - Input field
   - Placeholder: "Enter section heading"
   - Max length: 200 characters
   - Character counter

3. **Section Body** (required)
   - Textarea for each paragraph
   - "Add Paragraph" button below textarea
   - Each paragraph displayed as separate textarea
   - "Remove" button for each paragraph (except the first)
   - Minimum: 1 paragraph required
   - Helper text: "Each paragraph will be displayed as a separate block"

4. **Optional List**
   - Toggle: "Include List"
   - When enabled, show:
     - **List Title** (optional)
       - Input field
       - Placeholder: "List title (optional)"
       - Max length: 200 characters
     - **List Items**
       - Textarea for each item
       - "Add List Item" button
       - "Remove" button for each item (except the first)
       - Minimum: 1 item if list is enabled

**Section Actions:**
- "Add Section" button at bottom of sections list
- Drag and drop to reorder sections
- Visual feedback when dragging

**Validation:**
- Show validation errors inline
- Disable "Publish" button if form is invalid
- Highlight required fields that are empty

---

## Page 3: Edit Legal Page

**Route:** `/admin/content/legal-pages/:slug/edit`

### Layout
- **Header Section:**
  - Page title: "Edit Legal Page" (with page title in subtitle)
  - "Cancel" button (secondary style, left side)
  - "Save Changes" button (primary style, right side)
  - "View Page" button (secondary style, opens public page)
  - Breadcrumb: Admin > Content > Legal Pages > [Page Title] > Edit

### Form Structure
Same as Create Page, but:
- Pre-populate all fields with existing data
- Show "Last Updated" timestamp
- Show "Created By" and "Updated By" user info (if available)
- Slug field should be read-only or disabled (slug cannot be changed after creation)

**Additional Features:**
- "Preview" button to see how page will look
- "History" button to view edit history (if implemented)
- Delete button in header (with confirmation modal)

---

## Page 4: Preview Legal Page

**Route:** `/admin/content/legal-pages/:slug/preview`

### Layout
Display the page exactly as it will appear to users:
- Same styling as public-facing page
- Show "Active" or "Inactive" badge at top
- "Back to Edit" button
- "View Public Page" button (if active)

---

## FAQs Management

### Overview
FAQs are organized by category and can be ordered within each category.

**Data Structure:**
- **ID**: Unique identifier (format: "faq-001", "faq-002", etc.)
- **Question**: FAQ question (max 500 characters)
- **Answer**: FAQ answer (max 5000 characters)
- **Category**: One of: General, Competitions, Draws, Payments, Account, Prizes, Technical
- **Order**: Number for sorting within category (default: 0)
- **Is Active**: Boolean to show/hide the FAQ

---

## Page 5: FAQs List

**Route:** `/admin/content/faqs`

### Layout
- **Header Section:**
  - Page title: "Frequently Asked Questions"
  - "Create New FAQ" button (top right, primary style)
  - Breadcrumb: Admin > Content > FAQs

### Main Content Area

**Category Tabs/Filter:**
- Tabs or filter buttons for each category:
  - All
  - General
  - Competitions
  - Draws
  - Payments
  - Account
  - Prizes
  - Technical

**Table/List View:**
Display FAQs in a table with the following columns:

1. **ID** (sortable)
   - Display FAQ ID (e.g., "faq-001")
   - Monospace font

2. **Question** (sortable)
   - Display question text (truncated if long)
   - Clickable to edit
   - Show full question on hover

3. **Category**
   - Badge with category name
   - Color-coded by category

4. **Order**
   - Display order number
   - Editable inline or via drag handle

5. **Status**
   - Badge showing "Active" (green) or "Inactive" (gray)
   - Toggle switch to quickly activate/deactivate

6. **Actions**
   - "Edit" button (icon: pencil)
   - "Delete" button (icon: trash) - with confirmation

**Sorting:**
- Default: Sort by order (ascending), then by creation date (descending)
- Allow drag-and-drop reordering within category view

**Empty State:**
If no FAQs exist (or in selected category):
- Illustration/icon
- Message: "No FAQs yet" or "No FAQs in this category"
- "Create Your First FAQ" button

**Search:**
- Search bar to filter by question or answer text

---

## Page 6: Create FAQ

**Route:** `/admin/content/faqs/create`

### Layout
- **Header Section:**
  - Page title: "Create FAQ"
  - "Cancel" button (secondary style, left side)
  - "Save" button (primary style, right side)
  - Breadcrumb: Admin > Content > FAQs > Create

### Form Structure

**Section 1: Basic Information**

- **FAQ ID** (required)
  - Input field with label
  - Helper text: "Format: faq-XXX (e.g., faq-001, faq-002)"
  - Validation: Must match pattern "faq-XXX" where XXX is 3 digits
  - Show error if ID already exists
  - Auto-suggest next available ID (optional)

- **Question** (required)
  - Textarea (3-4 rows)
  - Placeholder: "Enter the question"
  - Max length: 500 characters
  - Character counter

- **Answer** (required)
  - Rich text editor or large textarea (8-10 rows)
  - Placeholder: "Enter the answer"
  - Max length: 5000 characters
  - Character counter
  - Support for basic formatting (bold, italic, lists, links) if using rich text editor

**Section 2: Organization**

- **Category** (optional)
  - Dropdown/Select field
  - Options:
    - General
    - Competitions
    - Draws
    - Payments
    - Account
    - Prizes
    - Technical
  - Default: None/Empty
  - Helper text: "Categorize this FAQ for better organization"

- **Order** (optional)
  - Number input
  - Default: 0
  - Min: 0
  - Helper text: "Lower numbers appear first. Leave as 0 to add to end."
  - Show preview of position in list

- **Status Toggle**
  - Switch: "Active" / "Inactive"
  - Default: Active
  - Helper text: "Inactive FAQs won't be visible to users"

**Validation:**
- Show validation errors inline
- Disable "Save" button if form is invalid
- Highlight required fields that are empty

---

## Page 7: Edit FAQ

**Route:** `/admin/content/faqs/:id/edit`

### Layout
- **Header Section:**
  - Page title: "Edit FAQ"
  - "Cancel" button (secondary style, left side)
  - "Save Changes" button (primary style, right side)
  - "Delete" button (danger style, right side, with confirmation)
  - Breadcrumb: Admin > Content > FAQs > [FAQ ID] > Edit

### Form Structure
Same as Create FAQ, but:
- Pre-populate all fields with existing data
- FAQ ID field should be read-only or disabled (ID cannot be changed after creation)
- Show "Last Updated" timestamp
- Show "Created By" and "Updated By" user info (if available)

**Additional Features:**
- "Preview" button to see how FAQ will appear
- "View in List" button to go back to FAQs list

---

## Common UI Components & Patterns

### Form Validation
- Real-time validation as user types
- Show error messages below fields
- Highlight invalid fields with red border
- Disable submit button until form is valid

### Loading States
- Show loading spinner when fetching data
- Disable buttons during save operations
- Show "Saving..." text on save button

### Success/Error Messages
- Toast notifications for successful saves
- Error messages for failed operations
- Inline validation errors in forms

### Confirmation Dialogs
- For delete operations, show confirmation dialog:
  - Title: "Delete [Item Name]?"
  - Message: "This action cannot be undone."
  - "Cancel" and "Delete" buttons

### Responsive Design
- All pages should be mobile-responsive
- Tables should scroll horizontally on mobile or convert to card layout
- Forms should stack vertically on mobile

### Accessibility
- All interactive elements should be keyboard accessible
- Proper ARIA labels for screen readers
- Focus indicators on interactive elements
- Color contrast meets WCAG standards

---

## API Endpoints Reference

### Legal Pages

**List Pages:**
- `GET /api/v1/admin/content/pages`
- Returns: Array of all legal pages

**Get Single Page:**
- `GET /api/v1/admin/content/pages/:slug`
- Returns: Single legal page object

**Create Page:**
- `POST /api/v1/admin/content/pages`
- Body: `{ slug, title, subtitle, sections, isActive }`
- Returns: Created page object

**Update Page:**
- `PUT /api/v1/admin/content/pages/:slug`
- Body: `{ title?, subtitle?, sections?, isActive? }`
- Returns: Updated page object

**Delete Page:**
- `DELETE /api/v1/admin/content/pages/:slug`
- Returns: Success message

### FAQs

**List FAQs:**
- `GET /api/v1/admin/content/faqs`
- Returns: Array of all FAQs

**Get Single FAQ:**
- `GET /api/v1/admin/content/faqs/:id`
- Returns: Single FAQ object

**Create FAQ:**
- `POST /api/v1/admin/content/faqs`
- Body: `{ id, question, answer, category?, order?, isActive? }`
- Returns: Created FAQ object

**Update FAQ:**
- `PUT /api/v1/admin/content/faqs/:id`
- Body: `{ question?, answer?, category?, order?, isActive? }`
- Returns: Updated FAQ object

**Delete FAQ:**
- `DELETE /api/v1/admin/content/faqs/:id`
- Returns: Success message

---

## Example Data Structures

### Legal Page Example
```json
{
  "slug": "terms-and-conditions",
  "title": "Terms and Conditions",
  "subtitle": "Please read these terms carefully before using our service",
  "sections": [
    {
      "heading": "1. Acceptance of Terms",
      "body": [
        "By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement.",
        "If you do not agree to abide by the above, please do not use this service."
      ],
      "list": {
        "title": "You agree to:",
        "items": [
          "Provide accurate information",
          "Use the service legally",
          "Respect other users"
        ]
      }
    },
    {
      "heading": "2. User Responsibilities",
      "body": [
        "Users are responsible for maintaining the confidentiality of their account information."
      ]
    }
  ],
  "isActive": true
}
```

### FAQ Example
```json
{
  "id": "faq-001",
  "question": "How do competitions work?",
  "answer": "Competitions are skill-based contests where participants purchase tickets and answer a question. Winners are selected through a fair and transparent draw process.",
  "category": "Competitions",
  "order": 1,
  "isActive": true
}
```

---

## Notes for Frontend Developers

1. **Slug Generation**: Consider auto-generating slugs from titles, but allow manual override
2. **Section Management**: Implement drag-and-drop for reordering sections
3. **Rich Text Editor**: Consider using a WYSIWYG editor for FAQ answers if formatting is needed
4. **Auto-save**: Consider implementing auto-save/draft functionality for long-form content
5. **Preview**: Always provide preview functionality before publishing
6. **Validation**: Validate on both client and server side
7. **Error Handling**: Handle network errors gracefully with retry options
8. **Optimistic Updates**: Consider showing changes immediately before server confirmation

