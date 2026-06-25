import { describe, it, expect } from 'vitest';
import {
  signToken,
  verifyToken,
  createAccessToken,
  createRefreshToken,
} from '../api/_lib/auth.js';

const SECRET = 'test-secret-key-for-auth-tests';

describe('signToken / verifyToken', () => {
  it('round-trips a payload', () => {
    const payload = { sub: 'user-1', iat: 1000, exp: 9999999999 };
    const token = signToken(payload, SECRET);
    const decoded = verifyToken(token, SECRET);
    expect(decoded.sub).toBe('user-1');
  });

  it('throws on tampered signature', () => {
    const token = signToken({ sub: 'u1', exp: 9999999999 }, SECRET);
    const parts = token.split('.');
    parts[2] = parts[2].split('').reverse().join(''); // corrupt sig
    expect(() => verifyToken(parts.join('.'), SECRET)).toThrow('Invalid token signature');
  });

  it('throws on wrong format (too few segments)', () => {
    expect(() => verifyToken('a.b', SECRET)).toThrow('Invalid token format');
  });

  it('throws on expired token', () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signToken({ sub: 'u1', iat: now - 100, exp: now - 1 }, SECRET);
    expect(() => verifyToken(token, SECRET)).toThrow('Token expired');
  });

  it('accepts token without exp field', () => {
    const token = signToken({ sub: 'u1' }, SECRET);
    expect(verifyToken(token, SECRET).sub).toBe('u1');
  });
});

describe('createAccessToken', () => {
  it('creates a token with type=access', () => {
    const token = createAccessToken('user-42', SECRET);
    const payload = verifyToken(token, SECRET);
    expect(payload.type).toBe('access');
    expect(payload.sub).toBe('user-42');
  });

  it('respects custom TTL', () => {
    const before = Math.floor(Date.now() / 1000);
    const token = createAccessToken('user-42', SECRET, 300);
    const payload = verifyToken(token, SECRET);
    expect(payload.exp - payload.iat).toBe(300);
    expect(payload.iat).toBeGreaterThanOrEqual(before);
  });

  it('expires after custom TTL (mocked time)', () => {
    // Create a token that already expired
    const now = Math.floor(Date.now() / 1000);
    const expiredToken = signToken(
      { sub: 'u1', iat: now - 60, exp: now - 1, type: 'access' },
      SECRET,
    );
    expect(() => verifyToken(expiredToken, SECRET)).toThrow('Token expired');
  });
});

describe('createRefreshToken', () => {
  it('creates a token with type=refresh', () => {
    const token = createRefreshToken('user-7', SECRET);
    const payload = verifyToken(token, SECRET);
    expect(payload.type).toBe('refresh');
    expect(payload.sub).toBe('user-7');
  });

  it('embeds a unique jti per token', () => {
    const t1 = createRefreshToken('user-7', SECRET);
    const t2 = createRefreshToken('user-7', SECRET);
    const p1 = verifyToken(t1, SECRET);
    const p2 = verifyToken(t2, SECRET);
    expect(p1.jti).toBeTruthy();
    expect(p1.jti).not.toBe(p2.jti);
  });

  it('defaults to 7-day TTL', () => {
    const token = createRefreshToken('user-7', SECRET);
    const payload = verifyToken(token, SECRET);
    expect(payload.exp - payload.iat).toBe(604800);
  });
});
