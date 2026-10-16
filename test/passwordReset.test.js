/**
 * Integration-style tests for the forgot-password and reset-password
 * API route handlers.  We call the handler functions directly with
 * lightweight req/res mocks — no HTTP server required.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import forgotPassword from '../api/auth/forgot-password.js';
import resetPassword  from '../api/auth/reset-password.js';
import { createUser, _resetStore }           from '../api/_lib/user.js';
import { _resetTokenStore }                  from '../api/_lib/resetToken.js';
import { _resetRefreshTokenStore }           from '../api/_lib/session.js';

// Silence the stubbed email console.info calls during tests.
vi.spyOn(console, 'info').mockImplementation(() => {});

const TEST_EMAIL    = 'reset-test@example.com';
const TEST_PASSWORD = 'OldPassword1!';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function makeRes() {
  const res = {
    _status: null,
    _body: null,
    _headers: {},
    status(code) { this._status = code; return this; },
    json(body)   { this._body = body;   return this; },
    setHeader(k, v) { this._headers[k] = v; return this; },
    end() { return this; },
  };
  return res;
}

async function callForgotPassword(body) {
  const req = { method: 'POST', headers: {}, body };
  const res = makeRes();
  await forgotPassword(req, res);
  return res;
}

async function callResetPassword(body) {
  const req = { method: 'POST', headers: {}, body };
  const res = makeRes();
  await resetPassword(req, res);
  return res;
}

// ---------------------------------------------------------------------------
// Test lifecycle
// ---------------------------------------------------------------------------

beforeEach(async () => {
  _resetStore();
  _resetTokenStore();
  _resetRefreshTokenStore();
  // Pre-create a test user.
  await createUser({ email: TEST_EMAIL, password: TEST_PASSWORD });
});

// ---------------------------------------------------------------------------
// forgot-password handler
// ---------------------------------------------------------------------------

describe('POST /api/auth/forgot-password', () => {
  it('returns 200 with the safe message for a registered email', async () => {
    const res = await callForgotPassword({ email: TEST_EMAIL });
    expect(res._status).toBe(200);
    expect(res._body.message).toMatch(/reset link/i);
  });

  it('returns 200 (same message) for an unregistered email — no enumeration', async () => {
    const res = await callForgotPassword({ email: 'nobody@example.com' });
    expect(res._status).toBe(200);
    expect(res._body.message).toMatch(/reset link/i);
  });

  it('returns 400 when email is missing', async () => {
    const res = await callForgotPassword({});
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/email/i);
  });

  it('returns 405 for non-POST methods', async () => {
    const req = { method: 'GET', headers: {}, body: {} };
    const res = makeRes();
    await forgotPassword(req, res);
    expect(res._status).toBe(405);
  });
});

// ---------------------------------------------------------------------------
// reset-password handler
// ---------------------------------------------------------------------------

describe('POST /api/auth/reset-password', () => {
  /** Helper: request a token for TEST_EMAIL via the handler. */
  async function getValidToken() {
    await callForgotPassword({ email: TEST_EMAIL });
    // The token is stored in the resetToken store; we need to obtain it.
    // We do this by generating one directly so we have the value.
    const { createResetToken } = await import('../api/_lib/resetToken.js');
    _resetTokenStore(); // wipe the handler-created one
    const { token } = createResetToken(TEST_EMAIL);
    return token;
  }

  it('resets the password and issues a new session on success', async () => {
    const token = await getValidToken();
    const res = await callResetPassword({
      email: TEST_EMAIL,
      token,
      password: 'NewPassword2!',
    });
    expect(res._status).toBe(200);
    expect(res._body.accessToken).toBeTruthy();
    expect(res._body.user.email).toBe(TEST_EMAIL);
    expect(res._headers['Set-Cookie']).toMatch(/refreshToken=/);
  });

  it('invalidates the token after a successful reset (single-use)', async () => {
    const token = await getValidToken();
    await callResetPassword({ email: TEST_EMAIL, token, password: 'NewPassword2!' });
    // Second attempt with the same token must fail.
    const res2 = await callResetPassword({ email: TEST_EMAIL, token, password: 'NewPassword3!' });
    expect(res2._status).toBe(400);
    expect(res2._body.error).toMatch(/token/i);
  });

  it('allows login with the new password after reset', async () => {
    const token = await getValidToken();
    const newPassword = 'UpdatedPass99!';
    await callResetPassword({ email: TEST_EMAIL, token, password: newPassword });

    // Verify the new password works via verifyPassword directly.
    const { findUserByEmail, verifyPassword } = await import('../api/_lib/user.js');
    const user = findUserByEmail(TEST_EMAIL);
    expect(await verifyPassword(newPassword, user.passwordHash)).toBe(true);
    expect(await verifyPassword(TEST_PASSWORD, user.passwordHash)).toBe(false);
  });

  it('returns 400 for an invalid token', async () => {
    const res = await callResetPassword({
      email: TEST_EMAIL,
      token: 'a'.repeat(64),
      password: 'NewPassword2!',
    });
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/token/i);
  });

  it('returns 400 when the email does not match the token', async () => {
    const { createResetToken } = await import('../api/_lib/resetToken.js');
    const { token } = createResetToken(TEST_EMAIL);
    const res = await callResetPassword({
      email: 'wrong@example.com',
      token,
      password: 'NewPassword2!',
    });
    expect(res._status).toBe(400);
  });

  it('returns 400 when the new password is too short', async () => {
    const { createResetToken } = await import('../api/_lib/resetToken.js');
    const { token } = createResetToken(TEST_EMAIL);
    const res = await callResetPassword({ email: TEST_EMAIL, token, password: 'short' });
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/password/i);
  });

  it('returns 400 when required fields are missing', async () => {
    const r1 = await callResetPassword({ token: 'x', password: 'newpass1' });
    expect(r1._status).toBe(400);

    const r2 = await callResetPassword({ email: TEST_EMAIL, password: 'newpass1' });
    expect(r2._status).toBe(400);

    const r3 = await callResetPassword({ email: TEST_EMAIL, token: 'x' });
    expect(r3._status).toBe(400);
  });

  it('returns 405 for non-POST methods', async () => {
    const req = { method: 'GET', headers: {}, body: {} };
    const res = makeRes();
    await resetPassword(req, res);
    expect(res._status).toBe(405);
  });
});
