/**
 * Date and Timezone Utility Functions
 *
 * This module handles date parsing and timezone conversion for the application.
 * All dates are stored in UTC in the database for consistency.
 *
 * Key principles:
 * 1. Always store dates in UTC in the database (JavaScript Date objects are UTC internally)
 * 2. Accept dates with ANY timezone offset - fully timezone-agnostic
 * 3. If no timezone is provided, assume UK timezone (Europe/London) as fallback
 * 4. JavaScript Date constructor correctly handles timezone conversion for all timezones
 * 5. Return dates in ISO format (which preserves UTC)
 *
 * SUPPORTS ALL TIMEZONES:
 * - When a date includes a timezone offset (e.g., +05:30, -08:00, +01:00), it's correctly converted to UTC
 * - Examples: "2025-11-22T21:45:00+05:30" (India), "2025-11-22T21:45:00-08:00" (PST), etc.
 * - The system is fully timezone-agnostic when timezone information is provided
 *
 * FALLBACK (UK timezone):
 * - Only when NO timezone is provided (e.g., "2025-11-22T21:45:00"), it assumes UK timezone
 * - This is a convenience fallback for the primary market (UK)
 */

// Application timezone - UK (Europe/London)
// This handles both GMT (winter, UTC+0) and BST (British Summer Time, UTC+1 in summer)
export const APP_TIMEZONE = 'Europe/London';

/**
 * Get the UTC offset for UK timezone at a specific date
 * Uses Intl API to reliably determine if it's GMT (UTC+0) or BST (UTC+1)
 * @param date - Date to check
 * @returns Offset in minutes (0 for GMT, 60 for BST)
 */
const getUKTimezoneOffset = (date: Date): number => {
  // Use Intl.DateTimeFormat to format the date in UK timezone
  // Then compare with UTC to get the offset
  const utcFormatter = new Intl.DateTimeFormat('en', {
    timeZone: 'UTC',
    hour: '2-digit',
    hour12: false,
  });

  const ukFormatter = new Intl.DateTimeFormat('en', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    hour12: false,
  });

  // Get hours in both timezones
  const utcHour = parseInt(utcFormatter.format(date));
  const ukHour = parseInt(ukFormatter.format(date));

  // Calculate offset in hours (BST is UTC+1, GMT is UTC+0)
  const offsetHours = ukHour - utcHour;

  // Handle day boundary (if UK is ahead, offset is positive)
  // BST: UK is UTC+1, so if UTC is 20:00, UK is 21:00 (offset = +1 hour = +60 minutes)
  // GMT: UK is UTC+0, so if UTC is 20:00, UK is 20:00 (offset = 0)
  return offsetHours * 60;
};

/**
 * Parse a date string and convert it to UTC for storage
 *
 * SUPPORTS ALL TIMEZONES - When a timezone offset is provided, any timezone works correctly.
 * Only falls back to UK timezone when no timezone is specified.
 *
 * @param value - Date string (ISO format, with or without timezone)
 * @returns Date object in UTC, or undefined if invalid
 *
 * @example
 * // ANY timezone - correctly converts to UTC
 * parseDateToUTC('2025-11-22T21:45:00+05:30') // India (IST) - Stores as 2025-11-22T16:15:00Z
 * parseDateToUTC('2025-11-22T21:45:00-08:00') // Pacific (PST) - Stores as 2025-11-23T05:45:00Z
 * parseDateToUTC('2025-11-22T21:45:00+01:00') // UK (BST) - Stores as 2025-11-22T20:45:00Z
 * parseDateToUTC('2025-11-22T21:45:00+00:00') // UK (GMT) - Stores as 2025-11-22T21:45:00Z
 *
 * // Without timezone - assumes UK timezone as fallback
 * parseDateToUTC('2025-11-22T21:45:00') // Treats as UK time, converts to UTC
 *
 * // ISO string with Z (already UTC)
 * parseDateToUTC('2025-11-22T21:45:00Z') // Already UTC
 */
export const parseDateToUTC = (value: unknown): Date | undefined => {
  if (!value) return undefined;

  const dateString = String(value).trim();
  if (!dateString) return undefined;

  // If the date string already includes a timezone offset (+HH:mm, -HH:mm, or Z)
  // JavaScript Date constructor handles this correctly
  if (
    dateString.includes('+') ||
    dateString.includes('Z') ||
    /-\d{2}:\d{2}$/.test(dateString)
  ) {
    const date = new Date(dateString);
    if (!Number.isNaN(date.getTime())) {
      return date; // Date objects are always stored in UTC internally
    }
  }

  // If no timezone is provided, we need to treat it as UK timezone
  // Format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  try {
    // Check if it's a date-only string (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      // Date only - treat as midnight (00:00:00) in UK timezone
      const [year, month, day] = dateString.split('-').map(Number);

      // Create a temporary date to determine UK timezone offset
      const tempDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      const offsetMinutes = getUKTimezoneOffset(tempDate);

      // Create the date as UTC midnight
      const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

      // Adjust for UK timezone offset
      return new Date(utcDate.getTime() - offsetMinutes * 60 * 1000);
    }

    // Check if it's a datetime string without timezone (YYYY-MM-DDTHH:mm:ss)
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateString)) {
      // Parse the components
      const [datePart, timePart] = dateString.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes, seconds] = timePart.split(':').map(Number);

      // Create a temporary date to determine UK timezone offset
      // We'll create it as UTC first to check what the offset should be
      const tempDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)); // Use noon to avoid DST edge cases
      const offsetMinutes = getUKTimezoneOffset(tempDate);

      // Create the date as UTC with the specified time components
      const utcDate = new Date(
        Date.UTC(year, month - 1, day, hours, minutes, seconds)
      );

      // Adjust: if UK is UTC+1 (BST), the input time is 1 hour ahead of UTC
      // So we subtract the offset to get the correct UTC time
      // Example: Input "21:45" in UK (BST, UTC+1) should be stored as "20:45" UTC
      return new Date(utcDate.getTime() - offsetMinutes * 60 * 1000);
    }

    // Fallback: try standard parsing
    const date = new Date(dateString);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  } catch (error) {
    // Invalid date format
    return undefined;
  }

  return undefined;
};

/**
 * Format a UTC date to ISO string (preserves UTC, standard format)
 * This is what should be returned in API responses
 *
 * @param date - Date object (in UTC)
 * @returns ISO string (e.g., "2025-11-22T20:45:00.000Z")
 */
export const formatDateToISO = (date: Date): string => {
  if (!date || Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString();
};

/**
 * Get current date/time in UTC
 * @returns Date object representing current time in UTC
 */
export const getCurrentUTCTime = (): Date => {
  return new Date();
};
