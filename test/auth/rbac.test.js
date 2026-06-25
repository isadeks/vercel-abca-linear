import { describe, it, expect } from 'vitest';
import { requireRoles, withRoles, ROLES } from '../../api/_lib/auth/rbac.js';

describe('rbac', () => {
  it('passes when the user has the required role', () => {
    expect(() => requireRoles({ roles: ['user', 'admin'] }, ['admin'])).not.toThrow();
  });

  it('throws when the user lacks the required role', () => {
    expect(() => requireRoles({ roles: ['user'] }, ['admin'])).toThrow('Access denied');
  });

  it('throws when claims have no roles array', () => {
    expect(() => requireRoles({}, ['user'])).toThrow('no roles present');
  });

  it('accepts any one of multiple required roles', () => {
    expect(() => requireRoles({ roles: ['moderator'] }, ['admin', 'moderator'])).not.toThrow();
  });

  describe('withRoles', () => {
    it('calls handler for authenticated, authorized request', async () => {
      const mockAuthenticate = () => ({ sub: 'u1', roles: [ROLES.ADMIN] });
      const handler = withRoles(
        async (req, res, claims) => res.status(200).json({ ok: true, claims }),
        [ROLES.ADMIN],
        mockAuthenticate,
      );
      const res = mockRes();
      await handler({ headers: { authorization: 'Bearer fake' } }, res);
      expect(res._status).toBe(200);
      expect(res._body.ok).toBe(true);
    });

    it('returns 401 for unauthenticated request', async () => {
      const mockAuthenticate = () => { throw new Error('Missing Authorization header'); };
      const handler = withRoles(
        async (_req, res) => res.status(200).json({}),
        [ROLES.ADMIN],
        mockAuthenticate,
      );
      const res = mockRes();
      await handler({ headers: {} }, res);
      expect(res._status).toBe(401);
    });

    it('returns 401 for unauthorized role', async () => {
      const mockAuthenticate = () => ({ sub: 'u1', roles: [ROLES.USER] });
      const handler = withRoles(
        async (_req, res) => res.status(200).json({}),
        [ROLES.ADMIN],
        mockAuthenticate,
      );
      const res = mockRes();
      await handler({ headers: { authorization: 'Bearer fake' } }, res);
      expect(res._status).toBe(401);
    });
  });
});

function mockRes() {
  const res = {
    _status: null,
    _body: null,
    status(code) { res._status = code; return res; },
    json(body) { res._body = body; return res; },
  };
  return res;
}
