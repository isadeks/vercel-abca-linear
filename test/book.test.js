/**
 * Tests for api/book.js — the Vercel serverless endpoint.
 *
 * We test the handler directly (without an HTTP server) by constructing
 * lightweight req/res stubs, giving us fast, dependency-free unit tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import handler, { bookings } from '../api/book.js';

/** Build a minimal Vercel-style request stub. */
function makeReq(method, body) {
  return { method, body };
}

/** Build a minimal Vercel-style response stub that captures calls. */
function makeRes() {
  const res = {
    _status: null,
    _body: null,
    status(code) {
      this._status = code;
      return this;
    },
    json(body) {
      this._body = body;
      return this;
    },
  };
  return res;
}

const validBody = {
  roomId: 'room-10',
  checkIn: '2025-09-01',
  checkOut: '2025-09-05',
  guestName: 'Carol White',
  guestEmail: 'carol@example.com',
  nightlyRate: 250,
};

describe('POST /api/book — happy path', () => {
  beforeEach(() => {
    // Reset in-memory bookings before each test.
    bookings.length = 0;
  });

  it('responds with 201 and success: true for a valid request', () => {
    const req = makeReq('POST', validBody);
    const res = makeRes();
    handler(req, res);
    expect(res._status).toBe(201);
    expect(res._body.success).toBe(true);
  });

  it('returns a booking object with the expected fields', () => {
    const req = makeReq('POST', validBody);
    const res = makeRes();
    handler(req, res);
    const { booking } = res._body;
    expect(booking).toMatchObject({
      roomId: 'room-10',
      checkIn: '2025-09-01',
      checkOut: '2025-09-05',
      guestName: 'Carol White',
      guestEmail: 'carol@example.com',
      nights: 4,
      subtotal: 1000,
      tax: 125,
      total: 1125,
    });
  });

  it('returns a booking reference matching BK-XXXXXX', () => {
    const req = makeReq('POST', validBody);
    const res = makeRes();
    handler(req, res);
    expect(res._body.booking.bookingRef).toMatch(/^BK-[0-9A-F]{6}$/);
  });

  it('persists the booking so a duplicate request is rejected', () => {
    handler(makeReq('POST', validBody), makeRes());
    const res2 = makeRes();
    handler(makeReq('POST', validBody), res2);
    expect(res2._status).toBe(400);
    expect(res2._body.success).toBe(false);
  });
});

describe('POST /api/book — validation errors', () => {
  beforeEach(() => {
    bookings.length = 0;
  });

  it('responds with 400 and success: false when body is null', () => {
    const req = makeReq('POST', null);
    const res = makeRes();
    handler(req, res);
    expect(res._status).toBe(400);
    expect(res._body.success).toBe(false);
    expect(Array.isArray(res._body.errors)).toBe(true);
  });

  it('responds with 400 when required fields are missing', () => {
    const req = makeReq('POST', { roomId: 'room-10' });
    const res = makeRes();
    handler(req, res);
    expect(res._status).toBe(400);
    expect(res._body.success).toBe(false);
    expect(res._body.errors.length).toBeGreaterThan(0);
  });

  it('returns error messages referencing the invalid field', () => {
    const body = { ...validBody, checkOut: '2025-09-01', checkIn: '2025-09-05' };
    const req = makeReq('POST', body);
    const res = makeRes();
    handler(req, res);
    expect(res._status).toBe(400);
    expect(res._body.errors.some((e) => /checkOut must be after/.test(e))).toBe(true);
  });
});

describe('Non-POST methods', () => {
  it('responds with 405 for a GET request', () => {
    const req = makeReq('GET', null);
    const res = makeRes();
    handler(req, res);
    expect(res._status).toBe(405);
    expect(res._body.success).toBe(false);
    expect(res._body.errors).toContain('Method not allowed. Use POST.');
  });

  it('responds with 405 for a PUT request', () => {
    const req = makeReq('PUT', validBody);
    const res = makeRes();
    handler(req, res);
    expect(res._status).toBe(405);
  });
});
