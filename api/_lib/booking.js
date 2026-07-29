// booking.js — createQuote() orchestrates validation + pricing into a single
// trip-quote object. Imports pricing and validation; the top of the module
// dependency graph described in api/_lib/README.md.
//
// This is deliberately not a "booking" in the payment sense: there is no
// persistence, no charge, no confirmation number that reserves inventory. It
// produces an instant, correlatable price quote.

import { getDestination } from './availability.js';
import { priceStay } from './pricing.js';
import { validateQuoteRequest } from './validation.js';

/**
 * Generates a request-scoped correlation ID. Uses crypto.randomUUID when
 * available (Node 18+ / Vercel runtime) and falls back to a timestamped random
 * string otherwise so the module never throws in a bare environment.
 */
export function generateRequestId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `req_${globalThis.crypto.randomUUID()}`;
  }
  return `req_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Builds a trip quote from a raw request body.
 *
 * @param {object} body - raw request payload
 * @param {object} [opts]
 * @param {string} [opts.requestId] - correlation ID (generated if omitted)
 * @returns {{ok: true, quote: object} | {ok: false, reason: string, message: string, destinationId?: string}}
 */
export function createQuote(body, opts = {}) {
  const requestId = opts.requestId ?? generateRequestId();

  const validation = validateQuoteRequest(body);
  if (!validation.ok) {
    // Surface a valid destinationId to callers/logs when it was the one
    // thing that parsed — useful for correlating rejections by destination.
    const destinationId =
      body && typeof body === 'object' && getDestination(body.destinationId)
        ? body.destinationId
        : undefined;
    return {
      ok: false,
      requestId,
      reason: validation.reason,
      message: validation.message,
      destinationId,
    };
  }

  const { destinationId, checkIn, checkOut, rooms, guests, email } =
    validation.value;
  const destination = getDestination(destinationId);
  const pricing = priceStay(destinationId, checkIn, checkOut, rooms);

  return {
    ok: true,
    requestId,
    quote: {
      requestId,
      destinationId,
      destinationName: destination.name,
      checkIn,
      checkOut,
      rooms,
      guests,
      email,
      currency: pricing.currency,
      nights: pricing.nights,
      nightlyRate: pricing.nightlyRate,
      subtotal: pricing.subtotal,
      taxRate: pricing.taxRate,
      tax: pricing.tax,
      total: pricing.total,
      // Integer-cent mirror of the amounts for cent-safe clients.
      amountsCents: {
        nightlyRate: pricing.nightlyRateCents,
        subtotal: pricing.subtotalCents,
        tax: pricing.taxCents,
        total: pricing.totalCents,
      },
    },
  };
}
