import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  register,
  login,
} from '../api/_lib/auth.js';

const SECRET = 'test-secret-key-for-auth-tests';

// ── Password hashing ──────────────────────────────────────────────────────

describe('hashPassword', () => {
  it('returns a salt:hash string', () => {
    const result = hashPassword('mypassword');
    expect(result).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
  });

  it('produces different hashes for the same input (random salt)', () => {
    const h1 = hashPassword('same');
    const h2 = hashPassword('same');
    expect(h1).not.toBe(h2);
  });

  it('throws on empty password', () => {
    expect(() => hashPassword('')).toThrow(TypeError);
  });

  it('throws on non-string input', () => {
    expect(() => hashPassword(null)).toThrow(TypeError);
  });
});

// ── Password verification ─────────────────────────────────────────────────

describe('verifyPassword', () => {
  it('returns true for matching password', () => {
    const hash = hashPassword('correct-horse');
    expect(verifyPassword('correct-horse', hash)).toBe(true);
  });

  it('returns false for wrong password', () => {
    const hash = hashPassword('correct-horse');
    expect(verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('returns false for malformed stored hash', () => {
    expect(verifyPassword('anything', 'notavalidhash')).toBe(false);
  });

  it('returns false when inputs are not strings', () => {
    expect(verifyPassword(null, null)).toBe(false);
  });
});

// ── Token creation ────────────────────────────────────────────────────────

describe('createToken', () => {
  it('returns a three-part dot-separated string', () => {
    const token = createToken({ userId: '123' }, SECRET);
    expect(token.split('.')).toHaveLength(3);
  });

  it('embeds the payload', () => {
    const token = createToken({ userId: 'abc', email: 'a@b.com' }, SECRET);
    const [, body] = token.split('.');
    const payload = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    expect(payload.userId).toBe('abc');
    expect(payload.email).toBe('a@b.com');
  });

  it('includes iat and exp fields', () => {
    const before = Math.floor(Date.now() / 1000);
    const token = createToken({}, SECRET, 60);
    const after = Math.floor(Date.now() / 1000);
    const [, body] = token.split('.');
    const payload = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    expect(payload.iat).toBeGreaterThanOrEqual(before);
    expect(payload.iat).toBeLessThanOrEqual(after);
    expect(payload.exp).toBe(payload.iat + 60);
  });

  it('throws when secret is empty', () => {
    expect(() => createToken({}, '')).toThrow(TypeError);
  });
});

// ── Token verification ────────────────────────────────────────────────────

describe('verifyToken', () => {
  it('returns payload for a valid token', () => {
    const token = createToken({ userId: 'u1' }, SECRET);
    const payload = verifyToken(token, SECRET);
    expect(payload).not.toBeNull();
    expect(payload.userId).toBe('u1');
  });

  it('returns null for a tampered token', () => {
    const token = createToken({ userId: 'u1' }, SECRET);
    const tampered = token.slice(0, -4) + 'XXXX';
    expect(verifyToken(tampered, SECRET)).toBeNull();
  });

  it('returns null when signed with a different secret', () => {
    const token = createToken({ userId: 'u1' }, SECRET);
    expect(verifyToken(token, 'different-secret')).toBeNull();
  });

  it('returns null for an expired token', () => {
    // ttl = -1 means exp = iat - 1, which is already in the past
    const token = createToken({ userId: 'u1' }, SECRET, -1);
    expect(verifyToken(token, SECRET)).toBeNull();
  });

  it('returns null for malformed input', () => {
    expect(verifyToken('not.a.validtoken!@#', SECRET)).toBeNull();
    expect(verifyToken('', SECRET)).toBeNull();
    expect(verifyToken(null, SECRET)).toBeNull();
  });
});

// ── Register ──────────────────────────────────────────────────────────────

describe('register', () => {
  it('creates a new user and returns { ok: true, user }', () => {
    const users = new Map();
    const result = register(users, 'alice@example.com', 'password123');
    expect(result.ok).toBe(true);
    expect(result.user).toMatchObject({ email: 'alice@example.com' });
    expect(result.user.id).toBeDefined();
    expect(result.user.passwordHash).toBeUndefined(); // hash must not leak
  });

  it('normalises email to lowercase', () => {
    const users = new Map();
    register(users, 'ALICE@EXAMPLE.COM', 'password123');
    expect(users.has('alice@example.com')).toBe(true);
  });

  it('rejects duplicate email', () => {
    const users = new Map();
    register(users, 'alice@example.com', 'password123');
    const result = register(users, 'alice@example.com', 'different-password');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/already registered/);
  });

  it('rejects invalid email', () => {
    const users = new Map();
    const result = register(users, 'not-an-email', 'password123');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/invalid email/);
  });

  it('rejects short password', () => {
    const users = new Map();
    const result = register(users, 'user@example.com', 'short');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/8 characters/);
  });

  it('rejects non-Map store', () => {
    const result = register({}, 'user@example.com', 'password123');
    expect(result.ok).toBe(false);
  });
});

// ── Login ─────────────────────────────────────────────────────────────────

describe('login', () => {
  it('returns { ok: true, token, user } on valid credentials', () => {
    const users = new Map();
    register(users, 'bob@example.com', 'securepwd!');
    const result = login(users, 'bob@example.com', 'securepwd!', SECRET);
    expect(result.ok).toBe(true);
    expect(typeof result.token).toBe('string');
    expect(result.user).toMatchObject({ email: 'bob@example.com' });
    expect(result.user.passwordHash).toBeUndefined();
  });

  it('token verifies correctly after login', () => {
    const users = new Map();
    register(users, 'carol@example.com', 'mypassword');
    const { token } = login(users, 'carol@example.com', 'mypassword', SECRET);
    const payload = verifyToken(token, SECRET);
    expect(payload).not.toBeNull();
    expect(payload.email).toBe('carol@example.com');
  });

  it('returns error for unknown email', () => {
    const users = new Map();
    const result = login(users, 'ghost@example.com', 'password123', SECRET);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/invalid email or password/);
  });

  it('returns error for wrong password', () => {
    const users = new Map();
    register(users, 'dave@example.com', 'correctpwd');
    const result = login(users, 'dave@example.com', 'wrongpwd', SECRET);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/invalid email or password/);
  });

  it('is case-insensitive for email', () => {
    const users = new Map();
    register(users, 'eve@example.com', 'mypassword1');
    const result = login(users, 'EVE@EXAMPLE.COM', 'mypassword1', SECRET);
    expect(result.ok).toBe(true);
  });

  it('does not leak whether an email exists (same error for both cases)', () => {
    const users = new Map();
    register(users, 'frank@example.com', 'password123');
    const r1 = login(users, 'unknown@example.com', 'password123', SECRET);
    const r2 = login(users, 'frank@example.com', 'wrongpassword', SECRET);
    expect(r1.error).toBe(r2.error);
  });
});
