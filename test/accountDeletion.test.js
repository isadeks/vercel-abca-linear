import { describe, it, expect, beforeEach } from 'vitest';
import {
  REQUIRED_PHRASE,
  verifyPassword,
  requestAccountDeletion,
} from '../api/_lib/accountDeletion.js';
import { createUser, getUser, _resetStore } from '../api/_lib/account.js';

// Reset the in-memory store before every test.
beforeEach(() => {
  _resetStore();
});

// ── REQUIRED_PHRASE ───────────────────────────────────────────────────────────

describe('REQUIRED_PHRASE', () => {
  it('is a non-empty string', () => {
    expect(typeof REQUIRED_PHRASE).toBe('string');
    expect(REQUIRED_PHRASE.length).toBeGreaterThan(0);
  });
});

// ── verifyPassword ────────────────────────────────────────────────────────────

describe('verifyPassword', () => {
  it('returns true for a correct $plain$ password', () => {
    expect(verifyPassword('hunter2', '$plain$hunter2')).toBe(true);
  });

  it('returns false for an incorrect password', () => {
    expect(verifyPassword('wrong', '$plain$hunter2')).toBe(false);
  });

  it('returns false when the hash uses an unsupported format', () => {
    expect(verifyPassword('hunter2', '$argon2id$somehash')).toBe(false);
  });

  it('returns false when the hash is empty', () => {
    expect(verifyPassword('hunter2', '')).toBe(false);
  });

  it('returns false when plaintext is not a string', () => {
    expect(verifyPassword(null, '$plain$hunter2')).toBe(false);
    expect(verifyPassword(undefined, '$plain$hunter2')).toBe(false);
    expect(verifyPassword(123, '$plain$hunter2')).toBe(false);
  });

  it('returns false when hash is not a string', () => {
    expect(verifyPassword('hunter2', null)).toBe(false);
    expect(verifyPassword('hunter2', 42)).toBe(false);
  });

  it('is case-sensitive', () => {
    expect(verifyPassword('Hunter2', '$plain$hunter2')).toBe(false);
    expect(verifyPassword('hunter2', '$plain$Hunter2')).toBe(false);
  });
});

// ── requestAccountDeletion — password flow ────────────────────────────────────

describe('requestAccountDeletion (password flow)', () => {
  it('soft-deletes the account when the password is correct', () => {
    createUser('u1', { passwordHash: '$plain$secret123' });
    const result = requestAccountDeletion('u1', { password: 'secret123' });
    expect(result.deleted).toBe(true);
  });

  it('makes the account invisible to getUser after deletion', () => {
    createUser('u1', { passwordHash: '$plain$secret123' });
    requestAccountDeletion('u1', { password: 'secret123' });
    expect(getUser('u1')).toBeNull();
  });

  it('clears passwordHash before deleting', () => {
    createUser('u1', { passwordHash: '$plain$secret123' });
    const result = requestAccountDeletion('u1', { password: 'secret123' });
    expect(result.passwordHash).toBe('');
  });

  it('clears 2FA fields before deleting', () => {
    createUser('u1', {
      passwordHash: '$plain$secret123',
      twoFactorEnabled: true,
      twoFactorSecret: 'TOTP_SECRET',
    });
    const result = requestAccountDeletion('u1', { password: 'secret123' });
    expect(result.twoFactorEnabled).toBe(false);
    expect(result.twoFactorSecret).toBeNull();
  });

  it('throws for an incorrect password', () => {
    createUser('u1', { passwordHash: '$plain$secret123' });
    expect(() => requestAccountDeletion('u1', { password: 'wrongpass' })).toThrow(
      /incorrect password/,
    );
  });

  it('does not modify the account when the password is wrong', () => {
    createUser('u1', { passwordHash: '$plain$secret123', displayName: 'Alice' });
    try {
      requestAccountDeletion('u1', { password: 'wrong' });
    } catch {
      // expected
    }
    const user = getUser('u1');
    expect(user).not.toBeNull();
    expect(user.deleted).toBe(false);
    expect(user.displayName).toBe('Alice');
  });
});

// ── requestAccountDeletion — phrase flow ─────────────────────────────────────

describe('requestAccountDeletion (phrase flow)', () => {
  it('soft-deletes when the exact phrase is supplied', () => {
    createUser('u1');
    const result = requestAccountDeletion('u1', { phrase: REQUIRED_PHRASE });
    expect(result.deleted).toBe(true);
  });

  it('throws when the phrase does not match', () => {
    createUser('u1');
    expect(() => requestAccountDeletion('u1', { phrase: 'delete my Account' })).toThrow(
      /confirmation phrase/,
    );
  });

  it('throws when the phrase is empty', () => {
    createUser('u1');
    expect(() => requestAccountDeletion('u1', { phrase: '' })).toThrow(/confirmation phrase/);
  });

  it('is case-sensitive (wrong case rejected)', () => {
    createUser('u1');
    expect(() => requestAccountDeletion('u1', { phrase: REQUIRED_PHRASE.toUpperCase() })).toThrow(
      /confirmation phrase/,
    );
  });

  it('does not modify the account when the phrase is wrong', () => {
    createUser('u1', { displayName: 'Bob' });
    try {
      requestAccountDeletion('u1', { phrase: 'wrong phrase' });
    } catch {
      // expected
    }
    const user = getUser('u1');
    expect(user).not.toBeNull();
    expect(user.deleted).toBe(false);
  });
});

// ── requestAccountDeletion — validation ───────────────────────────────────────

describe('requestAccountDeletion (validation)', () => {
  it('throws when neither password nor phrase is supplied', () => {
    createUser('u1');
    expect(() => requestAccountDeletion('u1', {})).toThrow(/confirmation required/);
  });

  it('throws when called with no second argument', () => {
    createUser('u1');
    expect(() => requestAccountDeletion('u1')).toThrow(/confirmation required/);
  });

  it('throws for an unknown userId', () => {
    expect(() => requestAccountDeletion('no-such-user', { phrase: REQUIRED_PHRASE })).toThrow(
      /not found/,
    );
  });

  it('throws for a userId that has already been deleted', () => {
    createUser('u1');
    requestAccountDeletion('u1', { phrase: REQUIRED_PHRASE });
    // Second deletion attempt should fail because the user is gone from active records.
    expect(() => requestAccountDeletion('u1', { phrase: REQUIRED_PHRASE })).toThrow(/not found/);
  });
});
