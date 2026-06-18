/**
 * availability.js — room / date availability helpers
 *
 * Zero external dependencies. All other booking modules (pricing, validation,
 * booking) import from this file. Logic is intentionally simple so it is easy
 * to unit-test and reason about.
 */

/**
 * Returns true if `date` falls within the half-open interval [start, end).
 * All arguments are ISO-8601 date strings ("YYYY-MM-DD").
 *
 * @param {string} date
 * @param {string} start  check-in date (inclusive)
 * @param {string} end    check-out date (exclusive)
 * @returns {boolean}
 */
export function isDateInRange(date, start, end) {
  return date >= start && date < end;
}

/**
 * Returns the number of nights between a check-in and check-out date.
 *
 * @param {string} checkIn   "YYYY-MM-DD"
 * @param {string} checkOut  "YYYY-MM-DD"
 * @returns {number}  always ≥ 0
 */
export function nightsBetween(checkIn, checkOut) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = new Date(checkOut) - new Date(checkIn);
  return Math.max(0, Math.round(diff / msPerDay));
}

/**
 * Checks whether a requested stay overlaps with any already-booked period.
 *
 * A "booking" object has the shape { checkIn: string, checkOut: string }.
 * Overlap is detected using the standard half-open-interval test:
 *   requestedCheckIn < existingCheckOut  &&  requestedCheckOut > existingCheckIn
 *
 * @param {string}   checkIn   requested check-in  "YYYY-MM-DD"
 * @param {string}   checkOut  requested check-out "YYYY-MM-DD"
 * @param {Array<{checkIn: string, checkOut: string}>} existingBookings
 * @returns {boolean}  true if the dates are available (no overlap)
 */
export function isAvailable(checkIn, checkOut, existingBookings) {
  if (nightsBetween(checkIn, checkOut) < 1) return false;
  for (const booking of existingBookings) {
    const overlaps = checkIn < booking.checkOut && checkOut > booking.checkIn;
    if (overlaps) return false;
  }
  return true;
}
