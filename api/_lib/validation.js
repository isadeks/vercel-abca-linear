// validation.js — request validation for the trip quote funnel. Imports
// availability to check the destination is known and the dates are bookable.
//
// validateQuoteRequest() returns a discriminated result:
//   { ok: true,  value: {...normalized fields} }
//   { ok: false, reason: '<machine-code>', message: '<human string>' }
// The `reason` codes are stable and safe to log (they contain no PII).

import { isKnownDestination, isRangeAvailable } from './availability.js';

/** Max guests a single room can hold. */
export const MAX_GUESTS_PER_ROOM = 4;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Deliberately simple email shape check: something@something.tld. We only need
// "looks like an email", not RFC 5322 compliance.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(reason, message) {
  return { ok: false, reason, message };
}

/** True when `value` is a whole number > 0. */
function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

/**
 * True when `s` is a real calendar date in strict `YYYY-MM-DD` form. Rejects
 * shape-valid but nonexistent dates like 2026-02-30 (which Date would roll
 * over) by round-tripping through an ISO parse.
 */
function isValidIsoDate(s) {
  if (typeof s !== 'string' || !ISO_DATE_RE.test(s)) return false;
  const parsed = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === s;
}

/**
 * Validates and normalizes a raw quote request body.
 *
 * Expected shape:
 *   { destinationId, checkIn, checkOut, rooms, guests, email }
 *
 * @returns {{ok: true, value: object} | {ok: false, reason: string, message: string}}
 */
export function validateQuoteRequest(body) {
  if (body === null || typeof body !== 'object') {
    return fail('invalid_body', 'Request body must be a JSON object.');
  }

  const { destinationId, checkIn, checkOut, rooms, guests, email } = body;

  // Destination
  if (typeof destinationId !== 'string' || !isKnownDestination(destinationId)) {
    return fail('invalid_destination', 'Unknown or missing destination.');
  }

  // Date format
  if (!isValidIsoDate(checkIn)) {
    return fail('invalid_check_in', 'checkIn must be an ISO YYYY-MM-DD date.');
  }
  if (!isValidIsoDate(checkOut)) {
    return fail('invalid_check_out', 'checkOut must be an ISO YYYY-MM-DD date.');
  }

  // Date ordering — checkOut must be strictly after checkIn (>= 1 night).
  if (checkOut <= checkIn) {
    return fail('invalid_date_range', 'checkOut must be after checkIn.');
  }

  // Room / guest counts
  if (!isPositiveInteger(rooms)) {
    return fail('invalid_rooms', 'rooms must be a positive integer.');
  }
  if (!isPositiveInteger(guests)) {
    return fail('invalid_guests', 'guests must be a positive integer.');
  }
  if (guests > rooms * MAX_GUESTS_PER_ROOM) {
    return fail(
      'capacity_exceeded',
      `A maximum of ${MAX_GUESTS_PER_ROOM} guests are allowed per room.`,
    );
  }

  // Email shape
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return fail('invalid_email', 'A valid email address is required.');
  }

  // Availability — dates must be bookable for this destination.
  if (!isRangeAvailable(destinationId, checkIn, checkOut)) {
    return fail('sold_out', 'The selected dates are not available.');
  }

  return {
    ok: true,
    value: { destinationId, checkIn, checkOut, rooms, guests, email },
  };
}
