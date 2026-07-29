// availability.js — deterministic demo inventory for the six Wander
// destinations. Framework-free ES module with no dependencies.
//
// "Availability" here is a stand-in for a real inventory provider: it answers
// whether a destination can be booked for a given set of nights. The data is
// deterministic (hard-coded blackout dates) so tests and demos are stable.

/**
 * The six supported destinations, keyed by stable ID. `nightlyRateCents` is the
 * demo nightly rate per room, stored in integer cents to keep pricing math
 * cent-safe (no floating-point dollars).
 */
export const DESTINATIONS = {
  amalfi: { id: 'amalfi', name: 'Amalfi Coast', nightlyRateCents: 42000 },
  kyoto: { id: 'kyoto', name: 'Kyoto', nightlyRateCents: 38000 },
  santorini: { id: 'santorini', name: 'Santorini', nightlyRateCents: 45000 },
  patagonia: { id: 'patagonia', name: 'Patagonia', nightlyRateCents: 52000 },
  rajasthan: { id: 'rajasthan', name: 'Rajasthan', nightlyRateCents: 30000 },
  norway: { id: 'norway', name: "Norway's Fjords", nightlyRateCents: 48000 },
};

/**
 * Deterministic demo blackout nights, keyed by destination ID. A night listed
 * here is sold out for that destination. Dates are ISO `YYYY-MM-DD` strings and
 * refer to the *night* starting on that date.
 *
 * Kyoto is intentionally sold out 2026-10-10 through 2026-10-12 (inclusive) so
 * the sold-out path is exercisable; 2026-09-10 through 2026-09-15 stays open.
 */
const BLACKOUT_NIGHTS = {
  kyoto: new Set(['2026-10-10', '2026-10-11', '2026-10-12']),
};

/** True when `id` is one of the supported destinations. */
export function isKnownDestination(id) {
  return Object.prototype.hasOwnProperty.call(DESTINATIONS, id);
}

/** Returns the destination record for `id`, or `undefined` if unknown. */
export function getDestination(id) {
  return DESTINATIONS[id];
}

/**
 * Returns the ISO date strings for every night in the half-open range
 * [checkIn, checkOut) — i.e. the nights a guest actually occupies. A one-night
 * stay (check-in 09-10, check-out 09-11) yields `['2026-09-10']`.
 *
 * Assumes both inputs are already-validated `YYYY-MM-DD` strings with
 * checkOut > checkIn (validation.js enforces this before pricing runs).
 */
export function nightsBetween(checkIn, checkOut) {
  const nights = [];
  const end = new Date(`${checkOut}T00:00:00Z`);
  const cursor = new Date(`${checkIn}T00:00:00Z`);
  while (cursor < end) {
    nights.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return nights;
}

/** True when a single night is bookable for the destination. */
export function isNightAvailable(destinationId, night) {
  const blackout = BLACKOUT_NIGHTS[destinationId];
  return !(blackout && blackout.has(night));
}

/**
 * True when every night in [checkIn, checkOut) is bookable for the destination.
 * Unknown destinations are never available.
 */
export function isRangeAvailable(destinationId, checkIn, checkOut) {
  if (!isKnownDestination(destinationId)) return false;
  return nightsBetween(checkIn, checkOut).every((night) =>
    isNightAvailable(destinationId, night),
  );
}
