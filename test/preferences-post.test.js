// Tests for POST /api/preferences (api/preferences/post.js).
// Exercises the handler directly without an HTTP server, matching the
// pattern established in test/preferences-get.test.js.
import { describe, it, expect, beforeEach } from 'vitest';
import handler from '../api/preferences/post.js';
import { preferences } from '../api/preferences/get.js';

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

/** Build a minimal POST request with a plain-object body. */
function makeReq(body) {
  return { method: 'POST', body };
}

describe('POST /api/preferences', () => {
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

  // ── Happy path ──────────────────────────────────────────────────────────

  it('returns 200 with ok/key/value on valid input', async () => {
    const req = makeReq({ key: 'theme', value: 'dark' });
    const res = makeRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._body).toEqual({ ok: true, key: 'theme', value: 'dark' });
  });

  it('persists the new value to the shared preferences Map', async () => {
    const req = makeReq({ key: 'currency', value: 'EUR' });
    const res = makeRes();

    await handler(req, res);

    expect(preferences.get('currency')).toBe('EUR');
  });

  it('adds a new key that did not exist before', async () => {
    const req = makeReq({ key: 'timezone', value: 'Europe/Berlin' });
    const res = makeRes();

    await handler(req, res);

    expect(preferences.get('timezone')).toBe('Europe/Berlin');
    expect(res._status).toBe(200);
  });

  it('accepts a JSON string body and parses it', async () => {
    const req = { method: 'POST', body: JSON.stringify({ key: 'language', value: 'fr' }) };
    const res = makeRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(preferences.get('language')).toBe('fr');
  });

  it('accepts boolean values', async () => {
    const req = makeReq({ key: 'notifications', value: false });
    const res = makeRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(preferences.get('notifications')).toBe(false);
  });

  it('accepts numeric values', async () => {
    const req = makeReq({ key: 'pageSize', value: 50 });
    const res = makeRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(preferences.get('pageSize')).toBe(50);
  });

  it('accepts null as a value (explicit property present)', async () => {
    const req = makeReq({ key: 'theme', value: null });
    const res = makeRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(preferences.get('theme')).toBeNull();
  });

  // ── Method guard ────────────────────────────────────────────────────────

  it('returns 405 for non-POST methods', async () => {
    for (const method of ['GET', 'PUT', 'PATCH', 'DELETE']) {
      const req = { method, body: { key: 'theme', value: 'dark' } };
      const res = makeRes();

      await handler(req, res);

      expect(res._status).toBe(405);
      expect(res._body).toEqual({ error: 'Method Not Allowed' });
    }
  });

  // ── Malformed / invalid input ───────────────────────────────────────────

  it('returns 400 for invalid JSON string body', async () => {
    const req = { method: 'POST', body: 'not-json' };
    const res = makeRes();

    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({ error: expect.any(String) });
  });

  it('returns 400 when body is an array', async () => {
    const req = makeReq([{ key: 'theme', value: 'dark' }]);
    const res = makeRes();

    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({ error: expect.any(String) });
  });

  it('returns 400 when body is a primitive (number)', async () => {
    const req = makeReq(42);
    const res = makeRes();

    await handler(req, res);

    expect(res._status).toBe(400);
  });

  it('returns 400 when key is missing', async () => {
    const req = makeReq({ value: 'dark' });
    const res = makeRes();

    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({ error: expect.stringContaining('key') });
  });

  it('returns 400 when key is an empty string', async () => {
    const req = makeReq({ key: '', value: 'dark' });
    const res = makeRes();

    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({ error: expect.stringContaining('key') });
  });

  it('returns 400 when key is whitespace-only', async () => {
    const req = makeReq({ key: '   ', value: 'dark' });
    const res = makeRes();

    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({ error: expect.stringContaining('key') });
  });

  it('returns 400 when key is not a string', async () => {
    const req = makeReq({ key: 123, value: 'dark' });
    const res = makeRes();

    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({ error: expect.stringContaining('key') });
  });

  it('returns 400 when value property is absent', async () => {
    const req = makeReq({ key: 'theme' });
    const res = makeRes();

    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({ error: expect.stringContaining('value') });
  });
});
