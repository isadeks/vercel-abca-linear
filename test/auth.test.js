import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  authenticateRequest,
} from '../api/_lib/auth.js';

const SECRET = 'test-signing-secret';

describe('password hashing', () => {
  it('verifies a correct password', () => {
    const stored = hashPassword('hunter2');
    expect(verifyPassword('hunter2', stored)).toBe(true);
  });

  it('rejects an incorrect password', () => {
    const stored = hashPassword('hunter2');
    expect(verifyPassword('wrong', stored)).toBe(false);
  });

  it('produces a distinct hash per call (random salt)', () => {
    expect(hashPassword('same')).not.toBe(hashPassword('same'));
  });

  it('encodes as scrypt$salt$hash', () => {
    const parts = hashPassword('x').split('$');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe('scrypt');
  });

  it('throws on empty or non-string password', () => {
    expect(() => hashPassword('')).toThrow(TypeError);
    expect(() => hashPassword(123)).toThrow(TypeError);
  });

  it('returns false for malformed stored values instead of throwing', () => {
    expect(verifyPassword('x', 'not-a-hash')).toBe(false);
    expect(verifyPassword('x', 'scrypt$deadbeef')).toBe(false);
    expect(verifyPassword('x', 'bcrypt$aa$bb')).toBe(false);
    expect(verifyPassword('x', null)).toBe(false);
  });
});

describe('session tokens', () => {
  it('round-trips claims', () => {
    const token = createToken({ sub: 'user-1', role: 'admin' }, SECRET);
    const claims = verifyToken(token, SECRET);
    expect(claims.sub).toBe('user-1');
    expect(claims.role).toBe('admin');
    expect(typeof claims.iat).toBe('number');
    expect(typeof claims.exp).toBe('number');
  });

  it('rejects a tampered payload', () => {
    const token = createToken({ sub: 'user-1' }, SECRET);
    const [, sig] = token.split('.');
    const forged = createToken({ sub: 'attacker' }, SECRET).split('.')[0];
    expect(() => verifyToken(`${forged}.${sig}`, SECRET)).toThrow(/bad signature/);
  });

  it('rejects a token signed with a different secret', () => {
    const token = createToken({ sub: 'user-1' }, SECRET);
    expect(() => verifyToken(token, 'other-secret')).toThrow(/bad signature/);
  });

  it('rejects an expired token', () => {
    const past = 1_000_000_000_000;
    const token = createToken({ sub: 'u' }, SECRET, { ttlSeconds: 60, now: past });
    expect(() => verifyToken(token, SECRET, { now: past + 61_000 })).toThrow(/expired/);
  });

  it('accepts a not-yet-expired token', () => {
    const past = 1_000_000_000_000;
    const token = createToken({ sub: 'u' }, SECRET, { ttlSeconds: 60, now: past });
    expect(verifyToken(token, SECRET, { now: past + 30_000 }).sub).toBe('u');
  });

  it('rejects malformed tokens', () => {
    expect(() => verifyToken('no-dot', SECRET)).toThrow(/malformed token/);
    expect(() => verifyToken('abc.def', SECRET)).toThrow(/bad signature/);
  });

  it('validates inputs', () => {
    expect(() => createToken(null, SECRET)).toThrow(TypeError);
    expect(() => createToken([], SECRET)).toThrow(TypeError);
    expect(() => createToken({}, '')).toThrow(TypeError);
  });
});

describe('authenticateRequest', () => {
  it('returns claims for a valid Bearer header', () => {
    const token = createToken({ sub: 'u' }, SECRET);
    expect(authenticateRequest(`Bearer ${token}`, SECRET).sub).toBe('u');
  });

  it('returns null for missing/malformed headers', () => {
    expect(authenticateRequest(undefined, SECRET)).toBeNull();
    expect(authenticateRequest('', SECRET)).toBeNull();
    expect(authenticateRequest('Basic abc', SECRET)).toBeNull();
    expect(authenticateRequest('Bearer', SECRET)).toBeNull();
  });

  it('returns null for an invalid token instead of throwing', () => {
    expect(authenticateRequest('Bearer garbage.sig', SECRET)).toBeNull();
  });
});
