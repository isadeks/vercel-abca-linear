// pricing.js — nightly rates, taxes, and totals. Imports availability for the
// per-destination nightly rate and the nights-between helper.
//
// All money is handled in integer cents until the very end to stay cent-safe:
// we only divide by 100 when formatting for display, never mid-calculation.

import { getDestination, nightsBetween } from './availability.js';

/** Tax rate applied to the room subtotal (12%). */
export const TAX_RATE = 0.12;

/** ISO 4217 currency code for all quotes. */
export const CURRENCY = 'USD';

/** Rounds to the nearest whole cent, guarding against float drift. */
function roundCents(value) {
  return Math.round(value);
}

/** Formats an integer number of cents as a fixed 2-decimal string. */
export function centsToAmount(cents) {
  return (cents / 100).toFixed(2);
}

/**
 * Computes a price breakdown for a stay. Returns an object with integer-cent
 * fields plus display-friendly amount strings.
 *
 * @param {string} destinationId - validated destination ID
 * @param {string} checkIn - validated ISO YYYY-MM-DD
 * @param {string} checkOut - validated ISO YYYY-MM-DD (> checkIn)
 * @param {number} rooms - positive integer room count
 */
export function priceStay(destinationId, checkIn, checkOut, rooms) {
  const destination = getDestination(destinationId);
  if (!destination) {
    throw new Error(`Unknown destination: ${destinationId}`);
  }

  const nights = nightsBetween(checkIn, checkOut).length;
  const subtotalCents = destination.nightlyRateCents * nights * rooms;
  const taxCents = roundCents(subtotalCents * TAX_RATE);
  const totalCents = subtotalCents + taxCents;

  return {
    currency: CURRENCY,
    nights,
    rooms,
    nightlyRateCents: destination.nightlyRateCents,
    subtotalCents,
    taxRate: TAX_RATE,
    taxCents,
    totalCents,
    nightlyRate: centsToAmount(destination.nightlyRateCents),
    subtotal: centsToAmount(subtotalCents),
    tax: centsToAmount(taxCents),
    total: centsToAmount(totalCents),
  };
}
