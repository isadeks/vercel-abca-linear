import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createToken,
  verifyToken,
  serializeSessionCookie,
  clearSessionCookie,
  getSession,
  SESSION_COOKIE_NAME,
} from '../api/_lib/session.js';

describe('session utilities', () => {
  const origEnv = process.env.SESSION_SECRET;

  beforeEach(() => {
    process.env.SESSION_SECRET = 'test-secret-abc';
  });

  afterEach(() => {
    if (origEnv === undefined) {
      delete process.env.SESSION_SECRET;
    } else {
      process.env.SESSION_SECRET = origEnv;
    }
  });

  describe('createToken / verifyToken', () => {
    it('round-trips a payload', () => {
      const payload = { sub: 'user@example.com', role: 'member' };
      const token = createToken(payload);
      const decoded = verifyToken(token);
      expect(decoded.sub).toBe('user@example.com');
      expect(decoded.role).toBe('member');
    });

    it('returns null for a tampered token', () => {
      const token = createToken({ sub: 'a@b.com' });
      const tampered = token.slice(0, -4) + 'xxxx';
      expect(verifyToken(tampered)).toBeNull();
    });

    it('returns null for an expired token', () => {
      const past = Math.floor(Date.now() / 1000) - 10;
      const token = createToken({ sub: 'a@b.com', exp: past });
      expect(verifyToken(token)).toBeNull();
    });

    it('returns null for a non-string input', () => {
      expect(verifyToken(null)).toBeNull();
      expect(verifyToken(undefined)).toBeNull();
      expect(verifyToken(42)).toBeNull();
    });

    it('returns null for a malformed token (wrong number of parts)', () => {
      expect(verifyToken('only.two')).toBeNull();
    });

    it('rejects a token signed with a different secret', () => {
      const token = createToken({ sub: 'a@b.com' });
      process.env.SESSION_SECRET = 'different-secret';
      expect(verifyToken(token)).toBeNull();
    });
  });

  describe('serializeSessionCookie', () => {
    it('contains the cookie name', () => {
      const cookie = serializeSessionCookie({ email: 'test@example.com' });
      expect(cookie).toMatch(new RegExp(`^${SESSION_COOKIE_NAME}=`));
    });

    it('sets HttpOnly and SameSite', () => {
      const cookie = serializeSessionCookie({ email: 'test@example.com' });
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Strict');
    });

    it('sets a positive Max-Age', () => {
      const cookie = serializeSessionCookie({ email: 'test@example.com' });
      const match = cookie.match(/Max-Age=(\d+)/);
      expect(match).not.toBeNull();
      expect(Number(match[1])).toBeGreaterThan(0);
    });

    it('embeds a valid token', () => {
      const cookie = serializeSessionCookie({ email: 'me@example.com' });
      const token = cookie.split(';')[0].split('=').slice(1).join('=');
      const payload = verifyToken(token);
      expect(payload).not.toBeNull();
      expect(payload.sub).toBe('me@example.com');
    });
  });

  describe('clearSessionCookie', () => {
    it('sets Max-Age=0', () => {
      expect(clearSessionCookie()).toContain('Max-Age=0');
    });

    it('contains the cookie name', () => {
      expect(clearSessionCookie()).toMatch(new RegExp(`^${SESSION_COOKIE_NAME}=`));
    });
  });

  describe('getSession', () => {
    it('extracts a valid session from the Cookie header', () => {
      const cookie = serializeSessionCookie({ email: 'hello@world.com' });
      const token = cookie.split(';')[0].split('=').slice(1).join('=');
      const req = { headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` } };
      const session = getSession(req);
      expect(session).not.toBeNull();
      expect(session.sub).toBe('hello@world.com');
    });

    it('returns null when the Cookie header is absent', () => {
      expect(getSession({ headers: {} })).toBeNull();
    });

    it('returns null when the cookie is invalid', () => {
      const req = { headers: { cookie: `${SESSION_COOKIE_NAME}=not-a-valid-token` } };
      expect(getSession(req)).toBeNull();
    });

    it('returns null when req has no headers', () => {
      expect(getSession({})).toBeNull();
    });
  });
});
