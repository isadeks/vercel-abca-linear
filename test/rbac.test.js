// Integration tests for RBAC:
//   - roles.js (ROLES, hasRequiredRole, isValidRole)
//   - rbac.js  (requireRole HOF)
//   - db-adapter.js user role support (role field + updateUserRole)
//
// These tests exercise authorized and unauthorized access scenarios as required
// by ABCA-448.

import { describe, it, expect, beforeEach } from 'vitest';

import { ROLES, ROLE_LIST, hasRequiredRole, isValidRole } from '../api/_lib/roles.js';
import { setRbacUserAdapter, requireRole } from '../api/_lib/rbac.js';
import { setSessionAdapter, createSession } from '../api/_lib/session.js';
import { buildInMemoryAdapter, buildInMemoryUserAdapter } from '../api/_lib/db-adapter.js';

const SECRET = 'rbac-test-jwt-secret';

// ── ROLES constants ───────────────────────────────────────────────────────────

describe('ROLES', () => {
  it('defines viewer, editor, admin', () => {
    expect(ROLES.VIEWER).toBe('viewer');
    expect(ROLES.EDITOR).toBe('editor');
    expect(ROLES.ADMIN).toBe('admin');
  });

  it('ROLE_LIST contains all three roles in ascending order', () => {
    expect(ROLE_LIST).toEqual(['viewer', 'editor', 'admin']);
  });

  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(ROLES)).toBe(true);
  });
});

// ── hasRequiredRole ───────────────────────────────────────────────────────────

describe('hasRequiredRole', () => {
  it('viewer satisfies viewer', () => {
    expect(hasRequiredRole('viewer', 'viewer')).toBe(true);
  });

  it('editor satisfies viewer', () => {
    expect(hasRequiredRole('editor', 'viewer')).toBe(true);
  });

  it('admin satisfies viewer', () => {
    expect(hasRequiredRole('admin', 'viewer')).toBe(true);
  });

  it('editor satisfies editor', () => {
    expect(hasRequiredRole('editor', 'editor')).toBe(true);
  });

  it('admin satisfies editor', () => {
    expect(hasRequiredRole('admin', 'editor')).toBe(true);
  });

  it('admin satisfies admin', () => {
    expect(hasRequiredRole('admin', 'admin')).toBe(true);
  });

  it('viewer does NOT satisfy editor', () => {
    expect(hasRequiredRole('viewer', 'editor')).toBe(false);
  });

  it('viewer does NOT satisfy admin', () => {
    expect(hasRequiredRole('viewer', 'admin')).toBe(false);
  });

  it('editor does NOT satisfy admin', () => {
    expect(hasRequiredRole('editor', 'admin')).toBe(false);
  });

  it('unknown role does NOT satisfy viewer', () => {
    expect(hasRequiredRole('superuser', 'viewer')).toBe(false);
  });

  it('unknown required role is never satisfied', () => {
    expect(hasRequiredRole('admin', 'superuser')).toBe(false);
  });
});

// ── isValidRole ───────────────────────────────────────────────────────────────

describe('isValidRole', () => {
  it('accepts known roles', () => {
    expect(isValidRole('viewer')).toBe(true);
    expect(isValidRole('editor')).toBe(true);
    expect(isValidRole('admin')).toBe(true);
  });

  it('rejects unknown roles', () => {
    expect(isValidRole('superuser')).toBe(false);
    expect(isValidRole('')).toBe(false);
    expect(isValidRole(undefined)).toBe(false);
  });
});

// ── db-adapter: user role field ───────────────────────────────────────────────

describe('buildInMemoryUserAdapter — role field', () => {
  it('defaults new users to role=viewer', async () => {
    const adapter = buildInMemoryUserAdapter();
    const user = await adapter.createUser({ email: 'a@example.com', name: 'A' });
    expect(user.role).toBe('viewer');
  });

  it('accepts an explicit role on creation', async () => {
    const adapter = buildInMemoryUserAdapter();
    const user = await adapter.createUser({ email: 'b@example.com', name: 'B', role: 'admin' });
    expect(user.role).toBe('admin');
  });

  it('updateUserRole changes the role', async () => {
    const adapter = buildInMemoryUserAdapter();
    const created = await adapter.createUser({ email: 'c@example.com', name: 'C' });
    const updated = await adapter.updateUserRole(created.id, 'editor');
    expect(updated.role).toBe('editor');
  });

  it('updateUserRole is reflected in subsequent findUserById calls', async () => {
    const adapter = buildInMemoryUserAdapter();
    const created = await adapter.createUser({ email: 'd@example.com', name: 'D' });
    await adapter.updateUserRole(created.id, 'admin');
    const found = await adapter.findUserById(created.id);
    expect(found.role).toBe('admin');
  });

  it('updateUserRole is reflected in subsequent findUserByEmail calls', async () => {
    const adapter = buildInMemoryUserAdapter();
    const created = await adapter.createUser({ email: 'e@example.com', name: 'E' });
    await adapter.updateUserRole(created.id, 'admin');
    const found = await adapter.findUserByEmail('e@example.com');
    expect(found.role).toBe('admin');
  });

  it('updateUserRole throws for unknown user', async () => {
    const adapter = buildInMemoryUserAdapter();
    await expect(adapter.updateUserRole('no-such-id', 'admin')).rejects.toThrow('User not found');
  });
});

// ── requireRole HOF ───────────────────────────────────────────────────────────

// Helper: build a minimal fake req/res for unit testing Vercel handlers.
function mockReqRes({ cookieHeader = '', method = 'GET' } = {}) {
  const res = {
    _status: null,
    _body:   null,
    _headers: {},
    status(code) { this._status = code; return this; },
    json(body)   { this._body   = body; return this; },
    setHeader(k, v) { this._headers[k] = v; },
  };

  const req = {
    method,
    headers: { cookie: cookieHeader },
    user: null,
    query: {},
  };

  return { req, res };
}

// Helper: create a real session + access-token cookie string
async function createSessionCookie(userId, secret, adapter) {
  await createSession(userId, secret);
  // adapter.findByUserId is the session adapter — find the stored token
  const stored = await adapter.findByUserId(userId);
  return `session=${stored.accessToken}`;
}

describe('requireRole — unauthorized (no session cookie)', () => {
  beforeEach(() => {
    const userAdapter    = buildInMemoryUserAdapter();
    const sessionAdapter = buildInMemoryAdapter();
    setSessionAdapter(sessionAdapter);
    setRbacUserAdapter(userAdapter);
  });

  it('returns 401 when cookie is absent', async () => {
    const handler = requireRole(ROLES.VIEWER, async (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const { req, res } = mockReqRes();
    process.env.JWT_SECRET = SECRET;

    await handler(req, res);

    expect(res._status).toBe(401);
    expect(res._body.error).toMatch(/authentication required/i);
  });

  it('returns 401 when session cookie has an invalid token', async () => {
    const handler = requireRole(ROLES.VIEWER, async (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const { req, res } = mockReqRes({ cookieHeader: 'session=not.a.valid.jwt' });
    process.env.JWT_SECRET = SECRET;

    await handler(req, res);

    expect(res._status).toBe(401);
    expect(res._body.error).toMatch(/invalid or expired/i);
  });
});

describe('requireRole — authorized scenarios', () => {
  let userAdapter;
  let sessionAdapter;

  beforeEach(() => {
    userAdapter    = buildInMemoryUserAdapter();
    sessionAdapter = buildInMemoryAdapter();
    setSessionAdapter(sessionAdapter);
    setRbacUserAdapter(userAdapter);
    process.env.JWT_SECRET = SECRET;
  });

  it('allows a viewer to access a viewer-only route', async () => {
    const user = await userAdapter.createUser({ email: 'v@example.com', name: 'Viewer', role: 'viewer' });
    const cookie = await createSessionCookie(user.id, SECRET, sessionAdapter);

    const handler = requireRole(ROLES.VIEWER, async (req, res) => {
      res.status(200).json({ userId: req.user.userId, role: req.user.role });
    });

    const { req, res } = mockReqRes({ cookieHeader: cookie });
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._body.userId).toBe(user.id);
    expect(res._body.role).toBe('viewer');
  });

  it('allows an editor to access a viewer route', async () => {
    const user = await userAdapter.createUser({ email: 'e@example.com', name: 'Editor', role: 'editor' });
    const cookie = await createSessionCookie(user.id, SECRET, sessionAdapter);

    const handler = requireRole(ROLES.VIEWER, async (req, res) => {
      res.status(200).json({ role: req.user.role });
    });

    const { req, res } = mockReqRes({ cookieHeader: cookie });
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._body.role).toBe('editor');
  });

  it('allows an admin to access an editor route', async () => {
    const user = await userAdapter.createUser({ email: 'a@example.com', name: 'Admin', role: 'admin' });
    const cookie = await createSessionCookie(user.id, SECRET, sessionAdapter);

    const handler = requireRole(ROLES.EDITOR, async (req, res) => {
      res.status(200).json({ role: req.user.role });
    });

    const { req, res } = mockReqRes({ cookieHeader: cookie });
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._body.role).toBe('admin');
  });

  it('allows an admin to access an admin route', async () => {
    const user = await userAdapter.createUser({ email: 'sa@example.com', name: 'SuperAdmin', role: 'admin' });
    const cookie = await createSessionCookie(user.id, SECRET, sessionAdapter);

    const handler = requireRole(ROLES.ADMIN, async (req, res) => {
      res.status(200).json({ ok: true });
    });

    const { req, res } = mockReqRes({ cookieHeader: cookie });
    await handler(req, res);

    expect(res._status).toBe(200);
  });
});

describe('requireRole — unauthorized (insufficient role)', () => {
  let userAdapter;
  let sessionAdapter;

  beforeEach(() => {
    userAdapter    = buildInMemoryUserAdapter();
    sessionAdapter = buildInMemoryAdapter();
    setSessionAdapter(sessionAdapter);
    setRbacUserAdapter(userAdapter);
    process.env.JWT_SECRET = SECRET;
  });

  it('returns 403 when viewer tries to access an editor route', async () => {
    const user = await userAdapter.createUser({ email: 'v2@example.com', name: 'Viewer2', role: 'viewer' });
    const cookie = await createSessionCookie(user.id, SECRET, sessionAdapter);

    const handler = requireRole(ROLES.EDITOR, async (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const { req, res } = mockReqRes({ cookieHeader: cookie });
    await handler(req, res);

    expect(res._status).toBe(403);
    expect(res._body.error).toMatch(/insufficient permissions/i);
  });

  it('returns 403 when viewer tries to access an admin route', async () => {
    const user = await userAdapter.createUser({ email: 'v3@example.com', name: 'Viewer3', role: 'viewer' });
    const cookie = await createSessionCookie(user.id, SECRET, sessionAdapter);

    const handler = requireRole(ROLES.ADMIN, async (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const { req, res } = mockReqRes({ cookieHeader: cookie });
    await handler(req, res);

    expect(res._status).toBe(403);
  });

  it('returns 403 when editor tries to access an admin route', async () => {
    const user = await userAdapter.createUser({ email: 'ed2@example.com', name: 'Editor2', role: 'editor' });
    const cookie = await createSessionCookie(user.id, SECRET, sessionAdapter);

    const handler = requireRole(ROLES.ADMIN, async (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const { req, res } = mockReqRes({ cookieHeader: cookie });
    await handler(req, res);

    expect(res._status).toBe(403);
  });
});

describe('requireRole — role promotion via updateUserRole', () => {
  let userAdapter;
  let sessionAdapter;

  beforeEach(() => {
    userAdapter    = buildInMemoryUserAdapter();
    sessionAdapter = buildInMemoryAdapter();
    setSessionAdapter(sessionAdapter);
    setRbacUserAdapter(userAdapter);
    process.env.JWT_SECRET = SECRET;
  });

  it('allows access after viewer is promoted to editor', async () => {
    const user = await userAdapter.createUser({ email: 'promo@example.com', name: 'Promo' }); // default: viewer
    const cookie = await createSessionCookie(user.id, SECRET, sessionAdapter);

    // Before promotion — should be 403
    const handler = requireRole(ROLES.EDITOR, async (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const { req: req1, res: res1 } = mockReqRes({ cookieHeader: cookie });
    await handler(req1, res1);
    expect(res1._status).toBe(403);

    // Promote the user
    await userAdapter.updateUserRole(user.id, 'editor');

    // After promotion — should be 200
    const { req: req2, res: res2 } = mockReqRes({ cookieHeader: cookie });
    await handler(req2, res2);
    expect(res2._status).toBe(200);
  });
});

describe('requireRole — injects req.user', () => {
  let userAdapter;
  let sessionAdapter;

  beforeEach(() => {
    userAdapter    = buildInMemoryUserAdapter();
    sessionAdapter = buildInMemoryAdapter();
    setSessionAdapter(sessionAdapter);
    setRbacUserAdapter(userAdapter);
    process.env.JWT_SECRET = SECRET;
  });

  it('injects userId and role into req.user', async () => {
    const user = await userAdapter.createUser({ email: 'inj@example.com', name: 'Inj', role: 'editor' });
    const cookie = await createSessionCookie(user.id, SECRET, sessionAdapter);

    let captured = null;
    const handler = requireRole(ROLES.VIEWER, async (req, res) => {
      captured = req.user;
      res.status(200).json({});
    });

    const { req, res } = mockReqRes({ cookieHeader: cookie });
    await handler(req, res);

    expect(captured).not.toBeNull();
    expect(captured.userId).toBe(user.id);
    expect(captured.role).toBe('editor');
  });
});
