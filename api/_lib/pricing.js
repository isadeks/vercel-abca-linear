// pricing.js — nightly rates, taxes, and totals for a trip quote.
//
// Imports availability for destination rates. All money is computed in integer
// cents to avoid floating-point drift, then converted back to whole/decimal
// USD for the response. Framework-free; no I/O.

import { getDestination } from './availability.js';
import { parseIsoDate } from './validation.js';

/** Tax rate applied to the subtotal (12%). */
export const TAX_RATE = 0.12;

/** ISO currency code for all quotes. */
export const CURRENCY = 'USD';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Number of nights between two ISO dates (checkout exclusive).
 * @param {string} checkIn
 * @param {string} checkOut
 * @returns {number}
 */
export function nightsBetween(checkIn, checkOut) {
  const start = parseIsoDate(checkIn);
  const end = parseIsoDate(checkOut);
  if (!start || !end) return 0;
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
}

/**
 * @typedef {Object} Quote
 * @property {string} destinationName
 * @property {number} nights
 * @property {number} subtotalUsd
 * @property {number} taxUsd
 * @property {number} totalUsd
 * @property {string} currency
 */

/**
 * Compute a priced quote for a normalized request. Assumes the request has
 * already been validated (known destination, valid dates, positive counts).
 *
 * @param {{ destinationId: string, checkIn: string, checkOut: string, rooms: number }} req
 * @returns {Quote}
 */
export function priceQuote({ destinationId, checkIn, checkOut, rooms }) {
  const destination = getDestination(destinationId);
  if (!destination) {
    throw new Error(`Unknown destination: ${destinationId}`);
  }

  const nights = nightsBetween(checkIn, checkOut);

  // Cent-safe arithmetic: rates are whole USD, so cents are exact integers.
  const nightlyCents = Math.round(destination.nightlyRateUsd * 100);
  const subtotalCents = nightlyCents * nights * rooms;
  const taxCents = Math.round(subtotalCents * TAX_RATE);
  const totalCents = subtotalCents + taxCents;

  return {
    destinationName: destination.name,
    nights,
    subtotalUsd: centsToUsd(subtotalCents),
    taxUsd: centsToUsd(taxCents),
    totalUsd: centsToUsd(totalCents),
    currency: CURRENCY,
  };
}

/**
 * Convert integer cents to a USD number, trimming a trailing ".00" to a whole
 * number so the response matches the contract (e.g. 1900 not 1900.0).
 * @param {number} cents
 * @returns {number}
 */
function centsToUsd(cents) {
  return Math.round(cents) / 100;
}
