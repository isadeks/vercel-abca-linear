import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  normalizeEmail,
  isValidEmail,
} from '../api/_lib/crypto.js';

describe('crypto: password hashing', () => {
  it('never stores the plaintext password', () => {
    const stored = hashPassword('correct horse');
    expect(stored).not.toContain('correct horse');
    expect(stored).toContain(':');
  });

  it('produces a different hash each call (random salt)', () => {
    expect(hashPassword('same')).not.toBe(hashPassword('same'));
  });

  it('verifies a correct password', () => {
    const stored = hashPassword('s3cret-pw');
    expect(verifyPassword('s3cret-pw', stored)).toBe(true);
  });

  it('rejects an incorrect password', () => {
    const stored = hashPassword('s3cret-pw');
    expect(verifyPassword('wrong', stored)).toBe(false);
  });

  it('rejects malformed stored values', () => {
    expect(verifyPassword('x', 'not-a-valid-hash')).toBe(false);
    expect(verifyPassword('x', '')).toBe(false);
  });

  it('throws on empty password', () => {
    expect(() => hashPassword('')).toThrow();
  });
});

describe('crypto: tokens', () => {
  it('generates unique hex tokens', () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]+$/);
  });
});

describe('crypto: email helpers', () => {
  it('normalizes email to trimmed lowercase', () => {
    expect(normalizeEmail('  Foo@Bar.COM ')).toBe('foo@bar.com');
    expect(normalizeEmail(undefined)).toBe('');
  });

  it('validates plausible emails', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('nope')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});
