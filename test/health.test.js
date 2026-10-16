// Unit tests for the GET /api/health liveness endpoint.
//
// The handler follows Vercel's `(req, res)` serverless signature, so we drive
// it with a minimal fake `res` that records the status code and JSON body.
import { describe, it, expect } from 'vitest';
import handler from '../api/health.js';

function makeRes() {
  return {
    statusCode: undefined,
    body: undefined,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
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

describe('GET /api/health', () => {
  it('returns 200 with { status: "ok", time: <ISO-8601 UTC> }', () => {
    const res = makeRes();
    handler({ method: 'GET' }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toBeTypeOf('object');
    expect(res.body.status).toBe('ok');

    // `time` must be a valid ISO-8601 UTC timestamp generated per request.
    expect(typeof res.body.time).toBe('string');
    expect(res.body.time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    const parsed = new Date(res.body.time);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
    // Round-trips back to the same instant → confirms it's genuine ISO-8601 UTC.
    expect(parsed.toISOString()).toBe(res.body.time);
  });

  it('generates a fresh timestamp on each request', async () => {
    const first = makeRes();
    handler({ method: 'GET' }, first);
    await new Promise((r) => setTimeout(r, 5));
    const second = makeRes();
    handler({ method: 'GET' }, second);

    expect(new Date(second.body.time).getTime()).toBeGreaterThanOrEqual(
      new Date(first.body.time).getTime(),
    );
  });

  it('rejects non-GET methods with 405', () => {
    const res = makeRes();
    handler({ method: 'POST' }, res);

    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('GET');
  });
});
