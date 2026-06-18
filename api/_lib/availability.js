/**
 * availability.js — room/date availability helper
 *
 * Determines whether a room is available for a given date range.
 * This is the foundational shared helper; pricing and validation import it.
 *
 * All dates are represented as ISO-8601 strings ("YYYY-MM-DD").
 */

/**
 * Parse an ISO date string into a UTC midnight Date object.
 * @param {string} iso - e.g. "2024-06-15"
 * @returns {Date}
 */
export function parseDate(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d.getTime())) {
    throw new RangeError(`Invalid date string: "${iso}"`);
  }
  return d;
}

/**
 * Count the number of nights between two dates.
 * @param {string} checkIn  - ISO date string
 * @param {string} checkOut - ISO date string (must be after checkIn)
 * @returns {number} positive integer number of nights
 */
export function countNights(checkIn, checkOut) {
  const inMs = parseDate(checkIn).getTime();
  const outMs = parseDate(checkOut).getTime();
  const nights = (outMs - inMs) / (1000 * 60 * 60 * 24);
  if (nights <= 0) {
    throw new RangeError('checkOut must be after checkIn');
  }
  return nights;
}

/**
 * Determine whether a room is available for the requested dates.
 *
 * @param {string}   checkIn      - ISO date string for arrival
 * @param {string}   checkOut     - ISO date string for departure
 * @param {string[]} blockedDates - array of ISO date strings that are unavailable
 *                                  (the arrival night counts; departure day does not)
 * @returns {{ available: boolean, nights: number, blockedNights: string[] }}
 */
export function checkAvailability(checkIn, checkOut, blockedDates = []) {
  const nights = countNights(checkIn, checkOut);
  const inMs = parseDate(checkIn).getTime();
  const blocked = new Set(blockedDates);

  const blockedNights = [];
  for (let i = 0; i < nights; i++) {
    const nightMs = inMs + i * 24 * 60 * 60 * 1000;
    const nightIso = new Date(nightMs).toISOString().slice(0, 10);
    if (blocked.has(nightIso)) {
      blockedNights.push(nightIso);
    }
  }

  return {
    available: blockedNights.length === 0,
    nights,
    blockedNights,
  };
}
