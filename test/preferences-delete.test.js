// Tests for DELETE /api/preferences (api/preferences/delete.js).
// Exercises the handler directly without an HTTP server, matching the
// pattern established in test/preferences-post.test.js.
import { describe, it, expect, beforeEach } from 'vitest';
import handler from '../api/preferences/delete.js';
import { preferences, DEFAULTS } from '../api/preferences/get.js';

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

describe('DELETE /api/preferences', () => {
  // Modify preferences before each test so we can verify the reset actually
  // reverts non-default values.
  beforeEach(() => {
    preferences.clear();
    preferences.set('currency', 'EUR');
    preferences.set('language', 'fr');
    preferences.set('theme', 'dark');
    preferences.set('notifications', false);
    preferences.set('pageSize', 50);
    preferences.set('extra', 'should-be-removed');
  });

  // ── Happy path ──────────────────────────────────────────────────────────

  it('returns 200 with ok flag and restored preferences', () => {
    const req = { method: 'DELETE' };
    const res = makeRes();

    handler(req, res);

    expect(res._status).toBe(200);
    expect(res._body.ok).toBe(true);
    expect(res._body.preferences).toEqual(DEFAULTS);
  });

  it('resets the shared preferences Map to defaults', () => {
    const req = { method: 'DELETE' };
    const res = makeRes();

    handler(req, res);

    expect(Object.fromEntries(preferences)).toEqual(DEFAULTS);
  });

  it('removes keys that were not present in the defaults', () => {
    const req = { method: 'DELETE' };
    const res = makeRes();

    handler(req, res);

    expect(preferences.has('extra')).toBe(false);
  });

  it('returns the full default preference object in the body', () => {
    const req = { method: 'DELETE' };
    const res = makeRes();

    handler(req, res);

    expect(res._body.preferences).toMatchObject({
      currency:      DEFAULTS.currency,
      language:      DEFAULTS.language,
      theme:         DEFAULTS.theme,
      notifications: DEFAULTS.notifications,
      pageSize:      DEFAULTS.pageSize,
    });
  });

  // ── Method guard ────────────────────────────────────────────────────────

  it('returns 405 for non-DELETE methods', () => {
    for (const method of ['GET', 'POST', 'PUT', 'PATCH']) {
      const req = { method };
      const res = makeRes();

      handler(req, res);

      expect(res._status).toBe(405);
      expect(res._body).toEqual({ error: 'Method Not Allowed' });
    }
  });

  it('does not mutate preferences when method is not DELETE', () => {
    const req = { method: 'POST' };
    const res = makeRes();

    handler(req, res);

    // preferences still has the modified values from beforeEach
    expect(preferences.get('currency')).toBe('EUR');
  });
});
