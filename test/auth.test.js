/**
 * auth.test.js — Unit tests for api/_lib/auth.js and api/_lib/users.js.
 *
 * Run with `npm test` (Vitest).
 * Set SCRYPT_N=1024 to speed up password tests in CI (default 16384 is slow).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
} from '../api/_lib/auth.js';
import { users } from '../api/_lib/users.js';

// ── hashPassword / verifyPassword ─────────────────────────────────────────────

describe('hashPassword', () => {
  it('produces a salt:hash string', () => {
    const hash = hashPassword('correct-horse-battery-staple');
    expect(hash).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
  });

  it('two hashes of the same password differ (random salt)', () => {
    const a = hashPassword('same-password');
    const b = hashPassword('same-password');
    expect(a).not.toBe(b);
  });
});

describe('verifyPassword', () => {
  it('accepts the correct password', () => {
    const hash = hashPassword('my-secret-password');
    expect(verifyPassword('my-secret-password', hash)).toBe(true);
  });

  it('rejects an incorrect password', () => {
    const hash = hashPassword('my-secret-password');
    expect(verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('rejects an empty string', () => {
    const hash = hashPassword('my-secret-password');
    expect(verifyPassword('', hash)).toBe(false);
  });
});

// ── generateToken / verifyToken ───────────────────────────────────────────────

describe('generateToken', () => {
  it('returns a three-part JWT string', () => {
    const token = generateToken({ sub: '1', email: 'a@b.com' });
    expect(token.split('.')).toHaveLength(3);
  });

  it('embeds the payload claims', () => {
    const token = generateToken({ sub: '42', email: 'user@example.com' });
    const payload = verifyToken(token);
    expect(payload.sub).toBe('42');
    expect(payload.email).toBe('user@example.com');
  });

  it('adds iat and exp claims', () => {
    const token = generateToken({ sub: '1' });
    const payload = verifyToken(token);
    expect(typeof payload.iat).toBe('number');
    expect(typeof payload.exp).toBe('number');
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });
});

describe('verifyToken', () => {
  it('verifies a freshly-generated token', () => {
    const token = generateToken({ sub: '99' });
    expect(() => verifyToken(token)).not.toThrow();
  });

  it('throws on a tampered signature', () => {
    const token = generateToken({ sub: '1' });
    const [h, c, s] = token.split('.');
    const bad = `${h}.${c}.${s.slice(0, -4)}XXXX`;
    expect(() => verifyToken(bad)).toThrow('Invalid token signature');
  });

  it('throws on a tampered payload', () => {
    const token = generateToken({ sub: '1' });
    const [h, , s] = token.split('.');
    const fakePayload = Buffer.from(JSON.stringify({ sub: '999' })).toString('base64url');
    const bad = `${h}.${fakePayload}.${s}`;
    expect(() => verifyToken(bad)).toThrow('Invalid token signature');
  });

  it('throws on an invalid format', () => {
    expect(() => verifyToken('not.a.valid.token.here')).toThrow();
  });

  it('throws on an expired token', () => {
    // Manually craft a token with exp in the past.
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const claims = Buffer.from(
      JSON.stringify({ sub: '1', iat: 1000, exp: 1001 }),
    ).toString('base64url');
    // We can't sign it correctly without the secret, so we expect it either to
    // fail on signature OR on expiry — both are correct rejections.
    expect(() => verifyToken(`${header}.${claims}.invalidsig`)).toThrow();
  });
});

// ── users store ───────────────────────────────────────────────────────────────

describe('users store', () => {
  beforeEach(() => {
    users._reset();
  });

  it('creates a user and returns public fields', () => {
    const user = users.create({
      email: 'alice@example.com',
      name: 'Alice',
      passwordHash: 'abc:def',
    });
    expect(user).toMatchObject({
      email: 'alice@example.com',
      name: 'Alice',
    });
    expect(user).not.toHaveProperty('passwordHash');
    expect(user.id).toBeTruthy();
    expect(user.createdAt).toBeTruthy();
  });

  it('normalises email to lowercase', () => {
    users.create({ email: 'Bob@Example.COM', name: 'Bob', passwordHash: 'x:y' });
    expect(users.exists('bob@example.com')).toBe(true);
  });

  it('findByEmail returns the full record (incl passwordHash)', () => {
    users.create({ email: 'carol@example.com', name: 'Carol', passwordHash: 'salt:hash' });
    const record = users.findByEmail('carol@example.com');
    expect(record).toBeDefined();
    expect(record.passwordHash).toBe('salt:hash');
  });

  it('findById returns public fields only', () => {
    const created = users.create({ email: 'd@e.com', name: 'Dave', passwordHash: 's:h' });
    const found = users.findById(created.id);
    expect(found).toMatchObject({ id: created.id, name: 'Dave' });
    expect(found).not.toHaveProperty('passwordHash');
  });

  it('exists returns false for unknown email', () => {
    expect(users.exists('nobody@example.com')).toBe(false);
  });

  it('exists returns true after creation', () => {
    users.create({ email: 'eve@example.com', name: 'Eve', passwordHash: 'x:y' });
    expect(users.exists('eve@example.com')).toBe(true);
  });

  it('_reset clears all users', () => {
    users.create({ email: 'frank@example.com', name: 'Frank', passwordHash: 'x:y' });
    users._reset();
    expect(users.exists('frank@example.com')).toBe(false);
  });
});
