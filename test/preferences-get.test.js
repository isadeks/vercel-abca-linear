// Tests for GET /api/preferences (api/preferences/get.js).
// Exercises the handler directly without an HTTP server, matching the
// pattern established in test/baseline.test.js.
import { describe, it, expect, beforeEach } from 'vitest';
import handler, { preferences } from '../api/preferences/get.js';

/** Minimal mock of a Vercel response object. */
function makeRes() {
  const res = {
    _status: 200,
    _body: null,
    status(code) {
      res._status = code;
      return res;
    },
    json(body) {
      res._body = body;
      return res;
    },
  };
  return res;
}

describe('GET /api/preferences', () => {
  // Reset preferences to known defaults before each test so tests are
  // independent of each other's mutations.
  beforeEach(() => {
    preferences.clear();
    preferences.set('currency', 'USD');
    preferences.set('language', 'en');
    preferences.set('theme', 'light');
    preferences.set('notifications', true);
    preferences.set('pageSize', 20);
  });

  it('returns 200 with all default preferences', () => {
    const req = { method: 'GET' };
    const res = makeRes();

    handler(req, res);

    expect(res._status).toBe(200);
    expect(res._body).toEqual({
      currency: 'USD',
      language: 'en',
      theme: 'light',
      notifications: true,
      pageSize: 20,
    });
  });

  it('returns a plain object (not a Map)', () => {
    const req = { method: 'GET' };
    const res = makeRes();

    handler(req, res);

    expect(res._body).not.toBeInstanceOf(Map);
    expect(typeof res._body).toBe('object');
  });

  it('reflects mutations made to the preferences Map', () => {
    preferences.set('currency', 'EUR');
    const req = { method: 'GET' };
    const res = makeRes();

    handler(req, res);

    expect(res._body.currency).toBe('EUR');
  });

  it('returns 405 for non-GET methods', () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const req = { method };
      const res = makeRes();

      handler(req, res);

      expect(res._status).toBe(405);
      expect(res._body).toEqual({ error: 'Method Not Allowed' });
    }
  });
});
