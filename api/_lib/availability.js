// availability.js — room/date availability for Wander destinations.
//
// Framework-free ES module with no dependencies. Holds the bare destination
// catalog (id -> display name + nightly USD rate) and an in-memory table of
// sold-out date ranges. This is a demo: there is no external inventory service
// or permanent storage (out of scope), so the catalog and blocks are static.

/**
 * @typedef {Object} Destination
 * @property {string} id            Bare destination id (lowercase slug).
 * @property {string} name          Human-readable display name.
 * @property {number} nightlyRateUsd Nightly rate per room, in whole US dollars.
 */

/** @type {Record<string, Destination>} */
export const DESTINATIONS = Object.freeze({
  amalfi: { id: 'amalfi', name: 'Amalfi Coast', nightlyRateUsd: 420 },
  kyoto: { id: 'kyoto', name: 'Kyoto', nightlyRateUsd: 380 },
  santorini: { id: 'santorini', name: 'Santorini', nightlyRateUsd: 450 },
  patagonia: { id: 'patagonia', name: 'Patagonia', nightlyRateUsd: 360 },
  rajasthan: { id: 'rajasthan', name: 'Rajasthan', nightlyRateUsd: 290 },
  norway: { id: 'norway', name: 'Norway', nightlyRateUsd: 510 },
});

/**
 * Sold-out date ranges per destination. Each entry blocks the half-open
 * interval [from, until): a stay is sold out if it overlaps any block.
 *
 * @type {Record<string, Array<{ from: string, until: string }>>}
 */
const SOLD_OUT = Object.freeze({
  // Demo scenario: Kyoto is sold out 2026-10-10 through 2026-10-12.
  kyoto: [{ from: '2026-10-10', until: '2026-10-13' }],
});

/**
 * Look up a destination by its bare id.
 * @param {string} id
 * @returns {Destination | undefined}
 */
export function getDestination(id) {
  if (typeof id !== 'string') return undefined;
  return DESTINATIONS[id];
}

/**
 * Is the destination id a known one?
 * @param {string} id
 * @returns {boolean}
 */
export function isKnownDestination(id) {
  return getDestination(id) !== undefined;
}

/**
 * Determine whether a stay is available for the given destination and dates.
 * Both dates are ISO calendar dates ("YYYY-MM-DD"). The stay covers the
 * half-open interval [checkIn, checkOut); a stay is unavailable when it
 * overlaps any sold-out block for the destination.
 *
 * @param {string} destinationId
 * @param {string} checkIn  ISO date (inclusive).
 * @param {string} checkOut ISO date (exclusive).
 * @returns {boolean} true when the stay can be booked.
 */
export function isAvailable(destinationId, checkIn, checkOut) {
  if (!isKnownDestination(destinationId)) return false;
  const blocks = SOLD_OUT[destinationId] || [];
  const stayStart = checkIn;
  const stayEnd = checkOut;
  for (const block of blocks) {
    // Half-open intervals [stayStart, stayEnd) and [block.from, block.until)
    // overlap when start < otherEnd and otherStart < end. String comparison
    // is correct for zero-padded ISO dates.
    if (stayStart < block.until && block.from < stayEnd) {
      return false;
    }
  }
  return true;
}
