// Integration-style tests for the serverless auth endpoints, driving them with
// lightweight mock (req, res) objects — no HTTP server required.
import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore } from '../api/_lib/store.js';
import { SESSION_COOKIE } from '../api/_lib/http.js';
import signup from '../api/signup.js';
import login from '../api/login.js';
import logout from '../api/logout.js';
import currentSession from '../api/current-session.js';

function mockReq({ method = 'POST', body = {}, cookies = '' } = {}) {
  return { method, body, headers: cookies ? { cookie: cookies } : {} };
}

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(k, v) { this.headers[k] = v; },
    end(payload) { this.body = payload ? JSON.parse(payload) : undefined; },
  };
}

// Pull the session token out of a Set-Cookie header.
function cookieToken(res) {
  const sc = res.headers['Set-Cookie'] || '';
  const m = sc.match(new RegExp(`${SESSION_COOKIE}=([^;]*)`));
  return m ? m[1] : null;
}

describe('auth endpoints', () => {
  beforeEach(() => {
    resetStore();
  });

  it('signup creates an account, signs in, and sets a session cookie', async () => {
    const res = mockRes();
    await signup(mockReq({ body: { email: 'a@b.com', password: 'password123' } }), res);
    expect(res.statusCode).toBe(201);
    expect(res.body.user.email).toBe('a@b.com');
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(cookieToken(res)).toBeTruthy();
  });

  it('signup rejects a duplicate email with 409', async () => {
    await signup(mockReq({ body: { email: 'a@b.com', password: 'password123' } }), mockRes());
    const res = mockRes();
    await signup(mockReq({ body: { email: 'a@b.com', password: 'password123' } }), res);
    expect(res.statusCode).toBe(409);
  });

  it('signup rejects a weak password with 400', async () => {
    const res = mockRes();
    await signup(mockReq({ body: { email: 'a@b.com', password: 'x' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('login succeeds with correct credentials', async () => {
    await signup(mockReq({ body: { email: 'a@b.com', password: 'password123' } }), mockRes());
    const res = mockRes();
    await login(mockReq({ body: { email: 'a@b.com', password: 'password123' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.user.email).toBe('a@b.com');
    expect(cookieToken(res)).toBeTruthy();
  });

  it('login rejects bad credentials with 401', async () => {
    await signup(mockReq({ body: { email: 'a@b.com', password: 'password123' } }), mockRes());
    const res = mockRes();
    await login(mockReq({ body: { email: 'a@b.com', password: 'nope' } }), res);
    expect(res.statusCode).toBe(401);
    expect(res.body.user).toBeUndefined();
  });

  it('current-session returns the user when the cookie is valid (stays signed in)', async () => {
    const signupRes = mockRes();
    await signup(mockReq({ body: { email: 'a@b.com', password: 'password123' } }), signupRes);
    const token = cookieToken(signupRes);

    const res = mockRes();
    await currentSession(mockReq({ method: 'GET', cookies: `${SESSION_COOKIE}=${token}` }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.user.email).toBe('a@b.com');
  });

  it('current-session returns null user for anonymous visitors', async () => {
    const res = mockRes();
    await currentSession(mockReq({ method: 'GET' }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.user).toBeNull();
  });

  it('logout destroys the session so current-session goes anonymous', async () => {
    const signupRes = mockRes();
    await signup(mockReq({ body: { email: 'a@b.com', password: 'password123' } }), signupRes);
    const token = cookieToken(signupRes);

    const logoutRes = mockRes();
    await logout(mockReq({ cookies: `${SESSION_COOKIE}=${token}` }), logoutRes);
    expect(logoutRes.statusCode).toBe(200);
    expect(logoutRes.headers['Set-Cookie']).toContain('Max-Age=0');

    const res = mockRes();
    await currentSession(mockReq({ method: 'GET', cookies: `${SESSION_COOKIE}=${token}` }), res);
    expect(res.body.user).toBeNull();
  });

  it('rejects wrong HTTP methods with 405', async () => {
    const res = mockRes();
    await signup(mockReq({ method: 'GET' }), res);
    expect(res.statusCode).toBe(405);
  });
});
