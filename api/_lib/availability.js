/**
 * availability.js — Room availability domain module for Wander destinations.
 *
 * Pure functions, no I/O, no external dependencies.
 * Consumed by higher-level booking modules (pricing.js, validation.js).
 */

// ---------------------------------------------------------------------------
// Seed dataset
// Keys are destination IDs; values are maps from ISO date string → night data.
// Dates not present in the map fall back to the destination's `defaultAvail`.
// ---------------------------------------------------------------------------

/** @type {Record<string, { defaultAvail: { roomsLeft: number, nightlyRateUsd: number }, overrides: Record<string, { roomsLeft: number, nightlyRateUsd: number }> }>} */
const DESTINATIONS = {
  'wander-malibu': {
    defaultAvail: { roomsLeft: 4, nightlyRateUsd: 450 },
    overrides: {
      '2026-07-04': { roomsLeft: 0, nightlyRateUsd: 650 }, // sold out on holiday
      '2026-07-05': { roomsLeft: 1, nightlyRateUsd: 600 },
    },
  },
  'wander-smoky-mountains': {
    defaultAvail: { roomsLeft: 6, nightlyRateUsd: 320 },
    overrides: {
      '2026-12-24': { roomsLeft: 0, nightlyRateUsd: 480 },
      '2026-12-25': { roomsLeft: 0, nightlyRateUsd: 480 },
      '2026-12-31': { roomsLeft: 2, nightlyRateUsd: 520 },
    },
  },
  'wander-lake-tahoe': {
    defaultAvail: { roomsLeft: 3, nightlyRateUsd: 390 },
    overrides: {
      '2026-02-14': { roomsLeft: 0, nightlyRateUsd: 550 },
    },
  },
};

const KNOWN_DESTINATION_IDS = new Set(Object.keys(DESTINATIONS));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse and validate an ISO date string. Returns a Date object at UTC midnight.
 * Throws if the value is not a valid ISO date.
 * @param {string} dateStr
 * @param {string} label  — used in error messages
 * @returns {Date}
 */
function parseDate(dateStr, label) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error(`${label} must be an ISO date string (YYYY-MM-DD), got: ${JSON.stringify(dateStr)}`);
  }
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (isNaN(d.getTime())) {
    throw new Error(`${label} is not a valid date: ${dateStr}`);
  }
  return d;
}

/**
 * Advance a UTC-midnight Date by one day and return a new Date.
 * @param {Date} d
 * @returns {Date}
 */
function addOneDay(d) {
  return new Date(d.getTime() + 86_400_000);
}

/**
 * Format a Date (UTC midnight) as "YYYY-MM-DD".
 * @param {Date} d
 * @returns {string}
 */
function toIso(d) {
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Returns the number of nights between startDate and endDate (checkout exclusive).
 * e.g. nightsBetween('2026-07-01', '2026-07-03') === 2
 *
 * Throws if endDate <= startDate.
 *
 * @param {string} startDate  ISO date string
 * @param {string} endDate    ISO date string (exclusive checkout)
 * @returns {number}
 */
export function nightsBetween(startDate, endDate) {
  const start = parseDate(startDate, 'startDate');
  const end = parseDate(endDate, 'endDate');

  if (end <= start) {
    throw new Error(
      `endDate must be after startDate; got startDate=${startDate}, endDate=${endDate}`,
    );
  }

  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

/**
 * Returns an array of night-availability objects for every night in
 * [startDate, endDate) for the given destination.
 *
 * Each element: { date: 'YYYY-MM-DD', roomsLeft: number, nightlyRateUsd: number }
 *
 * Throws on unknown destination or invalid / out-of-order dates.
 *
 * @param {string} destinationId
 * @param {string} startDate  ISO date string (first night, inclusive)
 * @param {string} endDate    ISO date string (checkout, exclusive)
 * @returns {{ date: string, roomsLeft: number, nightlyRateUsd: number }[]}
 */
export function getAvailability(destinationId, startDate, endDate) {
  if (!KNOWN_DESTINATION_IDS.has(destinationId)) {
    throw new Error(
      `Unknown destination: "${destinationId}". Known destinations: ${[...KNOWN_DESTINATION_IDS].join(', ')}`,
    );
  }

  // Validate dates (nightsBetween also validates ordering)
  nightsBetween(startDate, endDate);

  const { defaultAvail, overrides } = DESTINATIONS[destinationId];
  const nights = [];

  let current = parseDate(startDate, 'startDate');
  const end = parseDate(endDate, 'endDate');

  while (current < end) {
    const dateStr = toIso(current);
    const avail = overrides[dateStr] ?? defaultAvail;
    nights.push({ date: dateStr, roomsLeft: avail.roomsLeft, nightlyRateUsd: avail.nightlyRateUsd });
    current = addOneDay(current);
  }

  return nights;
}

/**
 * Returns true iff every night in [startDate, endDate) has roomsLeft >= roomsNeeded.
 *
 * Throws on unknown destination or invalid / out-of-order dates.
 *
 * @param {string} destinationId
 * @param {string} startDate
 * @param {string} endDate
 * @param {number} roomsNeeded
 * @returns {boolean}
 */
export function isRangeAvailable(destinationId, startDate, endDate, roomsNeeded) {
  const nights = getAvailability(destinationId, startDate, endDate);
  return nights.every((night) => night.roomsLeft >= roomsNeeded);
}
