// booking-client.js — shared, framework-free client contract for /api/book.
//
// Single source of truth for how the browser booking form builds its request
// and interprets the response. It is a static ES module served at the site
// root, imported both by `booking-ui.js` in the browser and by the
// cross-boundary test. Because the test imports THIS file, it exercises the
// exact bytes the UI sends and the exact shapes it renders — no mock, no drift.
//
// Zero dependencies, zero I/O: pure functions only.

/** The API endpoint the booking form submits to. */
export const BOOK_ENDPOINT = '/api/book';

/** Destination ids accepted by the backend, in display order. */
export const DESTINATIONS = Object.freeze([
  { id: 'amalfi', name: 'Amalfi Coast' },
  { id: 'kyoto', name: 'Kyoto' },
  { id: 'santorini', name: 'Santorini' },
  { id: 'patagonia', name: 'Patagonia' },
  { id: 'rajasthan', name: 'Rajasthan' },
  { id: 'norway', name: 'Norway' },
]);

/**
 * Coerce a raw form value into a whole number, or NaN when it is not a clean
 * integer. Empty/blank values become NaN so the backend rejects them.
 * @param {unknown} value
 * @returns {number}
 */
function toInteger(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || !/^-?\d+$/.test(trimmed)) return NaN;
    return Number(trimmed);
  }
  return NaN;
}

/**
 * Build the exact request body the backend expects from raw form values.
 * `rooms`/`guests` are coerced to numbers (HTML inputs yield strings); the
 * other fields are passed through as trimmed strings. This is the ONLY place
 * the request shape is defined for the client.
 *
 * @param {{destinationId: string, checkIn: string, checkOut: string, rooms: (string|number), guests: (string|number), email: string}} values
 * @returns {{destinationId: string, checkIn: string, checkOut: string, rooms: number, guests: number, email: string}}
 */
export function buildBookRequest(values) {
  const v = values || {};
  return {
    destinationId: typeof v.destinationId === 'string' ? v.destinationId.trim() : v.destinationId,
    checkIn: typeof v.checkIn === 'string' ? v.checkIn.trim() : v.checkIn,
    checkOut: typeof v.checkOut === 'string' ? v.checkOut.trim() : v.checkOut,
    rooms: toInteger(v.rooms),
    guests: toInteger(v.guests),
    email: typeof v.email === 'string' ? v.email.trim() : v.email,
  };
}

/**
 * Interpret a completed HTTP response into a UI view model. This distinguishes
 * a backend rejection (any well-formed `{ ok:false }` body, e.g. an HTTP 400
 * sold-out response) from a genuinely malformed/unexpected response. It does
 * NOT handle network failures — those never produce a response and are caught
 * by the caller before this runs.
 *
 * @param {number} status  HTTP status code.
 * @param {unknown} body   Parsed JSON body (or undefined if unparseable).
 * @returns {{kind: ('success'|'rejected'|'error'), requestId?: string, quote?: object, error?: object, message?: string}}
 */
export function parseBookResponse(status, body) {
  if (body && typeof body === 'object') {
    if (status === 200 && body.ok === true && body.quote) {
      return { kind: 'success', requestId: body.requestId, quote: body.quote };
    }
    if (body.ok === false && body.error) {
      return {
        kind: 'rejected',
        requestId: body.requestId,
        error: body.error,
        message: body.error.message,
      };
    }
  }
  return {
    kind: 'error',
    message: `The server returned an unexpected response (HTTP ${status}).`,
  };
}

/**
 * Format a USD amount for display, e.g. 2128 -> "$2,128.00 USD".
 * @param {number} amount
 * @param {string} [currency]
 * @returns {string}
 */
export function formatMoney(amount, currency = 'USD') {
  const n = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  const symbol = currency === 'USD' ? '$' : '';
  return `${symbol}${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`.trim();
}

/**
 * Turn a successful quote into flat, display-ready strings. The browser renders
 * these directly into the result panel; the cross-boundary test asserts on them
 * to prove the parser can render a real backend quote.
 *
 * @param {object} quote  The `quote` object from a 200 response.
 * @param {string} [requestId]
 * @returns {{destinationName: string, nights: string, subtotal: string, tax: string, total: string, currency: string, requestId: string}}
 */
export function renderQuoteView(quote, requestId) {
  const q = quote || {};
  const nights = typeof q.nights === 'number' ? q.nights : 0;
  return {
    destinationName: String(q.destinationName ?? ''),
    nights: `${nights} night${nights === 1 ? '' : 's'}`,
    subtotal: formatMoney(q.subtotalUsd, q.currency),
    tax: formatMoney(q.taxUsd, q.currency),
    total: formatMoney(q.totalUsd, q.currency),
    currency: String(q.currency ?? ''),
    requestId: String(requestId ?? ''),
  };
}
