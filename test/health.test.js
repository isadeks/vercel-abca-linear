import { describe, it, expect } from 'vitest';
import handler from '../api/health.js';

function makeRes() {
  const res = { _status: null, _body: null };
  res.status = (code) => { res._status = code; return res; };
  res.json   = (body)  => { res._body  = body; return res; };
  return res;
}

describe('GET /api/health', () => {
  it('returns HTTP 200 with ok:true and a timestamp', () => {
    const res = makeRes();
    handler({}, res);
    expect(res._status).toBe(200);
    expect(res._body.ok).toBe(true);
    expect(typeof res._body.timestamp).toBe('string');
  });

  it('timestamp is a valid ISO date string', () => {
    const res = makeRes();
    handler({}, res);
    const parsed = new Date(res._body.timestamp);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
  });

  it('responds without throwing when called multiple times', () => {
    for (let i = 0; i < 5; i++) {
      const res = makeRes();
      expect(() => handler({}, res)).not.toThrow();
      expect(res._status).toBe(200);
    }
  });
});
