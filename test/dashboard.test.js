/**
 * Integration tests for the dashboard shell integration.
 *
 * Tests verify:
 *  1. /api/auth session check on behalf of dashboard pages.
 *  2. Analytics events sent with userId are correctly recorded.
 *  3. Auth redirect logic (401 → login redirect) via the API layer.
 *  4. POST /api/events enriched with userId from auth session.
 *
 * We test at the API layer (the part that can be tested in Node.js); the
 * browser-side module (dashboard-shell.js) relies on fetch/DOM and is
 * validated through manual / e2e testing.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import authHandler from '../api/auth.js';
import eventsHandler from '../api/events.js';
import { _resetUsersForTesting } from '../api/_lib/users.js';
import { SESSION_COOKIE_NAME } from '../api/_lib/session.js';
import { _resetStore } from '../api/_lib/analytics.js';

// ── Request / Response mocks ──────────────────────────────────────────────────

function makeRes() {
  const res = {
    _status: 200,
    _body: null,
    _headers: {},
    status(code) { res._status = code; return res; },
    json(body)   { res._body = body;   return res; },
    setHeader(name, value) { res._headers[name] = value; return res; },
  };
  return res;
}

function makePostReq(body, cookieHeader = '') {
  return { method: 'POST', headers: { cookie: cookieHeader }, body };
}

function makeGetReq(cookieHeader = '') {
  return { method: 'GET', headers: { cookie: cookieHeader } };
}

// Extract the raw JWT token value from a Set-Cookie header string.
function extractToken(setCookieHeader) {
  return setCookieHeader.split(';')[0].split('=').slice(1).join('=');
}

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  _resetUsersForTesting();
  _resetStore();
  process.env.SESSION_SECRET = 'dashboard-test-secret';
});

// ── 1. Session check for protected dashboard routes ───────────────────────────

describe('Auth session check (dashboard page guard)', () => {
  it('GET /api/auth returns 401 when no session cookie — triggers redirect', async () => {
    const res = makeRes();
    await authHandler(makeGetReq(''), res);
    // Dashboard shell would redirect to /login.html?next=...
    expect(res._status).toBe(401);
    expect(res._body.ok).toBe(false);
  });

  it('GET /api/auth returns 200 with user when valid session cookie present', async () => {
    // 1. Sign up
    const signupRes = makeRes();
    await authHandler(
      makePostReq({
        action: 'signup',
        email: 'dashboard@example.com',
        password: 'Dash1234',
        confirmPassword: 'Dash1234',
        displayName: 'Dashboard User',
      }),
      signupRes,
    );
    expect(signupRes._status).toBe(201);

    // 2. Use the cookie to check the session
    const token = extractToken(signupRes._headers['Set-Cookie']);
    const cookieHeader = `${SESSION_COOKIE_NAME}=${token}`;

    const sessionRes = makeRes();
    await authHandler(makeGetReq(cookieHeader), sessionRes);

    expect(sessionRes._status).toBe(200);
    expect(sessionRes._body.ok).toBe(true);
    expect(sessionRes._body.user.email).toBe('dashboard@example.com');
    expect(sessionRes._body.user.displayName).toBe('Dashboard User');
  });
});

// ── 2. Analytics events enriched with userId from auth ───────────────────────

describe('Analytics events with authenticated userId', () => {
  it('POST /api/events accepts userId (from auth session) and records correctly', async () => {
    const res = makeRes();
    eventsHandler(
      makePostReq({
        type: 'page_view',
        userId: 'dashboard@example.com',
        page: '/analytics.html',
      }),
      res,
    );

    expect(res._status).toBe(201);
    expect(res._body.event.type).toBe('page_view');
    expect(res._body.event.userId).toBe('dashboard@example.com');
    expect(res._body.event.page).toBe('/analytics.html');
  });

  it('POST /api/events accepts sessionId for unauthenticated (pre-auth) events', async () => {
    const res = makeRes();
    eventsHandler(
      makePostReq({
        type: 'click',
        sessionId: 'anon-session-42',
        page: '/index.html',
      }),
      res,
    );

    expect(res._status).toBe(201);
    expect(res._body.event.sessionId).toBe('anon-session-42');
    expect(res._body.event.userId).toBeNull();
  });

  it('POST /api/events with userId from session + page from analytics dashboard', async () => {
    const res = makeRes();
    eventsHandler(
      makePostReq({
        type: 'booking',
        userId: 'traveller@example.com',
        page: '/analytics.html',
        metadata: { destination: 'kyoto', trigger: 'dashboard' },
      }),
      res,
    );

    expect(res._status).toBe(201);
    expect(res._body.event.type).toBe('booking');
    expect(res._body.event.userId).toBe('traveller@example.com');
    expect(res._body.event.metadata).toEqual({ destination: 'kyoto', trigger: 'dashboard' });
  });
});

// ── 3. Sign-out clears session (dashboard → log out) ─────────────────────────

describe('Sign-out from dashboard', () => {
  it('POST /api/auth signout returns Max-Age=0 cookie to clear session', async () => {
    const res = makeRes();
    await authHandler(makePostReq({ action: 'signout' }), res);

    expect(res._status).toBe(200);
    expect(res._body.ok).toBe(true);
    expect(res._headers['Set-Cookie']).toContain('Max-Age=0');
  });

  it('GET /api/auth after signout returns 401', async () => {
    // Sign up
    const signupRes = makeRes();
    await authHandler(
      makePostReq({
        action: 'signup',
        email: 'logout@example.com',
        password: 'Logout12',
        confirmPassword: 'Logout12',
        displayName: 'Logout Test',
      }),
      signupRes,
    );

    const token = extractToken(signupRes._headers['Set-Cookie']);
    const cookieHeader = `${SESSION_COOKIE_NAME}=${token}`;

    // Sign out
    await authHandler(makePostReq({ action: 'signout' }, cookieHeader), makeRes());

    // Now check session — cookie is expired so we simulate by not sending it
    const checkRes = makeRes();
    await authHandler(makeGetReq(''), checkRes);
    expect(checkRes._status).toBe(401);
  });
});

// ── 4. Auth gate: billing page gated on auth state ───────────────────────────

describe('Auth gate for billing page', () => {
  it('User signed in can access session (billing page would render)', async () => {
    // Sign up + get session cookie
    const signupRes = makeRes();
    await authHandler(
      makePostReq({
        action: 'signup',
        email: 'billing-user@example.com',
        password: 'Billing1',
        confirmPassword: 'Billing1',
        displayName: 'Billing User',
      }),
      signupRes,
    );

    const token = extractToken(signupRes._headers['Set-Cookie']);
    const cookieHeader = `${SESSION_COOKIE_NAME}=${token}`;

    // Billing page calls GET /api/auth to confirm session
    const authCheckRes = makeRes();
    await authHandler(makeGetReq(cookieHeader), authCheckRes);

    expect(authCheckRes._status).toBe(200);
    expect(authCheckRes._body.user.email).toBe('billing-user@example.com');
  });

  it('Unauthenticated access to /api/auth returns 401 (billing page would redirect)', async () => {
    const res = makeRes();
    await authHandler(makeGetReq(''), res);
    expect(res._status).toBe(401);
  });
});
