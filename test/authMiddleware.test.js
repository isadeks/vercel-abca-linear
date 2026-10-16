import { describe, it, expect, beforeEach } from 'vitest';
import { requireAuth, requireAdmin } from '../api/_lib/authMiddleware.js';
import { signToken } from '../api/_lib/auth.js';
import { _resetForTests } from '../api/_lib/users.js';

/** Build a minimal mock request with an Authorization header. */
function makeReq(token) {
  return { headers: { authorization: token ? `Bearer ${token}` : '' } };
}

/** Build a minimal mock response that captures the last JSON send. */
function makeRes() {
  const res = {
    _status: null,
    _body: null,
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; },
  };
  return res;
}

describe('authMiddleware', () => {
  beforeEach(() => {
    _resetForTests();
  });

  describe('requireAuth', () => {
    it('returns user for a valid token', async () => {
      const token = await signToken({ id: '1', email: 'admin@wander.test', role: 'admin' });
      const req = makeReq(token);
      const res = makeRes();

      const result = await requireAuth(req, res);
      expect(result).not.toBeNull();
      expect(result.user.id).toBe('1');
      expect(result.user.email).toBe('admin@wander.test');
      expect(result.user.role).toBe('admin');
      expect(req.user).toEqual(result.user);
    });

    it('returns null and sends 401 when no token', async () => {
      const req = makeReq(null);
      const res = makeRes();

      const result = await requireAuth(req, res);
      expect(result).toBeNull();
      expect(res._status).toBe(401);
      expect(res._body.error).toMatch(/Unauthorized/i);
    });

    it('returns null and sends 401 for invalid token', async () => {
      const req = makeReq('not.a.real.token');
      const res = makeRes();

      const result = await requireAuth(req, res);
      expect(result).toBeNull();
      expect(res._status).toBe(401);
    });

    it('returns null and sends 403 when role not allowed', async () => {
      const token = await signToken({ id: '2', email: 'user@wander.test', role: 'user' });
      const req = makeReq(token);
      const res = makeRes();

      const result = await requireAuth(req, res, { roles: ['admin'] });
      expect(result).toBeNull();
      expect(res._status).toBe(403);
      expect(res._body.error).toMatch(/Forbidden/i);
    });

    it('allows access when role matches', async () => {
      const token = await signToken({ id: '2', email: 'user@wander.test', role: 'user' });
      const req = makeReq(token);
      const res = makeRes();

      const result = await requireAuth(req, res, { roles: ['user', 'admin'] });
      expect(result).not.toBeNull();
      expect(result.user.role).toBe('user');
    });
  });

  describe('requireAdmin', () => {
    it('allows admin users', async () => {
      const token = await signToken({ id: '1', email: 'admin@wander.test', role: 'admin' });
      const result = await requireAdmin(makeReq(token), makeRes());
      expect(result).not.toBeNull();
      expect(result.user.role).toBe('admin');
    });

    it('rejects non-admin users with 403', async () => {
      const token = await signToken({ id: '2', email: 'user@wander.test', role: 'user' });
      const res = makeRes();
      const result = await requireAdmin(makeReq(token), res);
      expect(result).toBeNull();
      expect(res._status).toBe(403);
    });
  });
});
