import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAccessToken,
  verifyAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  buildRefreshTokenCookie,
  clearRefreshTokenCookie,
  parseRefreshTokenCookie,
  _resetRefreshTokenStore,
} from '../api/_lib/session.js';

const mockUser = { id: 'usr-1', email: 'test@example.com' };

beforeEach(() => _resetRefreshTokenStore());

// ---------------------------------------------------------------------------
// Access tokens
// ---------------------------------------------------------------------------

describe('createAccessToken / verifyAccessToken', () => {
  it('issues and verifies a valid token', async () => {
    const token = await createAccessToken(mockUser);
    expect(typeof token).toBe('string');
    const payload = await verifyAccessToken(token);
    expect(payload.sub).toBe(mockUser.id);
    expect(payload.email).toBe(mockUser.email);
    expect(typeof payload.exp).toBe('number');
  });

  it('throws on tampered token', async () => {
    const token = await createAccessToken(mockUser);
    const tampered = token.slice(0, -5) + 'XXXXX';
    await expect(verifyAccessToken(tampered)).rejects.toThrow();
  });

  it('throws when user fields are missing', async () => {
    await expect(createAccessToken({ id: '', email: 'x@x.com' })).rejects.toThrow();
    await expect(createAccessToken({ id: 'id', email: '' })).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Refresh tokens
// ---------------------------------------------------------------------------

describe('createRefreshToken', () => {
  it('returns a token and expiry', () => {
    const { token, expiresAt } = createRefreshToken(mockUser);
    expect(typeof token).toBe('string');
    expect(expiresAt).toBeGreaterThan(Date.now());
  });

  it('throws when user fields are missing', () => {
    expect(() => createRefreshToken({ id: '', email: 'x@x.com' })).toThrow();
  });
});

describe('rotateRefreshToken', () => {
  it('returns new token and revokes old one', () => {
    const { token: old } = createRefreshToken(mockUser);
    const result = rotateRefreshToken(old);
    expect(result.newRefreshToken).toBeTruthy();
    expect(result.newRefreshToken).not.toBe(old);
    expect(result.userId).toBe(mockUser.id);
    expect(result.email).toBe(mockUser.email);
  });

  it('the old token is no longer valid after rotation', () => {
    const { token: old } = createRefreshToken(mockUser);
    rotateRefreshToken(old);
    expect(() => rotateRefreshToken(old)).toThrow('not found');
  });

  it('throws on unknown token', () => {
    expect(() => rotateRefreshToken('unknown-token')).toThrow();
  });
});

describe('revokeRefreshToken', () => {
  it('invalidates the token', () => {
    const { token } = createRefreshToken(mockUser);
    revokeRefreshToken(token);
    expect(() => rotateRefreshToken(token)).toThrow();
  });

  it('is a no-op for unknown tokens', () => {
    expect(() => revokeRefreshToken('nonexistent')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

describe('buildRefreshTokenCookie', () => {
  it('includes HttpOnly and SameSite=Strict', () => {
    const header = buildRefreshTokenCookie('mytoken', Date.now() + 10000);
    expect(header).toContain('HttpOnly');
    expect(header).toContain('SameSite=Strict');
    expect(header).toContain('refreshToken=mytoken');
    expect(header).toContain('Path=/api/auth');
  });
});

describe('clearRefreshTokenCookie', () => {
  it('sets Max-Age=0 and epoch expiry', () => {
    const header = clearRefreshTokenCookie();
    expect(header).toContain('Max-Age=0');
    expect(header).toContain('1970');
  });
});

describe('parseRefreshTokenCookie', () => {
  it('extracts token from cookie header', () => {
    const token = parseRefreshTokenCookie('foo=bar; refreshToken=abc123; baz=qux');
    expect(token).toBe('abc123');
  });

  it('returns null when cookie is absent', () => {
    expect(parseRefreshTokenCookie('')).toBeNull();
    expect(parseRefreshTokenCookie(undefined)).toBeNull();
  });

  it('returns null when refreshToken cookie is missing', () => {
    expect(parseRefreshTokenCookie('session=xyz')).toBeNull();
  });

  it('round-trips with buildRefreshTokenCookie', () => {
    const cookieHeader = buildRefreshTokenCookie('tok-xyz', Date.now() + 60000);
    // Simulate browser sending back only name=value pairs.
    const browserCookie = cookieHeader.split(';').map(p => p.trim()).find(p => p.startsWith('refreshToken='));
    const parsed = parseRefreshTokenCookie(browserCookie);
    expect(parsed).toBe('tok-xyz');
  });
});
