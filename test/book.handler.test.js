import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import handler from '../api/book.js';

// Minimal Vercel-style req/res doubles.
function makeReq({ method = 'POST', body, headers = {} } = {}) {
  return { method, body, headers };
}

function makeRes() {
  const res = {
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
  return res;
}

const validBody = () => ({
  destinationId: 'kyoto',
  checkIn: '2026-09-10',
  checkOut: '2026-09-15',
  rooms: 1,
  guests: 2,
  email: 'demo@example.com',
});

describe('POST /api/book — success scenario', () => {
  it('returns the Kyoto demo quote with a request id', () => {
    const req = makeReq({ body: validBody() });
    const res = makeRes();
    handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.quote).toEqual({
      destinationName: 'Kyoto',
      nights: 5,
      subtotalUsd: 1900,
      taxUsd: 228,
      totalUsd: 2128,
      currency: 'USD',
    });
    // Request correlation: id present in body and header, and they match.
    expect(typeof res.body.requestId).toBe('string');
    expect(res.body.requestId.length).toBeGreaterThan(0);
    expect(res.headers['x-request-id']).toBe(res.body.requestId);
  });

  it('accepts a JSON string body too', () => {
    const req = makeReq({ body: JSON.stringify(validBody()) });
    const res = makeRes();
    handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('POST /api/book — rejection scenarios', () => {
  it('rejects sold-out dates with a 400 and sold_out code', () => {
    const req = makeReq({
      body: { ...validBody(), checkIn: '2026-10-10', checkOut: '2026-10-12' },
    });
    const res = makeRes();
    handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      ok: false,
      requestId: res.body.requestId,
      error: { code: 'sold_out', message: 'The selected dates are not available.' },
    });
    expect(res.headers['x-request-id']).toBe(res.body.requestId);
  });

  it('rejects a validation failure with a 400', () => {
    const req = makeReq({ body: { ...validBody(), email: 'nope' } });
    const res = makeRes();
    handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('invalid_email');
  });

  it('rejects malformed JSON with a 400', () => {
    const req = makeReq({ body: '{ not json' });
    const res = makeRes();
    handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('invalid_json');
  });
});

describe('POST /api/book — method handling', () => {
  it('returns 405 with Allow: POST for other methods', () => {
    for (const method of ['GET', 'PUT', 'DELETE', 'PATCH']) {
      const req = makeReq({ method, body: undefined });
      const res = makeRes();
      handler(req, res);
      expect(res.statusCode).toBe(405);
      expect(res.headers.allow).toBe('POST');
      expect(res.body.error.code).toBe('method_not_allowed');
      expect(res.headers['x-request-id']).toBe(res.body.requestId);
    }
  });
});

describe('POST /api/book — request correlation', () => {
  it('honors a well-formed inbound x-request-id', () => {
    const req = makeReq({ body: validBody(), headers: { 'x-request-id': 'trace-abc-123' } });
    const res = makeRes();
    handler(req, res);
    expect(res.body.requestId).toBe('trace-abc-123');
    expect(res.headers['x-request-id']).toBe('trace-abc-123');
  });

  it('mints a new id when the inbound header is unusable', () => {
    const req = makeReq({ body: validBody(), headers: { 'x-request-id': 'has spaces!' } });
    const res = makeRes();
    handler(req, res);
    expect(res.body.requestId).not.toBe('has spaces!');
    expect(res.body.requestId.length).toBeGreaterThan(0);
  });
});

describe('POST /api/book — PII-free structured logs', () => {
  let logSpy;
  let errorSpy;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  function allLoggedText() {
    const calls = [...logSpy.mock.calls, ...errorSpy.mock.calls];
    return calls.map((args) => args.join(' ')).join('\n');
  }

  it('emits trip_quote_created without email or raw request', () => {
    const req = makeReq({ body: validBody() });
    const res = makeRes();
    handler(req, res);

    const text = allLoggedText();
    expect(text).toContain('trip_quote_created');
    expect(text).not.toContain('demo@example.com');

    // The emitted line must be valid JSON with only sanitized fields.
    const line = logSpy.mock.calls.map((a) => a[0]).find((l) => l.includes('trip_quote_created'));
    const parsed = JSON.parse(line);
    expect(parsed).toMatchObject({
      event: 'trip_quote_created',
      destinationId: 'kyoto',
      nights: 5,
      totalUsd: 2128,
      currency: 'USD',
    });
    expect(parsed).not.toHaveProperty('email');
  });

  it('emits trip_quote_rejected with only a code, no email', () => {
    const req = makeReq({
      body: { ...validBody(), checkIn: '2026-10-10', checkOut: '2026-10-12' },
    });
    const res = makeRes();
    handler(req, res);

    const line = errorSpy.mock.calls.map((a) => a[0]).find((l) => l.includes('trip_quote_rejected'));
    expect(line).toBeTruthy();
    const parsed = JSON.parse(line);
    expect(parsed).toMatchObject({ event: 'trip_quote_rejected', code: 'sold_out' });
    expect(parsed).not.toHaveProperty('email');
    expect(allLoggedText()).not.toContain('demo@example.com');
  });
});
