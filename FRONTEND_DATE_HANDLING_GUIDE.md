# Frontend Date Handling Guide

## Overview

This guide explains how to correctly handle dates received from the Royal Competitions backend API. The backend stores all dates in **UTC** and returns them as ISO strings (e.g., `"2025-11-23T17:00:00.000Z"`).

**Key Principle:** Always work with UTC dates for calculations, then convert to local/UK timezone only for display.

---

## Understanding Backend Date Format

### What the Backend Sends

The backend returns dates in **UTC ISO format**:

```javascript
// Example response from API
{
  "startDate": "2025-11-22T00:00:00.000Z",  // UTC midnight
  "endDate": "2025-12-22T23:59:59.000Z",    // UTC end of day
  "drawDate": "2025-12-23T20:00:00.000Z"   // UTC 8 PM
}
```

**Important:** The `Z` at the end means UTC (Zulu time). This is the correct format.

---

## Common Issues and Solutions

### Issue 1: Time Always One Hour Ahead/Behind

**Problem:** When you create a `Date` object from a UTC string, JavaScript might convert it to local time, causing timezone offset issues.

**Solution:** Always work with UTC timestamps for calculations, then convert to display timezone only when showing to users.

### Issue 2: Date Display Shows Wrong Time

**Problem:** Displaying a UTC date directly shows it in the browser's local timezone, which might not be what you want.

**Solution:** Convert UTC dates to the desired timezone (UK timezone for competitions) before displaying.

---

## Correct Implementation Patterns

### Pattern 1: Time Left Calculation (Countdown Timer)

```typescript
import { useEffect, useState } from 'react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface CountdownTimerProps {
  targetDateISO: string; // UTC ISO string from backend
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDateISO }) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    if (!targetDateISO) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    // Parse the UTC date - this creates a Date object in UTC
    const targetDate = new Date(targetDateISO);

    // Validate the date
    if (isNaN(targetDate.getTime())) {
      console.warn('Invalid target date:', targetDateISO);
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    // Get UTC timestamp (milliseconds since epoch)
    // This is timezone-independent - always UTC
    const targetTimestamp = targetDate.getTime();

    const calculateTimeLeft = () => {
      // Get current UTC time (milliseconds since epoch)
      // Date.now() returns UTC milliseconds - no timezone conversion
      const now = Date.now();

      // Calculate difference in milliseconds
      const difference = targetTimestamp - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / (1000 * 60)) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    // Calculate immediately
    calculateTimeLeft();

    // Update every second
    const timer = setInterval(calculateTimeLeft, 1000);

    // Cleanup
    return () => clearInterval(timer);
  }, [targetDateISO]);

  return (
    <div>
      {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
    </div>
  );
};
```

**Why this works:**

- `new Date(isoString)` correctly parses UTC ISO strings
- `Date.getTime()` returns UTC milliseconds (timezone-independent)
- `Date.now()` returns current UTC milliseconds
- Both are in the same timezone (UTC), so the difference is correct

---

### Pattern 2: Display Date in UK Timezone

```typescript
/**
 * Format a UTC date to UK timezone for display
 * @param utcISOString - UTC ISO string from backend (e.g., "2025-11-23T17:00:00.000Z")
 * @returns Formatted date string in UK timezone
 */
const formatDateToUK = (utcISOString: string): string => {
  if (!utcISOString) return '';

  const date = new Date(utcISOString);

  // Use Intl API to format in UK timezone
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return formatter.format(date);
};

// Usage
const drawDate = '2025-11-23T17:00:00.000Z'; // UTC 5 PM
const ukDate = formatDateToUK(drawDate); // "23/11/2025, 17:00:00" (UK time)
```

**Alternative: Format to readable string**

```typescript
const formatDateToUKReadable = (utcISOString: string): string => {
  if (!utcISOString) return '';

  const date = new Date(utcISOString);

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return formatter.format(date);
};

// Usage
const drawDate = '2025-11-23T17:00:00.000Z';
const readable = formatDateToUKReadable(drawDate);
// "Sunday, 23 November 2025, 05:00 PM" (UK time)
```

---

### Pattern 3: Display Date in User's Local Timezone

```typescript
/**
 * Format a UTC date to user's local timezone for display
 * @param utcISOString - UTC ISO string from backend
 * @returns Formatted date string in user's local timezone
 */
const formatDateToLocal = (utcISOString: string): string => {
  if (!utcISOString) return '';

  const date = new Date(utcISOString);

  // Use Intl API with user's local timezone (default)
  const formatter = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return formatter.format(date);
};
```

---

### Pattern 4: Get Date Components for Display

```typescript
/**
 * Get date components in UK timezone
 * Useful for custom date formatting
 */
interface DateComponents {
  year: number;
  month: number; // 1-12
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
  dayOfWeek: number; // 0-6 (Sunday = 0)
}

const getUKDateComponents = (utcISOString: string): DateComponents | null => {
  if (!utcISOString) return null;

  const date = new Date(utcISOString);

  const formatter = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    weekday: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);

  return {
    year: parseInt(parts.find((p) => p.type === 'year')?.value || '0'),
    month: parseInt(parts.find((p) => p.type === 'month')?.value || '0'),
    day: parseInt(parts.find((p) => p.type === 'day')?.value || '0'),
    hours: parseInt(parts.find((p) => p.type === 'hour')?.value || '0'),
    minutes: parseInt(parts.find((p) => p.type === 'minute')?.value || '0'),
    seconds: parseInt(parts.find((p) => p.type === 'second')?.value || '0'),
    dayOfWeek: parseInt(parts.find((p) => p.type === 'weekday')?.value || '0'),
  };
};
```

---

## Complete Example: Competition Countdown Component

```typescript
import React, { useEffect, useState } from 'react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface CompetitionCountdownProps {
  drawDateISO: string; // UTC ISO string from backend
  endDateISO?: string; // UTC ISO string from backend
}

const CompetitionCountdown: React.FC<CompetitionCountdownProps> = ({
  drawDateISO,
  endDateISO,
}) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const [isExpired, setIsExpired] = useState(false);
  const [displayDate, setDisplayDate] = useState('');

  // Format date for display (UK timezone)
  useEffect(() => {
    if (drawDateISO) {
      const date = new Date(drawDateISO);
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      setDisplayDate(formatter.format(date));
    }
  }, [drawDateISO]);

  // Calculate time left
  useEffect(() => {
    if (!drawDateISO) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setIsExpired(true);
      return;
    }

    const targetDate = new Date(drawDateISO);

    if (isNaN(targetDate.getTime())) {
      console.warn('Invalid draw date:', drawDateISO);
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setIsExpired(true);
      return;
    }

    // Get UTC timestamps (timezone-independent)
    const targetTimestamp = targetDate.getTime();

    const calculateTimeLeft = () => {
      const now = Date.now(); // UTC milliseconds
      const difference = targetTimestamp - now;

      if (difference > 0) {
        setIsExpired(false);
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / (1000 * 60)) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setIsExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [drawDateISO]);

  if (isExpired) {
    return (
      <div>
        <p>Draw has ended</p>
        <p>Draw was on: {displayDate}</p>
      </div>
    );
  }

  return (
    <div>
      <h3>Draw Countdown</h3>
      <p>Draw Date: {displayDate}</p>
      <div className="countdown">
        <div>
          <span>{timeLeft.days}</span>
          <label>Days</label>
        </div>
        <div>
          <span>{String(timeLeft.hours).padStart(2, '0')}</span>
          <label>Hours</label>
        </div>
        <div>
          <span>{String(timeLeft.minutes).padStart(2, '0')}</span>
          <label>Minutes</label>
        </div>
        <div>
          <span>{String(timeLeft.seconds).padStart(2, '0')}</span>
          <label>Seconds</label>
        </div>
      </div>
    </div>
  );
};

export default CompetitionCountdown;
```

---

## Utility Functions Library

Create a `dateUtils.ts` file in your frontend:

```typescript
/**
 * Frontend Date Utilities
 * Handles UTC dates from backend and converts to display timezones
 */

/**
 * Parse UTC ISO string to Date object
 * @param utcISOString - UTC ISO string from backend
 * @returns Date object (in UTC)
 */
export const parseUTCDate = (utcISOString: string): Date | null => {
  if (!utcISOString) return null;
  const date = new Date(utcISOString);
  return isNaN(date.getTime()) ? null : date;
};

/**
 * Format UTC date to UK timezone string
 * @param utcISOString - UTC ISO string from backend
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export const formatToUK = (
  utcISOString: string,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!utcISOString) return '';
  const date = parseUTCDate(utcISOString);
  if (!date) return '';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options,
  };

  return new Intl.DateTimeFormat('en-GB', defaultOptions).format(date);
};

/**
 * Format UTC date to user's local timezone
 * @param utcISOString - UTC ISO string from backend
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export const formatToLocal = (
  utcISOString: string,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!utcISOString) return '';
  const date = parseUTCDate(utcISOString);
  if (!date) return '';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options,
  };

  return new Intl.DateTimeFormat('en-GB', defaultOptions).format(date);
};

/**
 * Calculate time difference between now and target date
 * Returns time left in milliseconds (positive) or time passed (negative)
 * @param targetDateISO - UTC ISO string from backend
 * @returns Difference in milliseconds
 */
export const getTimeDifference = (targetDateISO: string): number => {
  if (!targetDateISO) return 0;
  const targetDate = parseUTCDate(targetDateISO);
  if (!targetDate) return 0;

  const targetTimestamp = targetDate.getTime();
  const now = Date.now();
  return targetTimestamp - now;
};

/**
 * Check if a date has passed
 * @param targetDateISO - UTC ISO string from backend
 * @returns true if date has passed
 */
export const isDatePassed = (targetDateISO: string): boolean => {
  return getTimeDifference(targetDateISO) < 0;
};

/**
 * Get time left components (days, hours, minutes, seconds)
 * @param targetDateISO - UTC ISO string from backend
 * @returns Time left object
 */
export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

export const getTimeLeft = (targetDateISO: string): TimeLeft => {
  const difference = getTimeDifference(targetDateISO);

  if (difference <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 0,
    };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    totalMs: difference,
  };
};

/**
 * Format date to readable string (UK timezone)
 * @param utcISOString - UTC ISO string from backend
 * @returns Readable date string
 */
export const formatDateReadable = (utcISOString: string): string => {
  return formatToUK(utcISOString, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Format date to short string (UK timezone)
 * @param utcISOString - UTC ISO string from backend
 * @returns Short date string (e.g., "23/11/2025, 17:00")
 */
export const formatDateShort = (utcISOString: string): string => {
  return formatToUK(utcISOString, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};
```

**Usage:**

```typescript
import { formatToUK, getTimeLeft, isDatePassed } from './utils/dateUtils';

// Display date
const drawDate = '2025-11-23T17:00:00.000Z';
const displayDate = formatToUK(drawDate); // "23/11/2025, 17:00"

// Check if expired
if (isDatePassed(drawDate)) {
  console.log('Draw has ended');
}

// Get time left
const timeLeft = getTimeLeft(drawDate);
console.log(`${timeLeft.days} days, ${timeLeft.hours} hours left`);
```

---

## Common Mistakes to Avoid

### ❌ Wrong: Using Local Time Methods

```typescript
// DON'T DO THIS
const date = new Date(utcISOString);
const hours = date.getHours(); // This is in LOCAL timezone, not UTC!
const minutes = date.getMinutes(); // This is in LOCAL timezone, not UTC!
```

**Why it's wrong:** `getHours()` and `getMinutes()` return values in the browser's local timezone, not UTC. This causes timezone offset issues.

### ✅ Correct: Use UTC Methods or Intl API

```typescript
// DO THIS
const date = new Date(utcISOString);
const hours = date.getUTCHours(); // UTC hours
const minutes = date.getUTCMinutes(); // UTC minutes

// OR use Intl API for timezone conversion
const formatter = new Intl.DateTimeFormat('en', {
  timeZone: 'Europe/London',
  hour: '2-digit',
  minute: '2-digit',
});
const timeString = formatter.format(date);
```

### ❌ Wrong: Converting to String Without Timezone

```typescript
// DON'T DO THIS
const date = new Date(utcISOString);
const dateString = date.toString(); // Includes local timezone - confusing!
```

### ✅ Correct: Use toISOString() or Intl API

```typescript
// DO THIS
const date = new Date(utcISOString);
const utcString = date.toISOString(); // Always UTC

// OR format for display
const displayString = formatToUK(utcISOString);
```

---

## Testing Your Implementation

### Test Cases

```typescript
// Test 1: UTC date parsing
const utcDate = '2025-11-23T17:00:00.000Z';
const date = new Date(utcDate);
console.log(date.getTime()); // Should be UTC timestamp
console.log(date.toISOString()); // Should match input

// Test 2: Time difference calculation
const now = Date.now();
const target = new Date('2025-11-23T17:00:00.000Z').getTime();
const diff = target - now;
console.log('Difference (ms):', diff);
console.log('Difference (hours):', diff / (1000 * 60 * 60));

// Test 3: UK timezone formatting
const ukTime = formatToUK('2025-11-23T17:00:00.000Z');
console.log('UK time:', ukTime); // Should show UK timezone

// Test 4: Time left calculation
const timeLeft = getTimeLeft('2025-11-23T17:00:00.000Z');
console.log('Time left:', timeLeft);
```

---

## Summary

### Key Principles

1. **Always work with UTC for calculations**
   - Use `Date.getTime()` for timestamps (UTC milliseconds)
   - Use `Date.now()` for current time (UTC milliseconds)
   - Calculate differences in UTC milliseconds

2. **Convert to timezone only for display**
   - Use `Intl.DateTimeFormat` with `timeZone` option
   - Convert to UK timezone for competition dates
   - Convert to user's local timezone for user-specific dates

3. **Never use local time methods for calculations**
   - Don't use `getHours()`, `getMinutes()` for calculations
   - Use `getUTCHours()`, `getUTCMinutes()` if needed
   - Better: use `Intl.DateTimeFormat` for formatting

4. **Parse UTC dates correctly**
   - `new Date(utcISOString)` correctly parses UTC ISO strings
   - The `Z` suffix means UTC - JavaScript handles it correctly

### Quick Reference

| Task                      | Method                                                 |
| ------------------------- | ------------------------------------------------------ |
| Parse UTC date            | `new Date(utcISOString)`                               |
| Get UTC timestamp         | `date.getTime()` or `Date.now()`                       |
| Calculate time difference | `targetTimestamp - Date.now()`                         |
| Format to UK timezone     | `Intl.DateTimeFormat` with `timeZone: 'Europe/London'` |
| Format to local timezone  | `Intl.DateTimeFormat` (no timeZone option)             |
| Check if date passed      | `targetTimestamp < Date.now()`                         |

---

**Last Updated:** November 23, 2025


