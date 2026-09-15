/**
 * Integration tests for the /api/auth route handler.
 *
 * We don't spin up a real HTTP server; instead we mock the Vercel
 * req/res contract that handler() expects and inspect the calls made to
 * res.status().json() / res.setHeader().
 */

import { describe, it, expect, beforeEach } from 'vitest';
import handler from '../api/auth.js';
import { _resetUsersForTesting } from '../api/_lib/users.js';
import { SESSION_COOKIE_NAME } from '../api/_lib/session.js';

// ── helpers ────────────────────────────────────────────────────────────────

function makeRes() {
  const res = {
    _status: 200,
    _body: null,
    _headers: {},
    status(code) { res._status = code; return res; },
    json(body) { res._body = body; return res; },
    setHeader(name, value) { res._headers[name] = value; return res; },
  };
  return res;
}

/**
 * Build a fake request with a pre-parsed body (Vercel-style).
 */
function makePostReq(body, cookieHeader = '') {
  return {
    method: 'POST',
    headers: { cookie: cookieHeader },
    body,
  };
}

function makeGetReq(cookieHeader = '') {
  return {
    method: 'GET',
    headers: { cookie: cookieHeader },
  };
}

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  _resetUsersForTesting();
  process.env.SESSION_SECRET = 'auth-test-secret';
});

// ── Signup ─────────────────────────────────────────────────────────────────

describe('POST /api/auth { action: "signup" }', () => {
  it('creates a user and returns 201 with a Set-Cookie header', async () => {
    const req = makePostReq({ action: 'signup', email: 'new@example.com', password: 'NewUser1', confirmPassword: 'NewUser1', displayName: 'New User' });
    const res = makeRes();
    await handler(req, res);

    expect(res._status).toBe(201);
    expect(res._body.ok).toBe(true);
    expect(res._body.user.email).toBe('new@example.com');
    expect(res._headers['Set-Cookie']).toMatch(new RegExp(`^${SESSION_COOKIE_NAME}=`));
  });

  it('returns 422 for invalid inputs', async () => {
    const req = makePostReq({ action: 'signup', email: 'bad', password: '123', confirmPassword: '123', displayName: 'X' });
    const res = makeRes();
    await handler(req, res);

    expect(res._status).toBe(422);
    expect(res._body.ok).toBe(false);
    expect(Array.isArray(res._body.errors)).toBe(true);
    expect(res._body.errors.length).toBeGreaterThan(0);
  });

  it('returns 422 when passwords do not match', async () => {
    const req = makePostReq({ action: 'signup', email: 'a@b.com', password: 'Valid123', confirmPassword: 'Different1', displayName: 'Alice' });
    const res = makeRes();
    await handler(req, res);

    expect(res._status).toBe(422);
    expect(res._body.errors.some((e) => /match/i.test(e))).toBe(true);
  });

  it('returns 422 for a duplicate email', async () => {
    const body = { action: 'signup', email: 'dup@example.com', password: 'Dup12345', confirmPassword: 'Dup12345', displayName: 'Dup' };
    await handler(makePostReq(body), makeRes());
    const res = makeRes();
    await handler(makePostReq(body), res);

    expect(res._status).toBe(422);
    expect(res._body.errors[0]).toMatch(/already exists/i);
  });
});

// ── Signin ─────────────────────────────────────────────────────────────────

describe('POST /api/auth { action: "signin" }', () => {
  beforeEach(async () => {
    await handler(
      makePostReq({ action: 'signup', email: 'user@example.com', password: 'User1234', confirmPassword: 'User1234', displayName: 'User' }),
      makeRes(),
    );
  });

  it('signs in with correct credentials and sets a cookie', async () => {
    const req = makePostReq({ action: 'signin', email: 'user@example.com', password: 'User1234' });
    const res = makeRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._body.ok).toBe(true);
    expect(res._headers['Set-Cookie']).toMatch(new RegExp(`^${SESSION_COOKIE_NAME}=`));
  });

  it('returns 401 for wrong password', async () => {
    const req = makePostReq({ action: 'signin', email: 'user@example.com', password: 'WrongPass1' });
    const res = makeRes();
    await handler(req, res);

    expect(res._status).toBe(401);
    expect(res._body.ok).toBe(false);
  });

  it('returns 401 for unknown email', async () => {
    const req = makePostReq({ action: 'signin', email: 'ghost@example.com', password: 'Ghost1234' });
    const res = makeRes();
    await handler(req, res);

    expect(res._status).toBe(401);
  });
});

// ── Signout ────────────────────────────────────────────────────────────────

describe('POST /api/auth { action: "signout" }', () => {
  it('clears the session cookie', async () => {
    const req = makePostReq({ action: 'signout' });
    const res = makeRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._body.ok).toBe(true);
    expect(res._headers['Set-Cookie']).toContain('Max-Age=0');
  });
});

// ── GET session ────────────────────────────────────────────────────────────

describe('GET /api/auth', () => {
  it('returns 401 when no session cookie is present', async () => {
    const res = makeRes();
    await handler(makeGetReq(), res);
    expect(res._status).toBe(401);
  });

  it('returns the user when a valid session cookie is present', async () => {
    // Sign up to get a cookie
    const signupRes = makeRes();
    await handler(
      makePostReq({ action: 'signup', email: 'cookie@example.com', password: 'Cookie1x', confirmPassword: 'Cookie1x', displayName: 'Cookie' }),
      signupRes,
    );
    const setCookie = signupRes._headers['Set-Cookie'];
    const token = setCookie.split(';')[0].split('=').slice(1).join('=');
    const cookieHeader = `${SESSION_COOKIE_NAME}=${token}`;

    const res = makeRes();
    await handler(makeGetReq(cookieHeader), res);

    expect(res._status).toBe(200);
    expect(res._body.ok).toBe(true);
    expect(res._body.user.email).toBe('cookie@example.com');
  });
});

// ── Method / action errors ─────────────────────────────────────────────────

describe('error handling', () => {
  it('returns 405 for unsupported HTTP methods', async () => {
    const req = { method: 'DELETE', headers: {} };
    const res = makeRes();
    handler(req, res);
    expect(res._status).toBe(405);
  });

  it('returns 400 for unknown action', async () => {
    const req = makePostReq({ action: 'unknown' });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(400);
  });
});
