import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler from '../api/book.js';

/** Minimal mock of the Vercel/Node response object. */
function mockRes() {
  return {
    statusCode: 0,
    headers: {},
    body: undefined,
    setHeader(k, v) {
      this.headers[k.toLowerCase()] = v;
    },
    end(payload) {
      this.body = payload;
      this.ended = true;
    },
    json() {
      return JSON.parse(this.body);
    },
  };
}

function mockReq(method, body) {
  return { method, body };
}

function validBody(overrides = {}) {
  return {
    destinationId: 'amalfi',
    checkIn: '2026-09-10',
    checkOut: '2026-09-15',
    rooms: 1,
    guests: 2,
    email: 'traveler@example.com',
    ...overrides,
  };
}

let logSpy;
let warnSpy;

beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/book: success', () => {
  it('returns 200 with a quote and a correlated requestId', async () => {
    const req = mockReq('POST', validBody());
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    const payload = res.json();
    expect(payload.ok).toBe(true);
    expect(payload.requestId).toMatch(/^req_/);
    expect(payload.quote.destinationId).toBe('amalfi');
    expect(payload.quote.total).toBe('2352.00');

    // requestId is correlated across body, quote, and the X-Request-Id header.
    expect(payload.quote.requestId).toBe(payload.requestId);
    expect(res.headers['x-request-id']).toBe(payload.requestId);
  });

  it('emits a sanitized trip_quote_created event with no PII', async () => {
    const req = mockReq('POST', validBody());
    const res = mockRes();
    await handler(req, res);

    expect(logSpy).toHaveBeenCalledTimes(1);
    const event = JSON.parse(logSpy.mock.calls[0][0]);
    expect(event).toMatchObject({
      event: 'trip_quote_created',
      destinationId: 'amalfi',
      status: 200,
    });
    expect(event.requestId).toMatch(/^req_/);
    expect(typeof event.durationMs).toBe('number');
    // Never log email or full body.
    expect(Object.keys(event).sort()).toEqual(
      ['destinationId', 'durationMs', 'event', 'requestId', 'status'],
    );
    const serialized = logSpy.mock.calls[0][0];
    expect(serialized).not.toContain('traveler@example.com');
  });
});

describe('POST /api/book: rejections', () => {
  it('returns 405 for non-POST methods and logs the rejection', async () => {
    const req = mockReq('GET');
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.headers.allow).toBe('POST');
    const payload = res.json();
    expect(payload.ok).toBe(false);
    expect(payload.error.reason).toBe('method_not_allowed');
    expect(payload.requestId).toMatch(/^req_/);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const event = JSON.parse(warnSpy.mock.calls[0][0]);
    expect(event.event).toBe('trip_quote_rejected');
    expect(event.reason).toBe('method_not_allowed');
    expect(event.status).toBe(405);
  });

  it('returns 400 for sold-out dates with a matching log reason', async () => {
    const req = mockReq(
      'POST',
      validBody({ destinationId: 'kyoto', checkIn: '2026-10-10', checkOut: '2026-10-13' }),
    );
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.json().error.reason).toBe('sold_out');

    const event = JSON.parse(warnSpy.mock.calls[0][0]);
    expect(event.reason).toBe('sold_out');
    expect(event.destinationId).toBe('kyoto');
  });

  it('returns 400 for an invalid destination and omits destinationId in the log', async () => {
    const req = mockReq('POST', validBody({ destinationId: 'atlantis' }));
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.json().error.reason).toBe('invalid_destination');

    const event = JSON.parse(warnSpy.mock.calls[0][0]);
    expect(event.reason).toBe('invalid_destination');
    expect(event).not.toHaveProperty('destinationId');
  });

  it('returns 400 for a malformed email and never logs it', async () => {
    const req = mockReq('POST', validBody({ email: 'secret@leaked.com', extra: 1 }));
    // Force the email invalid while keeping the leaked-looking string present.
    req.body.email = 'not-an-email';
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.json().error.reason).toBe('invalid_email');
    expect(warnSpy.mock.calls[0][0]).not.toContain('leaked.com');
  });

  it('returns 400 for reversed dates and capacity violations', async () => {
    const reversed = mockRes();
    await handler(mockReq('POST', validBody({ checkIn: '2026-09-15', checkOut: '2026-09-10' })), reversed);
    expect(reversed.statusCode).toBe(400);
    expect(reversed.json().error.reason).toBe('invalid_date_range');

    const capacity = mockRes();
    await handler(mockReq('POST', validBody({ rooms: 1, guests: 5 })), capacity);
    expect(capacity.statusCode).toBe(400);
    expect(capacity.json().error.reason).toBe('capacity_exceeded');
  });

  it('returns 400 for invalid JSON string bodies', async () => {
    const req = { method: 'POST', body: '{ not json' };
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.json().error.reason).toBe('invalid_json');
  });

  it('emits exactly one log event per request', async () => {
    await handler(mockReq('POST', validBody()), mockRes());
    await handler(mockReq('GET'), mockRes());
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
