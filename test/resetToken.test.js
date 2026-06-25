import { describe, it, expect, beforeEach } from 'vitest';
import {
  createResetToken,
  validateResetToken,
  consumeResetToken,
  _resetTokenStore,
} from '../api/_lib/resetToken.js';

beforeEach(() => _resetTokenStore());

// ---------------------------------------------------------------------------
// createResetToken
// ---------------------------------------------------------------------------

describe('createResetToken', () => {
  it('returns a hex token string and future expiry', () => {
    const { token, expiresAt } = createResetToken('user@example.com');
    expect(typeof token).toBe('string');
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(expiresAt).toBeGreaterThan(Date.now());
  });

  it('normalises email to lowercase', () => {
    const { token } = createResetToken('User@EXAMPLE.COM');
    // Should validate with the normalised form.
    expect(() => validateResetToken(token, 'user@example.com')).not.toThrow();
  });

  it('replaces an existing token for the same email', () => {
    const { token: first } = createResetToken('user@example.com');
    const { token: second } = createResetToken('user@example.com');
    expect(second).not.toBe(first);
    // First token is gone.
    expect(() => validateResetToken(first, 'user@example.com')).toThrow('not found');
    // Second token is valid.
    expect(() => validateResetToken(second, 'user@example.com')).not.toThrow();
  });

  it('throws when email is missing', () => {
    expect(() => createResetToken('')).toThrow('email is required');
    expect(() => createResetToken(null)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// validateResetToken
// ---------------------------------------------------------------------------

describe('validateResetToken', () => {
  it('returns the normalised email on success', () => {
    const { token } = createResetToken('Test@Example.com');
    const email = validateResetToken(token, 'Test@Example.com');
    expect(email).toBe('test@example.com');
  });

  it('throws when token is not found', () => {
    expect(() => validateResetToken('nonexistent', 'a@b.com')).toThrow('not found');
  });

  it('throws when email does not match the token', () => {
    const { token } = createResetToken('alice@example.com');
    expect(() => validateResetToken(token, 'bob@example.com')).toThrow('does not match');
  });

  it('throws when token or email is missing', () => {
    expect(() => validateResetToken('', 'a@b.com')).toThrow();
    expect(() => validateResetToken('tok', '')).toThrow();
  });

  it('does NOT consume the token — can be validated twice before consuming', () => {
    const { token } = createResetToken('multi@example.com');
    validateResetToken(token, 'multi@example.com');
    // Second call should still succeed.
    expect(() => validateResetToken(token, 'multi@example.com')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// consumeResetToken
// ---------------------------------------------------------------------------

describe('consumeResetToken', () => {
  it('invalidates the token', () => {
    const { token } = createResetToken('user@example.com');
    consumeResetToken(token);
    expect(() => validateResetToken(token, 'user@example.com')).toThrow('not found');
  });

  it('is a no-op for unknown tokens', () => {
    expect(() => consumeResetToken('ghost-token')).not.toThrow();
  });
});
