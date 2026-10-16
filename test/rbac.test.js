/**
 * Role-based access control (RBAC) tests.
 *
 * Covers:
 *  - ROLES enum / DEFAULT_ROLE / setUserRole on the User model
 *  - role claim included in JWT access tokens (session layer)
 *  - withRole() middleware wrapper: 401 / 403 / pass-through per role
 *  - me.js route returns role from token
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ROLES, DEFAULT_ROLE, createUser, upsertOAuthUser, setUserRole, _resetStore } from '../api/_lib/user.js';
import { createAccessToken, verifyAccessToken, _resetRefreshTokenStore } from '../api/_lib/session.js';
import { withRole } from '../api/_lib/middleware.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRes() {
  const res = {
    _status: null,
    _body: null,
    _headers: {},
    status(code) { this._status = code; return this; },
    json(body)  { this._body = body;   return this; },
    setHeader(k, v) { this._headers[k] = v; return this; },
    end() { return this; },
  };
  return res;
}

function makeReq(token) {
  return { headers: { authorization: token ? `Bearer ${token}` : '' } };
}

beforeEach(() => {
  _resetStore();
  _resetRefreshTokenStore();
});

// ---------------------------------------------------------------------------
// ROLES / DEFAULT_ROLE
// ---------------------------------------------------------------------------

describe('ROLES enum', () => {
  it('contains viewer, editor, admin in privilege order', () => {
    expect(ROLES).toEqual(['viewer', 'editor', 'admin']);
  });

  it('DEFAULT_ROLE is viewer', () => {
    expect(DEFAULT_ROLE).toBe('viewer');
  });
});

// ---------------------------------------------------------------------------
// User model — role field
// ---------------------------------------------------------------------------

describe('createUser — role field', () => {
  it('defaults to viewer when no role is specified', async () => {
    const user = await createUser({ email: 'v@example.com', password: 'password1' });
    expect(user.role).toBe('viewer');
  });

  it('accepts editor role', async () => {
    const user = await createUser({ email: 'e@example.com', password: 'password1', role: 'editor' });
    expect(user.role).toBe('editor');
  });

  it('accepts admin role', async () => {
    const user = await createUser({ email: 'a@example.com', password: 'password1', role: 'admin' });
    expect(user.role).toBe('admin');
  });

  it('throws for invalid role', async () => {
    await expect(createUser({ email: 'x@example.com', password: 'password1', role: 'superuser' }))
      .rejects.toThrow('role must be one of');
  });
});

describe('upsertOAuthUser — role field', () => {
  it('defaults to viewer when no role is specified', () => {
    const user = upsertOAuthUser({ email: 'oauth@example.com', provider: 'google', providerUserId: 'g-1' });
    expect(user.role).toBe('viewer');
  });

  it('accepts a specified role', () => {
    const user = upsertOAuthUser({ email: 'oa@example.com', provider: 'github', providerUserId: 'gh-1', role: 'editor' });
    expect(user.role).toBe('editor');
  });
});

describe('setUserRole', () => {
  it('promotes a user to editor', async () => {
    const created = await createUser({ email: 'pr@example.com', password: 'password1' });
    const updated = setUserRole(created.id, 'editor');
    expect(updated.role).toBe('editor');
    expect(updated.id).toBe(created.id);
  });

  it('promotes a user to admin', async () => {
    const created = await createUser({ email: 'ad@example.com', password: 'password1' });
    const updated = setUserRole(created.id, 'admin');
    expect(updated.role).toBe('admin');
  });

  it('demotes a user back to viewer', async () => {
    const created = await createUser({ email: 'de@example.com', password: 'password1', role: 'admin' });
    const updated = setUserRole(created.id, 'viewer');
    expect(updated.role).toBe('viewer');
  });

  it('throws for invalid role', async () => {
    const created = await createUser({ email: 'inv@example.com', password: 'password1' });
    expect(() => setUserRole(created.id, 'superuser')).toThrow('role must be one of');
  });

  it('throws for unknown userId', () => {
    expect(() => setUserRole('non-existent-id', 'admin')).toThrow('User not found');
  });
});

// ---------------------------------------------------------------------------
// Session — role claim in JWT
// ---------------------------------------------------------------------------

describe('createAccessToken / verifyAccessToken — role claim', () => {
  it('includes role in JWT payload', async () => {
    const token = await createAccessToken({ id: 'u1', email: 'r@example.com', role: 'editor' });
    const payload = await verifyAccessToken(token);
    expect(payload.role).toBe('editor');
  });

  it('includes role=admin for admin users', async () => {
    const token = await createAccessToken({ id: 'u2', email: 'admin@example.com', role: 'admin' });
    const payload = await verifyAccessToken(token);
    expect(payload.role).toBe('admin');
  });

  it('omits role claim when not provided (backward compat)', async () => {
    const token = await createAccessToken({ id: 'u3', email: 'norol@example.com' });
    const payload = await verifyAccessToken(token);
    expect(payload.role).toBeUndefined();
  });

  it('round-trips viewer role', async () => {
    const token = await createAccessToken({ id: 'u4', email: 'vw@example.com', role: 'viewer' });
    const payload = await verifyAccessToken(token);
    expect(payload.role).toBe('viewer');
  });
});

// ---------------------------------------------------------------------------
// withRole() middleware
// ---------------------------------------------------------------------------

describe('withRole — unauthenticated requests (401)', () => {
  it('returns 401 when no token is provided', async () => {
    const handler = withRole('viewer', async (_req, res) => {
      res.status(200).json({ ok: true });
    });
    const req = { headers: {} };
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(401);
  });

  it('returns 401 for an invalid token', async () => {
    const handler = withRole('viewer', async (_req, res) => {
      res.status(200).json({ ok: true });
    });
    const req = makeReq('invalid.token.here');
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(401);
  });
});

describe('withRole — viewer-restricted route', () => {
  it('allows viewer', async () => {
    const token = await createAccessToken({ id: 'u5', email: 'v5@example.com', role: 'viewer' });
    let capturedPayload;
    const handler = withRole('viewer', async (_req, res, payload) => {
      capturedPayload = payload;
      res.status(200).json({ ok: true });
    });
    const req = makeReq(token);
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(capturedPayload.role).toBe('viewer');
  });

  it('allows editor on a viewer route', async () => {
    const token = await createAccessToken({ id: 'u6', email: 'e6@example.com', role: 'editor' });
    const handler = withRole('viewer', async (_req, res) => {
      res.status(200).json({ ok: true });
    });
    const req = makeReq(token);
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(200);
  });

  it('allows admin on a viewer route', async () => {
    const token = await createAccessToken({ id: 'u7', email: 'a7@example.com', role: 'admin' });
    const handler = withRole('viewer', async (_req, res) => {
      res.status(200).json({ ok: true });
    });
    const req = makeReq(token);
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(200);
  });

  it('defaults to viewer when no role claim is in token', async () => {
    // Token without role claim — should still pass viewer check
    const token = await createAccessToken({ id: 'u8', email: 'nr8@example.com' });
    const handler = withRole('viewer', async (_req, res) => {
      res.status(200).json({ ok: true });
    });
    const req = makeReq(token);
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(200);
  });
});

describe('withRole — editor-restricted route', () => {
  it('denies viewer with 403', async () => {
    const token = await createAccessToken({ id: 'u9', email: 'v9@example.com', role: 'viewer' });
    const handler = withRole('editor', async (_req, res) => {
      res.status(200).json({ ok: true });
    });
    const req = makeReq(token);
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(403);
    expect(res._body.error).toBe('Insufficient permissions');
  });

  it('allows editor', async () => {
    const token = await createAccessToken({ id: 'u10', email: 'e10@example.com', role: 'editor' });
    const handler = withRole('editor', async (_req, res) => {
      res.status(200).json({ ok: true });
    });
    const req = makeReq(token);
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(200);
  });

  it('allows admin on an editor route', async () => {
    const token = await createAccessToken({ id: 'u11', email: 'a11@example.com', role: 'admin' });
    const handler = withRole('editor', async (_req, res) => {
      res.status(200).json({ ok: true });
    });
    const req = makeReq(token);
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(200);
  });

  it('denies no-role token (defaults to viewer) with 403', async () => {
    const token = await createAccessToken({ id: 'u12', email: 'nr12@example.com' });
    const handler = withRole('editor', async (_req, res) => {
      res.status(200).json({ ok: true });
    });
    const req = makeReq(token);
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(403);
  });
});

describe('withRole — admin-restricted route', () => {
  it('denies viewer with 403', async () => {
    const token = await createAccessToken({ id: 'u13', email: 'v13@example.com', role: 'viewer' });
    const handler = withRole('admin', async (_req, res) => {
      res.status(200).json({ ok: true });
    });
    const req = makeReq(token);
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(403);
  });

  it('denies editor with 403', async () => {
    const token = await createAccessToken({ id: 'u14', email: 'e14@example.com', role: 'editor' });
    const handler = withRole('admin', async (_req, res) => {
      res.status(200).json({ ok: true });
    });
    const req = makeReq(token);
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(403);
  });

  it('allows admin', async () => {
    const token = await createAccessToken({ id: 'u15', email: 'a15@example.com', role: 'admin' });
    let capturedPayload;
    const handler = withRole('admin', async (_req, res, payload) => {
      capturedPayload = payload;
      res.status(200).json({ ok: true });
    });
    const req = makeReq(token);
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(capturedPayload.role).toBe('admin');
  });
});

describe('withRole — construction guard', () => {
  it('throws immediately if requiredRole is invalid', () => {
    expect(() => withRole('superuser', async () => {})).toThrow('unknown role');
  });
});

// ---------------------------------------------------------------------------
// me.js handler includes role in response
// ---------------------------------------------------------------------------

describe('GET /api/auth/me — role in response', () => {
  it('returns role from token payload', async () => {
    // Import handler inline to keep test isolation simple
    const { default: meHandler } = await import('../api/auth/me.js');

    const token = await createAccessToken({ id: 'me-1', email: 'me@example.com', role: 'editor' });
    const req = {
      method: 'GET',
      headers: { authorization: `Bearer ${token}` },
    };
    const res = makeRes();
    await meHandler(req, res);
    expect(res._status).toBe(200);
    expect(res._body.role).toBe('editor');
    expect(res._body.email).toBe('me@example.com');
  });

  it('defaults to viewer when token has no role claim', async () => {
    const { default: meHandler } = await import('../api/auth/me.js');

    const token = await createAccessToken({ id: 'me-2', email: 'norole@example.com' });
    const req = {
      method: 'GET',
      headers: { authorization: `Bearer ${token}` },
    };
    const res = makeRes();
    await meHandler(req, res);
    expect(res._status).toBe(200);
    expect(res._body.role).toBe('viewer');
  });
});
