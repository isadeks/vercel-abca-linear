/**
 * Tests for /api/notify/email Vercel handler.
 *
 * The handler is a plain async function — we construct minimal mock req/res
 * objects (Node-style) so we don't need an HTTP server.
 */
import { describe, it, expect } from 'vitest';
import handler from '../api/notify/email.js';

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

/**
 * Creates a minimal mock IncomingMessage-like object with a pre-parsed body.
 * (Vercel runtime pre-parses JSON bodies on req.body.)
 * @param {string} method
 * @param {unknown} body
 * @returns {object}
 */
function makeReq(method, body) {
  return { method, body };
}

/**
 * Creates a minimal mock ServerResponse that captures status + JSON.
 * @returns {{ statusCode: number, headers: object, body: unknown, setHeader: Function, end: Function }}
 */
function makeRes() {
  const res = {
    statusCode: 200,
    headers: {},
    rawBody: '',
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(data) {
      this.rawBody = data;
      try {
        this.body = JSON.parse(data);
      } catch {
        this.body = data;
      }
    },
  };
  return res;
}

// ---------------------------------------------------------------------------
// Valid request fixture
// ---------------------------------------------------------------------------

const validBody = {
  to: 'guest@example.com',
  template: 'booking_confirmation',
  data: {
    guestName: 'Alice',
    destination: 'Santorini',
    bookingRef: 'WND-001',
    checkIn: '2026-07-01',
    checkOut: '2026-07-08',
    guests: 2,
    roomType: 'Suite',
    totalAmount: '$1,000',
  },
};

// ---------------------------------------------------------------------------
// Method guard
// ---------------------------------------------------------------------------

describe('POST /api/notify/email — method guard', () => {
  it('returns 405 for GET requests', async () => {
    const req = makeReq('GET', null);
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toMatch(/method not allowed/i);
  });

  it('returns 405 for PATCH requests', async () => {
    const req = makeReq('PATCH', {});
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });
});

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe('POST /api/notify/email — input validation', () => {
  it('returns 400 when "to" is missing', async () => {
    const req = makeReq('POST', { ...validBody, to: undefined });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toMatch(/to/i);
  });

  it('returns 400 when "to" is not a valid email', async () => {
    const req = makeReq('POST', { ...validBody, to: 'not-an-email' });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when "template" is missing', async () => {
    const req = makeReq('POST', { ...validBody, template: undefined });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/template/i);
  });

  it('returns 400 when "data" is missing', async () => {
    const req = makeReq('POST', { ...validBody, data: undefined });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/data/i);
  });

  it('returns 400 when "data" is an array', async () => {
    const req = makeReq('POST', { ...validBody, data: [] });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for an unknown template name', async () => {
    const req = makeReq('POST', { ...validBody, template: 'nonexistent_template' });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/unknown email template/i);
  });
});

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe('POST /api/notify/email — success', () => {
  it('returns 202 with ok:true and a jobId', async () => {
    const req = makeReq('POST', validBody);
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(202);
    expect(res.body.ok).toBe(true);
    expect(res.body.jobId).toBeTruthy();
    expect(res.body.message).toBe('Email queued.');
  });

  it('works for booking_cancellation template', async () => {
    const req = makeReq('POST', {
      to: 'guest@example.com',
      template: 'booking_cancellation',
      data: {
        guestName: 'Bob',
        destination: 'Kyoto',
        bookingRef: 'WND-099',
        cancelledAt: '2026-06-20',
        refundAmount: '$500',
        refundTimeline: '5 days',
      },
    });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(202);
    expect(res.body.ok).toBe(true);
  });

  it('works for booking_reminder template', async () => {
    const req = makeReq('POST', {
      to: 'guest@example.com',
      template: 'booking_reminder',
      data: {
        guestName: 'Carol',
        destination: 'Patagonia',
        bookingRef: 'WND-143',
        checkIn: '2026-06-24',
        checkOut: '2026-07-01',
        propertyAddress: '123 Andes Road',
      },
    });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(202);
  });

  it('works for password_reset template', async () => {
    const req = makeReq('POST', {
      to: 'user@example.com',
      template: 'password_reset',
      data: {
        guestName: 'Dave',
        resetUrl: 'https://wander.travel/reset?token=tok',
        expiresIn: '1 hour',
      },
    });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(202);
    expect(res.body.jobId).toBeTruthy();
  });

  it('sets Content-Type: application/json', async () => {
    const req = makeReq('POST', validBody);
    const res = makeRes();
    await handler(req, res);
    expect(res.headers['Content-Type']).toBe('application/json');
  });

  it('returns a different jobId for each request', async () => {
    const ids = new Set();
    for (let i = 0; i < 3; i++) {
      const res = makeRes();
      await handler(makeReq('POST', validBody), res);
      ids.add(res.body.jobId);
    }
    expect(ids.size).toBe(3);
  });
});
