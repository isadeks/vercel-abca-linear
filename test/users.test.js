import { describe, it, expect, beforeEach } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  validateAuthInputs,
  createUser,
  authenticateUser,
  findUserByEmail,
  _resetUsersForTesting,
} from '../api/_lib/users.js';

describe('users module', () => {
  beforeEach(() => {
    _resetUsersForTesting();
  });

  // ── hashPassword / verifyPassword ────────────────────────────────────────

  describe('hashPassword / verifyPassword', () => {
    it('verifies a correct password', () => {
      const hash = hashPassword('MySecret1');
      expect(verifyPassword('MySecret1', hash)).toBe(true);
    });

    it('rejects a wrong password', () => {
      const hash = hashPassword('MySecret1');
      expect(verifyPassword('WrongPass1', hash)).toBe(false);
    });

    it('produces unique hashes for the same password', () => {
      const h1 = hashPassword('Same1Password');
      const h2 = hashPassword('Same1Password');
      expect(h1).not.toBe(h2);
    });

    it('returns false for a malformed stored string', () => {
      expect(verifyPassword('anything', 'no-dollar-sign')).toBe(false);
    });
  });

  // ── validateAuthInputs ───────────────────────────────────────────────────

  describe('validateAuthInputs', () => {
    it('returns empty array for valid inputs', () => {
      expect(validateAuthInputs('user@example.com', 'Secret123')).toHaveLength(0);
    });

    it('rejects a bad email', () => {
      const errs = validateAuthInputs('not-an-email', 'Secret123');
      expect(errs.some((e) => /email/i.test(e))).toBe(true);
    });

    it('rejects a short password', () => {
      const errs = validateAuthInputs('u@x.com', 'Sh0rt');
      expect(errs.some((e) => /8 char/i.test(e))).toBe(true);
    });

    it('rejects a password without uppercase', () => {
      const errs = validateAuthInputs('u@x.com', 'nouppercase1');
      expect(errs.some((e) => /uppercase/i.test(e))).toBe(true);
    });

    it('rejects a password without a number', () => {
      const errs = validateAuthInputs('u@x.com', 'NoNumbers');
      expect(errs.some((e) => /number/i.test(e))).toBe(true);
    });

    it('rejects mismatched confirmPassword', () => {
      const errs = validateAuthInputs('u@x.com', 'Secret123', { confirmPassword: 'Other123' });
      expect(errs.some((e) => /match/i.test(e))).toBe(true);
    });

    it('rejects a short displayName', () => {
      const errs = validateAuthInputs('u@x.com', 'Secret123', { displayName: 'X' });
      expect(errs.some((e) => /display name/i.test(e))).toBe(true);
    });

    it('accepts matching confirmPassword', () => {
      const errs = validateAuthInputs('u@x.com', 'Secret123', { confirmPassword: 'Secret123' });
      expect(errs).toHaveLength(0);
    });
  });

  // ── createUser ────────────────────────────────────────────────────────────

  describe('createUser', () => {
    it('creates a user and returns the public profile', () => {
      const result = createUser({ email: 'alice@example.com', password: 'Alice123', displayName: 'Alice' });
      expect(result.ok).toBe(true);
      expect(result.user.email).toBe('alice@example.com');
      expect(result.user.displayName).toBe('Alice');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('normalises email to lowercase', () => {
      const result = createUser({ email: 'ALICE@EXAMPLE.COM', password: 'Alice123', displayName: 'Alice' });
      expect(result.ok).toBe(true);
      expect(result.user.email).toBe('alice@example.com');
    });

    it('rejects duplicate email', () => {
      createUser({ email: 'dup@example.com', password: 'Dup12345', displayName: 'Dup' });
      const second = createUser({ email: 'dup@example.com', password: 'Other123', displayName: 'Dup' });
      expect(second.ok).toBe(false);
      expect(second.errors[0]).toMatch(/already exists/i);
    });

    it('returns validation errors for bad inputs', () => {
      const result = createUser({ email: 'bad', password: '123', displayName: 'A' });
      expect(result.ok).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // ── authenticateUser ──────────────────────────────────────────────────────

  describe('authenticateUser', () => {
    beforeEach(() => {
      createUser({ email: 'bob@example.com', password: 'BobPass1', displayName: 'Bob' });
    });

    it('authenticates with correct credentials', () => {
      const result = authenticateUser({ email: 'bob@example.com', password: 'BobPass1' });
      expect(result.ok).toBe(true);
      expect(result.user.email).toBe('bob@example.com');
    });

    it('rejects a wrong password', () => {
      const result = authenticateUser({ email: 'bob@example.com', password: 'WrongPass1' });
      expect(result.ok).toBe(false);
      expect(result.errors[0]).toMatch(/invalid email or password/i);
    });

    it('rejects an unknown email', () => {
      const result = authenticateUser({ email: 'nobody@example.com', password: 'Anyone123' });
      expect(result.ok).toBe(false);
    });

    it('is case-insensitive on email', () => {
      const result = authenticateUser({ email: 'BOB@EXAMPLE.COM', password: 'BobPass1' });
      expect(result.ok).toBe(true);
    });
  });

  // ── findUserByEmail ───────────────────────────────────────────────────────

  describe('findUserByEmail', () => {
    it('returns the public profile for a known user', () => {
      createUser({ email: 'carol@example.com', password: 'Carol123', displayName: 'Carol' });
      const user = findUserByEmail('carol@example.com');
      expect(user).not.toBeNull();
      expect(user.email).toBe('carol@example.com');
      expect(user).not.toHaveProperty('passwordHash');
    });

    it('returns null for an unknown user', () => {
      expect(findUserByEmail('ghost@example.com')).toBeNull();
    });
  });
});
