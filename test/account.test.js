import { describe, it, expect, beforeEach } from 'vitest';
import {
  createUser,
  getUser,
  updateUser,
  deleteUser,
  listUsers,
  _resetStore,
} from '../api/_lib/account.js';

// Reset the in-memory store before every test so tests are fully isolated.
beforeEach(() => {
  _resetStore();
});

// ── createUser ───────────────────────────────────────────────────────────────

describe('createUser', () => {
  it('creates a user with the given userId', () => {
    const user = createUser('u1');
    expect(user.userId).toBe('u1');
  });

  it('applies default values for all fields', () => {
    const user = createUser('u1');
    // profile
    expect(user.displayName).toBe('');
    expect(user.email).toBe('');
    expect(user.bio).toBe('');
    expect(user.avatarUrl).toBe('');
    // auth
    expect(user.passwordHash).toBe('');
    expect(user.twoFactorEnabled).toBe(false);
    expect(user.twoFactorSecret).toBeNull();
    // notifications
    expect(user.notifyEmail).toBe(true);
    expect(user.notifySms).toBe(false);
    expect(user.notifyPush).toBe(true);
    // lifecycle
    expect(user.deleted).toBe(false);
    expect(typeof user.createdAt).toBe('string');
    expect(typeof user.updatedAt).toBe('string');
  });

  it('merges supplied initial fields', () => {
    const user = createUser('u1', {
      displayName: 'Alice',
      email: 'alice@example.com',
      notifySms: true,
      twoFactorEnabled: true,
    });
    expect(user.displayName).toBe('Alice');
    expect(user.email).toBe('alice@example.com');
    expect(user.notifySms).toBe(true);
    expect(user.twoFactorEnabled).toBe(true);
  });

  it('throws if userId is already taken', () => {
    createUser('u1');
    expect(() => createUser('u1')).toThrow(/already exists/);
  });

  it('throws if userId is empty', () => {
    expect(() => createUser('')).toThrow(/non-empty string/);
  });

  it('throws if userId is not a string', () => {
    expect(() => createUser(42)).toThrow(/non-empty string/);
  });

  it('returns a copy — mutating it does not affect the store', () => {
    const user = createUser('u1', { displayName: 'Alice' });
    user.displayName = 'Tampered';
    const fetched = getUser('u1');
    expect(fetched.displayName).toBe('Alice');
  });
});

// ── getUser ──────────────────────────────────────────────────────────────────

describe('getUser', () => {
  it('returns the user record by id', () => {
    createUser('u1', { email: 'a@b.com' });
    const user = getUser('u1');
    expect(user.email).toBe('a@b.com');
  });

  it('returns null for an unknown userId', () => {
    expect(getUser('missing')).toBeNull();
  });

  it('returns null for a deleted user by default', () => {
    createUser('u1');
    deleteUser('u1');
    expect(getUser('u1')).toBeNull();
  });

  it('returns a deleted user when includeDeleted is true', () => {
    createUser('u1');
    deleteUser('u1');
    const user = getUser('u1', { includeDeleted: true });
    expect(user).not.toBeNull();
    expect(user.deleted).toBe(true);
  });
});

// ── updateUser ───────────────────────────────────────────────────────────────

describe('updateUser', () => {
  it('updates mutable profile fields', () => {
    createUser('u1', { displayName: 'Alice' });
    const updated = updateUser('u1', { displayName: 'Alicia', bio: 'Traveller' });
    expect(updated.displayName).toBe('Alicia');
    expect(updated.bio).toBe('Traveller');
  });

  it('updates notification preference flags', () => {
    createUser('u1');
    const updated = updateUser('u1', { notifySms: true, notifyEmail: false });
    expect(updated.notifySms).toBe(true);
    expect(updated.notifyEmail).toBe(false);
  });

  it('updates 2FA state fields', () => {
    createUser('u1');
    const updated = updateUser('u1', {
      twoFactorEnabled: true,
      twoFactorSecret: 'TOTP_SECRET_PLACEHOLDER',
    });
    expect(updated.twoFactorEnabled).toBe(true);
    expect(updated.twoFactorSecret).toBe('TOTP_SECRET_PLACEHOLDER');
  });

  it('sets a fresh updatedAt timestamp', () => {
    createUser('u1');
    const before = getUser('u1').updatedAt;
    const updated = updateUser('u1', { displayName: 'Bob' });
    // updatedAt should be >= createdAt; both are ISO strings
    expect(updated.updatedAt >= before).toBe(true);
  });

  it('does not allow overwriting userId via changes', () => {
    createUser('u1');
    updateUser('u1', { userId: 'u2' });
    expect(getUser('u1')).not.toBeNull();
    expect(getUser('u2')).toBeNull();
  });

  it('does not allow overwriting createdAt via changes', () => {
    createUser('u1');
    const original = getUser('u1').createdAt;
    updateUser('u1', { createdAt: '1970-01-01T00:00:00.000Z' });
    expect(getUser('u1').createdAt).toBe(original);
  });

  it('throws for an unknown userId', () => {
    expect(() => updateUser('missing', {})).toThrow(/not found/);
  });

  it('throws if the user is soft-deleted', () => {
    createUser('u1');
    deleteUser('u1');
    expect(() => updateUser('u1', { displayName: 'Ghost' })).toThrow(/deleted/);
  });
});

// ── deleteUser ───────────────────────────────────────────────────────────────

describe('deleteUser', () => {
  it('soft-deletes a user (sets deleted: true)', () => {
    createUser('u1');
    const result = deleteUser('u1');
    expect(result.deleted).toBe(true);
  });

  it('makes the user invisible to getUser by default after deletion', () => {
    createUser('u1');
    deleteUser('u1');
    expect(getUser('u1')).toBeNull();
  });

  it('throws for an unknown userId', () => {
    expect(() => deleteUser('missing')).toThrow(/not found/);
  });

  it('throws if the user is already deleted', () => {
    createUser('u1');
    deleteUser('u1');
    expect(() => deleteUser('u1')).toThrow(/already deleted/);
  });
});

// ── listUsers ─────────────────────────────────────────────────────────────────

describe('listUsers', () => {
  it('returns an empty array when the store is empty', () => {
    expect(listUsers()).toEqual([]);
  });

  it('returns all active users', () => {
    createUser('u1');
    createUser('u2');
    expect(listUsers()).toHaveLength(2);
  });

  it('excludes soft-deleted users by default', () => {
    createUser('u1');
    createUser('u2');
    deleteUser('u2');
    const active = listUsers();
    expect(active).toHaveLength(1);
    expect(active[0].userId).toBe('u1');
  });

  it('includes deleted users when includeDeleted is true', () => {
    createUser('u1');
    createUser('u2');
    deleteUser('u2');
    expect(listUsers({ includeDeleted: true })).toHaveLength(2);
  });

  it('returns copies — mutating list items does not affect the store', () => {
    createUser('u1', { displayName: 'Alice' });
    const [item] = listUsers();
    item.displayName = 'Tampered';
    expect(getUser('u1').displayName).toBe('Alice');
  });
});

// ── data model completeness ───────────────────────────────────────────────────

describe('data model completeness', () => {
  it('record has all required top-level fields', () => {
    const user = createUser('u1');
    const requiredFields = [
      'userId',
      'displayName', 'email', 'bio', 'avatarUrl',
      'passwordHash',
      'twoFactorEnabled', 'twoFactorSecret',
      'notifyEmail', 'notifySms', 'notifyPush',
      'deleted', 'createdAt', 'updatedAt',
    ];
    for (const field of requiredFields) {
      expect(user).toHaveProperty(field);
    }
  });

  it('passwordHash stores a placeholder string, not plaintext', () => {
    // The module should never hash passwords itself; it merely holds the hash.
    const user = createUser('u1', { passwordHash: '$argon2id$placeholder' });
    expect(user.passwordHash).toBe('$argon2id$placeholder');
  });
});
