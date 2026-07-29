// booking.contract.test.js — cross-boundary contract test.
//
// Proves the browser booking form and the real serverless handler agree on the
// wire contract WITHOUT mocking it. The test builds the request with the same
// `buildBookRequest` the browser uses (booking-client.js), feeds it through the
// actual `api/book.js` handler, then interprets the response with the same
// `parseBookResponse`/`renderQuoteView` the UI uses. If the client and backend
// ever drift, this test breaks.

import { describe, it, expect } from 'vitest';
import handler from '../api/book.js';
import {
  buildBookRequest,
  parseBookResponse,
  renderQuoteView,
} from '../booking-client.js';

// Minimal Vercel-style req/res doubles — the same shape the handler's own
// tests use, so we exercise the genuine HTTP-shaping path (status + body).
function makeReq(body) {
  return { method: 'POST', headers: {}, body: JSON.stringify(body) };
}

function makeRes() {
  return {
    statusCode: 0,
    headers: {},
    body: undefined,
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

/**
 * Drive a set of raw form values through the ENTIRE round trip: browser request
 * builder -> real handler -> browser response parser. Returns the parsed view.
 */
function roundTrip(formValues) {
  const requestBody = buildBookRequest(formValues);
  const req = makeReq(requestBody);
  const res = makeRes();
  handler(req, res);
  const view = parseBookResponse(res.statusCode, res.body);
  return { requestBody, res, view };
}

describe('booking form ⇄ /api/book contract', () => {
  it('scenario 1: Kyoto 2026-09-10→2026-09-15, 1 room, 2 guests succeeds and renders a quote', () => {
    const { requestBody, res, view } = roundTrip({
      // rooms/guests as strings, exactly as HTML inputs deliver them.
      destinationId: 'kyoto',
      checkIn: '2026-09-10',
      checkOut: '2026-09-15',
      rooms: '1',
      guests: '2',
      email: 'demo@example.com',
    });

    // The request the browser would send matches the exact backend contract.
    expect(requestBody).toEqual({
      destinationId: 'kyoto',
      checkIn: '2026-09-10',
      checkOut: '2026-09-15',
      rooms: 1,
      guests: 2,
      email: 'demo@example.com',
    });

    // The real handler accepted it.
    expect(res.statusCode).toBe(200);
    expect(view.kind).toBe('success');
    expect(typeof view.requestId).toBe('string');
    expect(view.requestId.length).toBeGreaterThan(0);

    // The UI parser can render the real quote.
    const rendered = renderQuoteView(view.quote, view.requestId);
    expect(rendered).toEqual({
      destinationName: 'Kyoto',
      nights: '5 nights',
      subtotal: '$1,900.00 USD',
      tax: '$228.00 USD',
      total: '$2,128.00 USD',
      currency: 'USD',
      requestId: view.requestId,
    });
  });

  it('scenario 2: Kyoto 2026-10-10→2026-10-12 is sold out and renders as availability feedback', () => {
    const { res, view } = roundTrip({
      destinationId: 'kyoto',
      checkIn: '2026-10-10',
      checkOut: '2026-10-12',
      rooms: '1',
      guests: '2',
      email: 'demo@example.com',
    });

    // A backend rejection is a real HTTP 400 with a well-formed body — NOT a
    // network failure. The parser must classify it as a rejection.
    expect(res.statusCode).toBe(400);
    expect(view.kind).toBe('rejected');
    expect(view.error.code).toBe('sold_out');
    // The message the UI renders is the backend's sold-out message verbatim.
    expect(view.message).toBe('The selected dates are not available.');
  });
});
