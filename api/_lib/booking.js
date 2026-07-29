// booking.js — createQuote(): the domain entry point for a trip quote.
//
// Imports validation + pricing. Validates the raw request, prices it on
// success, and returns a discriminated result. Framework-free: no HTTP, no
// logging, no I/O — the handler wires those in.

import { validateBookingRequest } from './validation.js';
import { priceQuote } from './pricing.js';

/**
 * @typedef {import('./pricing.js').Quote} Quote
 * @typedef {import('./validation.js').ValidationError} ValidationError
 */

/**
 * @typedef {Object} QuoteResult
 * @property {boolean} ok
 * @property {Quote} [quote]           Present when ok.
 * @property {string} [destinationId]  Echoed for correlation/logging.
 * @property {ValidationError} [error] Present when not ok.
 */

/**
 * Create a priced quote from a raw request body.
 * @param {unknown} body
 * @returns {QuoteResult}
 */
export function createQuote(body) {
  const validation = validateBookingRequest(body);
  if (!validation.ok) {
    // Echo the destination id only when the body carried a string one, so the
    // rejection log can be correlated without leaking other fields.
    const destinationId =
      body && typeof body === 'object' && typeof body.destinationId === 'string'
        ? body.destinationId
        : undefined;
    return { ok: false, error: validation.error, destinationId };
  }

  const quote = priceQuote(validation.value);
  return { ok: true, quote, destinationId: validation.value.destinationId };
}
