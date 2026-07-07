import { describe, it, expect, beforeEach } from 'vitest';
import { createUser, _resetStore } from '../api/_lib/account.js';
import { changePassword, MIN_PASSWORD_LENGTH } from '../api/_lib/password.js';

// ── helpers ──────────────────────────────────────────────────────────────────

/** Create a user whose stored "hash" is the literal password string. */
function makeUser(userId, plainPassword) {
  return createUser(userId, { passwordHash: plainPassword });
}

// ── test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  _resetStore();
});

// ── correct password change ───────────────────────────────────────────────────

describe('changePassword — success', () => {
  it('returns { ok: true } when all inputs are valid', () => {
    makeUser('u1', 'old-pass-123');
    const result = changePassword('u1', 'old-pass-123', 'new-pass-456', 'new-pass-456');
    expect(result).toEqual({ ok: true });
  });

  it('updates the stored passwordHash to the new password', () => {
    makeUser('u1', 'old-pass-123');
    changePassword('u1', 'old-pass-123', 'new-pass-456', 'new-pass-456');

    // Confirm old password no longer works.
    expect(() =>
      changePassword('u1', 'old-pass-123', 'another-pw-789', 'another-pw-789'),
    ).toThrow();

    // Confirm new password works.
    const result = changePassword('u1', 'new-pass-456', 'another-pw-789', 'another-pw-789');
    expect(result).toEqual({ ok: true });
  });

  it('accepts a password exactly at the minimum length', () => {
    const minPw = 'x'.repeat(MIN_PASSWORD_LENGTH);
    makeUser('u1', 'old-pass-123');
    const result = changePassword('u1', 'old-pass-123', minPw, minPw);
    expect(result).toEqual({ ok: true });
  });
});

// ── wrong current password ────────────────────────────────────────────────────

describe('changePassword — wrong current password', () => {
  it('throws with code WRONG_CURRENT_PASSWORD', () => {
    makeUser('u1', 'old-pass-123');
    expect(() =>
      changePassword('u1', 'not-the-right-one', 'new-pass-456', 'new-pass-456'),
    ).toThrow(expect.objectContaining({ code: 'WRONG_CURRENT_PASSWORD' }));
  });

  it('throws with a descriptive message', () => {
    makeUser('u1', 'old-pass-123');
    expect(() =>
      changePassword('u1', 'wrong', 'new-pass-456', 'new-pass-456'),
    ).toThrow(/current password is incorrect/i);
  });

  it('does not update the stored password when current password is wrong', () => {
    makeUser('u1', 'old-pass-123');
    try {
      changePassword('u1', 'wrong-current', 'new-pass-456', 'new-pass-456');
    } catch {
      // expected
    }
    // Old password should still work.
    const result = changePassword('u1', 'old-pass-123', 'new-pass-456', 'new-pass-456');
    expect(result).toEqual({ ok: true });
  });
});

// ── mismatched confirmation ───────────────────────────────────────────────────

describe('changePassword — mismatched confirmation', () => {
  it('throws with code PASSWORD_MISMATCH', () => {
    makeUser('u1', 'old-pass-123');
    expect(() =>
      changePassword('u1', 'old-pass-123', 'new-pass-456', 'does-not-match'),
    ).toThrow(expect.objectContaining({ code: 'PASSWORD_MISMATCH' }));
  });

  it('throws with a descriptive message', () => {
    makeUser('u1', 'old-pass-123');
    expect(() =>
      changePassword('u1', 'old-pass-123', 'new-pass-456', 'different'),
    ).toThrow(/do not match/i);
  });
});

// ── minimum length enforcement ────────────────────────────────────────────────

describe('changePassword — password strength', () => {
  it('throws with code PASSWORD_TOO_SHORT when new password is too short', () => {
    const shortPw = 'x'.repeat(MIN_PASSWORD_LENGTH - 1);
    makeUser('u1', 'old-pass-123');
    expect(() =>
      changePassword('u1', 'old-pass-123', shortPw, shortPw),
    ).toThrow(expect.objectContaining({ code: 'PASSWORD_TOO_SHORT' }));
  });

  it('throws with a message mentioning the minimum length', () => {
    const shortPw = 'abc';
    makeUser('u1', 'old-pass-123');
    expect(() =>
      changePassword('u1', 'old-pass-123', shortPw, shortPw),
    ).toThrow(new RegExp(`${MIN_PASSWORD_LENGTH}`));
  });
});

// ── unknown user ──────────────────────────────────────────────────────────────

describe('changePassword — unknown user', () => {
  it('throws with code USER_NOT_FOUND', () => {
    expect(() =>
      changePassword('no-such-user', 'old-pass-123', 'new-pass-456', 'new-pass-456'),
    ).toThrow(expect.objectContaining({ code: 'USER_NOT_FOUND' }));
  });
});
