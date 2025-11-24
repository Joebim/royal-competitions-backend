# Date-Time Format Guide for Frontend

## Overview

This guide explains how to format and send date-time values to the Royal Competitions backend API. The backend stores all dates in UTC and **supports ALL timezones**. When you send a date with a timezone offset, it will be correctly converted to UTC regardless of which timezone you use.

**Important:** The backend is **fully timezone-agnostic** when timezone information is provided. The UK timezone assumption is only a fallback when no timezone is specified.

---

## Recommended Format: ISO 8601 with Timezone

**Always use ISO 8601 format with timezone offset:**

```
YYYY-MM-DDTHH:mm:ss±HH:mm
```

### Examples

✅ **Correct Formats (ALL TIMEZONES SUPPORTED):**

```javascript
// UK time (GMT - UTC+0) - Winter time
'2025-11-22T21:45:00+00:00';

// UK time (BST - UTC+1) - Summer time
'2025-06-22T21:45:00+01:00';

// India Standard Time (IST - UTC+5:30)
'2025-11-22T21:45:00+05:30';

// Pacific Standard Time (PST - UTC-8:00)
'2025-11-22T21:45:00-08:00';

// Eastern Standard Time (EST - UTC-5:00)
'2025-11-22T21:45:00-05:00';

// Central European Time (CET - UTC+1:00)
'2025-11-22T21:45:00+01:00';

// With milliseconds (also accepted)
'2025-11-22T21:45:00.000+00:00';

// UTC explicitly
'2025-11-22T21:45:00Z';
```

**Note:** The backend supports **ANY timezone offset**. Just include the `±HH:mm` offset and it will be correctly converted to UTC.

❌ **Avoid These Formats:**

```javascript
// No timezone - will be assumed as UK time (works but not recommended)
'2025-11-22T21:45:00';

// Date only - will be treated as midnight UK time
'2025-11-22';

// Non-standard formats
'11/22/2025 21:45';
'2025-11-22 21:45:00';
```

---

## Timezone Support

### ✅ Full Timezone Support

**The backend supports ALL timezones!** When you send a date with a timezone offset, it will be correctly converted to UTC regardless of which timezone you use.

**Examples of supported timezones:**

```javascript
// Any timezone works - just include the offset
'2025-11-22T21:45:00+05:30'; // India (IST)
'2025-11-22T21:45:00-08:00'; // Pacific (PST/PDT)
'2025-11-22T21:45:00-05:00'; // Eastern (EST/EDT)
'2025-11-22T21:45:00+01:00'; // Central European (CET/CEST)
'2025-11-22T21:45:00+09:00'; // Japan (JST)
'2025-11-22T21:45:00+00:00'; // UK (GMT)
'2025-11-22T21:45:00+01:00'; // UK (BST)
// ... and any other timezone!
```

**How it works:**

1. You send a date with timezone offset (e.g., `2025-11-22T21:45:00+05:30`)
2. Backend converts it to UTC automatically
3. Stored in database as UTC
4. Returned in ISO format (UTC)

**The system is fully timezone-agnostic when timezone information is provided.**

### Fallback: UK Timezone

**Only when NO timezone is provided**, the backend assumes UK timezone as a convenience fallback:

```javascript
// No timezone - assumes UK timezone
'2025-11-22T21:45:00'; // Treated as UK time (GMT or BST depending on date)
```

This fallback is designed for the primary market (UK), but **we recommend always including timezone offsets** for clarity and reliability.

---

## UK Timezone Considerations

The application operates in **UK timezone (Europe/London)**, which has two states:

1. **GMT (Greenwich Mean Time)** - UTC+0 (Winter, typically October-March)
2. **BST (British Summer Time)** - UTC+1 (Summer, typically March-October)

### How to Determine Offset

**Option 1: Use JavaScript's Intl API (Recommended)**

```javascript
function getUKTimezoneOffset(date) {
  const formatter = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/London',
    timeZoneName: 'shortOffset',
  });

  const parts = formatter.formatToParts(date);
  const offsetPart = parts.find((part) => part.type === 'timeZoneName');

  // Returns "+00" or "+01" typically
  return offsetPart?.value || '+00:00';
}

// Usage
const date = new Date('2025-11-22T21:45:00');
const offset = getUKTimezoneOffset(date); // "+00" for GMT, "+01" for BST
const isoString = date.toISOString().replace('Z', offset + ':00');
```

**Option 2: Use a Library (date-fns-tz, moment-timezone, etc.)**

```javascript
import { formatInTimeZone } from 'date-fns-tz';

const date = new Date('2025-11-22T21:45:00');
const ukDate = formatInTimeZone(
  date,
  'Europe/London',
  "yyyy-MM-dd'T'HH:mm:ssXXX"
);
// Returns: "2025-11-22T21:45:00+00:00" or "2025-11-22T21:45:00+01:00"
```

**Option 3: Simple Helper Function**

```javascript
function toUKISOString(date) {
  // Get the date components in UK timezone
  const ukDate = new Date(
    date.toLocaleString('en-US', { timeZone: 'Europe/London' })
  );
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));

  // Calculate offset
  const offsetMs = ukDate.getTime() - utcDate.getTime();
  const offsetHours = Math.floor(Math.abs(offsetMs) / (1000 * 60 * 60));
  const offsetMinutes = Math.floor(
    (Math.abs(offsetMs) % (1000 * 60 * 60)) / (1000 * 60)
  );
  const offsetSign = offsetMs >= 0 ? '+' : '-';
  const offset = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;

  // Format as ISO with offset
  const year = ukDate.getFullYear();
  const month = String(ukDate.getMonth() + 1).padStart(2, '0');
  const day = String(ukDate.getDate()).padStart(2, '0');
  const hours = String(ukDate.getHours()).padStart(2, '0');
  const minutes = String(ukDate.getMinutes()).padStart(2, '0');
  const seconds = String(ukDate.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offset}`;
}
```

---

## Frontend Implementation Examples

### React with TypeScript

```typescript
import React, { useState } from 'react';

interface CompetitionFormData {
  title: string;
  startDate: string;
  endDate: string;
  drawDate: string;
}

const CompetitionForm: React.FC = () => {
  const [formData, setFormData] = useState<CompetitionFormData>({
    title: '',
    startDate: '',
    endDate: '',
    drawDate: '',
  });

  // Helper to format date input value to UK ISO string
  const formatDateToUKISO = (dateInput: string): string => {
    if (!dateInput) return '';

    // dateInput is from <input type="datetime-local"> format: "2025-11-22T21:45"
    const date = new Date(dateInput);

    // Convert to UK timezone ISO string
    const ukDate = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/London' }));
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));

    const offsetMs = ukDate.getTime() - utcDate.getTime();
    const offsetHours = Math.floor(Math.abs(offsetMs) / (1000 * 60 * 60));
    const offsetMinutes = Math.floor((Math.abs(offsetMs) % (1000 * 60 * 60)) / (1000 * 60));
    const offsetSign = offsetMs >= 0 ? '+' : '-';
    const offset = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;

    const year = ukDate.getFullYear();
    const month = String(ukDate.getMonth() + 1).padStart(2, '0');
    const day = String(ukDate.getDate()).padStart(2, '0');
    const hours = String(ukDate.getHours()).padStart(2, '0');
    const minutes = String(ukDate.getMinutes()).padStart(2, '0');
    const seconds = String(ukDate.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offset}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      startDate: formatDateToUKISO(formData.startDate),
      endDate: formatDateToUKISO(formData.endDate),
      drawDate: formatDateToUKISO(formData.drawDate),
    };

    const response = await fetch('/api/v1/admin/competitions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // Handle response...
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="datetime-local"
        value={formData.startDate}
        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
      />
      {/* Other fields... */}
    </form>
  );
};
```

### Using date-fns-tz (Recommended Library)

```typescript
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

// Convert date to UK timezone ISO string
function toUKISOString(date: Date): string {
  return formatInTimeZone(date, 'Europe/London', "yyyy-MM-dd'T'HH:mm:ssXXX");
}

// Usage in form submission
const payload = {
  startDate: toUKISOString(new Date(formData.startDate)),
  endDate: toUKISOString(new Date(formData.endDate)),
  drawDate: toUKISOString(new Date(formData.drawDate)),
};
```

### Vanilla JavaScript

```javascript
// Utility function
function formatDateForAPI(dateInput) {
  // dateInput can be a Date object, ISO string, or datetime-local input value
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

  // Get UK timezone offset
  const ukFormatter = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = ukFormatter.formatToParts(date);
  const year = parts.find((p) => p.type === 'year').value;
  const month = parts.find((p) => p.type === 'month').value;
  const day = parts.find((p) => p.type === 'day').value;
  const hour = parts.find((p) => p.type === 'hour').value;
  const minute = parts.find((p) => p.type === 'minute').value;
  const second = parts.find((p) => p.type === 'second').value;

  // Get timezone offset
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const ukDate = new Date(
    date.toLocaleString('en-US', { timeZone: 'Europe/London' })
  );
  const offsetMs = ukDate.getTime() - utcDate.getTime();
  const offsetHours = Math.floor(Math.abs(offsetMs) / (1000 * 60 * 60));
  const offsetMinutes = Math.floor(
    (Math.abs(offsetMs) % (1000 * 60 * 60)) / (1000 * 60)
  );
  const offsetSign = offsetMs >= 0 ? '+' : '-';
  const offset = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;

  return `${year}-${month}-${day}T${hour}:${minute}:${second}${offset}`;
}

// Usage
const startDate = formatDateForAPI(document.getElementById('startDate').value);
```

---

## API Request Examples

### Create Competition

```javascript
const createCompetition = async (competitionData) => {
  const payload = {
    title: 'Win £10,000 Cash',
    startDate: '2025-11-22T00:00:00+00:00', // UK timezone
    endDate: '2025-12-22T23:59:59+00:00', // UK timezone
    drawDate: '2025-12-23T20:00:00+00:00', // UK timezone
    // ... other fields
  };

  const response = await fetch('/api/v1/admin/competitions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return response.json();
};
```

### Update Competition

```javascript
const updateCompetition = async (competitionId, updates) => {
  const payload = {
    endDate: '2025-12-25T23:59:59+00:00', // Updated date in UK timezone
    drawDate: '2025-12-26T20:00:00+00:00', // Updated date in UK timezone
    // ... other fields
  };

  const response = await fetch(`/api/v1/admin/competitions/${competitionId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return response.json();
};
```

---

## What Happens If No Timezone Is Provided?

If you send a date **without timezone offset** (e.g., `"2025-11-22T21:45:00"`):

1. ✅ **It will work** - The backend assumes it's UK timezone
2. ⚠️ **Not recommended** - Explicit timezone is clearer and more reliable
3. 🔄 **Automatic conversion** - Backend converts to UTC based on UK timezone rules

**Example:**

```javascript
// Sent without timezone
'2025-11-22T21:45:00';

// Backend treats as UK time (GMT in November)
// Stored as: 2025-11-22T21:45:00Z (UTC)

// Returned as: 2025-11-22T21:45:00.000Z
```

---

## Best Practices

### ✅ DO:

1. **Always include timezone offset** in date strings
2. **Use ANY timezone** - the backend supports all timezones (India, US, Europe, etc.)
3. **Use ISO 8601 format** consistently
4. **Let the backend handle conversion** - it automatically converts any timezone to UTC
5. **Test with different timezones** if your app serves multiple regions

### ❌ DON'T:

1. **Don't send dates without timezone** (works but assumes UK as fallback - not recommended)
2. **Don't manually convert to UTC** - let the backend handle it
3. **Don't use non-standard formats** (MM/DD/YYYY, etc.)
4. **Don't assume a specific timezone** - always include the offset
5. **Don't worry about DST** - the backend handles daylight saving time automatically for all timezones

---

## Testing Examples

### Test Cases

```javascript
// Winter time (GMT - UTC+0)
const winterDate = '2025-11-22T21:45:00+00:00';
// Should be stored and returned as: 2025-11-22T21:45:00.000Z

// Summer time (BST - UTC+1)
const summerDate = '2025-06-22T21:45:00+01:00';
// Should be stored as: 2025-06-22T20:45:00.000Z (UTC)
// Returned as: 2025-06-22T20:45:00.000Z

// Date without timezone (assumed UK)
const noTZDate = '2025-11-22T21:45:00';
// Backend assumes UK timezone and converts accordingly
```

---

## Common Issues and Solutions

### Issue 1: Dates showing one hour off

**Problem:** Date sent as `21:45` but returned as `20:45` or `22:45`

**Solution:** Always include timezone offset. The backend converts to UTC, so ensure you're sending the correct UK timezone.

```javascript
// ❌ Wrong - no timezone
'2025-11-22T21:45:00';

// ✅ Correct - with UK timezone
'2025-11-22T21:45:00+00:00'; // GMT (winter)
'2025-06-22T21:45:00+01:00'; // BST (summer)
```

### Issue 2: Daylight saving time confusion

**Problem:** Dates work in winter but break in summer (or vice versa)

**Solution:** Use a library that handles DST automatically, or use the Intl API:

```javascript
// ✅ Automatically handles GMT/BST
const date = new Date('2025-06-22T21:45:00');
const ukISO = formatInTimeZone(
  date,
  'Europe/London',
  "yyyy-MM-dd'T'HH:mm:ssXXX"
);
```

### Issue 3: Date input from HTML form

**Problem:** `<input type="datetime-local">` doesn't include timezone

**Solution:** Convert the input value to UK timezone ISO string:

```javascript
const inputValue = document.getElementById('startDate').value; // "2025-11-22T21:45"
const date = new Date(inputValue);
const ukISO = formatDateToUKISO(date); // Convert to UK timezone ISO
```

---

## Quick Reference

| Format               | Example                     | Recommended                    |
| -------------------- | --------------------------- | ------------------------------ |
| ISO with timezone    | `2025-11-22T21:45:00+00:00` | ✅ Yes                         |
| ISO with Z (UTC)     | `2025-11-22T21:45:00Z`      | ✅ Yes                         |
| ISO without timezone | `2025-11-22T21:45:00`       | ⚠️ Works but not recommended   |
| Date only            | `2025-11-22`                | ⚠️ Works (treated as midnight) |
| Non-standard         | `11/22/2025`                | ❌ No                          |

---

## Summary

1. **Format:** Always use ISO 8601 with timezone: `YYYY-MM-DDTHH:mm:ss±HH:mm`
2. **Timezone:** **ANY timezone is supported!** Just include the offset (e.g., `+05:30`, `-08:00`, `+01:00`)
3. **Fallback:** If no timezone is provided, UK timezone is assumed (GMT `+00:00` or BST `+01:00`)
4. **Library:** Consider using `date-fns-tz` or similar for reliable timezone handling
5. **Consistency:** Use the same format for all date fields (startDate, endDate, drawDate)

**The backend will:**

- ✅ **Accept dates with ANY timezone offset** - fully timezone-agnostic
- ✅ Convert all dates to UTC for storage (regardless of input timezone)
- ✅ Return dates in ISO format (UTC)
- ✅ Handle daylight saving time automatically for all timezones
- ✅ Fall back to UK timezone only when no timezone is provided

---

**Last Updated:** November 23, 2025
