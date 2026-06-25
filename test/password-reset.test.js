import { describe, it, expect, beforeEach } from 'vitest';
import {
  setUserAdapter,
  setResetTokenAdapter,
  forgotPassword,
  resetPassword,
  hashPassword,
  verifyPassword,
} from '../api/_lib/password-reset.js';
import {
  buildInMemoryUserAdapter,
  buildInMemoryResetTokenAdapter,
} from '../api/_lib/db-adapter.js';
import { randomBytes } from 'node:crypto';

const SECRET = 'test-reset-secret-key-for-tests';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeUserId() {
  return 'user-' + randomBytes(4).toString('hex');
}

// Build fresh adapters and seed a test user, returning userId + adapters.
async function setup(email = 'alice@example.com', password = 'hunter2!pass') {
  const userAdapter = buildInMemoryUserAdapter();
  const resetAdapter = buildInMemoryResetTokenAdapter();

  setUserAdapter(userAdapter);
  setResetTokenAdapter(resetAdapter);

  const userId = makeUserId();
  await userAdapter.createUser({
    id: userId,
    email,
    passwordHash: hashPassword(password),
    createdAt: Math.floor(Date.now() / 1000),
  });

  return { userAdapter, resetAdapter, userId, email, password };
}

// ── hashPassword / verifyPassword ─────────────────────────────────────────────

describe('hashPassword', () => {
  it('returns a pbkdf2 hash string', () => {
    const hash = hashPassword('secret123');
    expect(hash).toMatch(/^pbkdf2:\d+:[0-9a-f]+:[0-9a-f]+$/);
  });

  it('produces different hashes for the same password (random salt)', () => {
    const h1 = hashPassword('same-password');
    const h2 = hashPassword('same-password');
    expect(h1).not.toBe(h2);
  });
});

describe('verifyPassword', () => {
  it('returns true for a matching password', () => {
    const pw   = 'my-secure-password!';
    const hash = hashPassword(pw);
    expect(verifyPassword(pw, hash)).toBe(true);
  });

  it('returns false for a wrong password', () => {
    const hash = hashPassword('correct-password');
    expect(verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('throws on malformed hash', () => {
    expect(() => verifyPassword('pw', 'not-a-valid-hash')).toThrow('Invalid hash format');
  });
});

// ── buildInMemoryUserAdapter ──────────────────────────────────────────────────

describe('buildInMemoryUserAdapter', () => {
  let adapter;

  beforeEach(() => { adapter = buildInMemoryUserAdapter(); });

  it('creates and retrieves a user by email', async () => {
    const user = { id: 'u1', email: 'bob@test.com', passwordHash: 'hash', createdAt: 1000 };
    await adapter.createUser(user);
    const found = await adapter.findUserByEmail('bob@test.com');
    expect(found).toEqual(user);
  });

  it('creates and retrieves a user by id', async () => {
    const user = { id: 'u2', email: 'carol@test.com', passwordHash: 'hash', createdAt: 1000 };
    await adapter.createUser(user);
    const found = await adapter.findUserById('u2');
    expect(found).toEqual(user);
  });

  it('returns null for unknown email', async () => {
    expect(await adapter.findUserByEmail('ghost@test.com')).toBeNull();
  });

  it('returns null for unknown id', async () => {
    expect(await adapter.findUserById('ghost-id')).toBeNull();
  });

  it('throws when creating a duplicate email', async () => {
    const user = { id: 'u3', email: 'dup@test.com', passwordHash: 'hash', createdAt: 1000 };
    await adapter.createUser(user);
    await expect(adapter.createUser({ ...user, id: 'u4' })).rejects.toThrow('Email already in use');
  });

  it('updates user fields', async () => {
    const user = { id: 'u5', email: 'dave@test.com', passwordHash: 'oldhash', createdAt: 1000 };
    await adapter.createUser(user);
    const updated = await adapter.updateUser('u5', { passwordHash: 'newhash' });
    expect(updated.passwordHash).toBe('newhash');
    // Original email is preserved
    expect(updated.email).toBe('dave@test.com');
  });

  it('throws when updating unknown user', async () => {
    await expect(adapter.updateUser('ghost', {})).rejects.toThrow('User not found');
  });
});

// ── buildInMemoryResetTokenAdapter ────────────────────────────────────────────

describe('buildInMemoryResetTokenAdapter', () => {
  let adapter;

  beforeEach(() => { adapter = buildInMemoryResetTokenAdapter(); });

  const SAMPLE_TOKEN = { jti: 'jti-abc', userId: 'u-1', expiresAt: 9999999999, usedAt: null };

  it('stores and retrieves a token', async () => {
    await adapter.createResetToken(SAMPLE_TOKEN);
    const found = await adapter.findResetToken('jti-abc');
    expect(found).toEqual(SAMPLE_TOKEN);
  });

  it('returns null for unknown jti', async () => {
    expect(await adapter.findResetToken('missing-jti')).toBeNull();
  });

  it('marks a token as used', async () => {
    await adapter.createResetToken(SAMPLE_TOKEN);
    await adapter.markResetTokenUsed('jti-abc');
    const found = await adapter.findResetToken('jti-abc');
    expect(found.usedAt).toBeGreaterThan(0);
  });

  it('throws when marking an unknown token as used', async () => {
    await expect(adapter.markResetTokenUsed('ghost-jti')).rejects.toThrow('Reset token not found');
  });
});

// ── forgotPassword ────────────────────────────────────────────────────────────

describe('forgotPassword', () => {
  beforeEach(async () => { await setup(); });

  it('returns success:true for a known email', async () => {
    const result = await forgotPassword('alice@example.com', {
      secret: SECRET,
      baseUrl: 'https://test.example.com',
    });
    expect(result.success).toBe(true);
  });

  it('returns success:true for an unknown email (no enumeration)', async () => {
    const result = await forgotPassword('nobody@example.com', {
      secret: SECRET,
    });
    expect(result.success).toBe(true);
    // No email should have been queued for unknown address
    expect(result.email).toBeUndefined();
  });

  it('includes email metadata for known user', async () => {
    const result = await forgotPassword('alice@example.com', {
      secret: SECRET,
      baseUrl: 'https://app.example.com',
    });
    expect(result.email).toBeDefined();
    expect(result.email.to).toBe('alice@example.com');
    expect(result.email.subject).toMatch(/password/i);
    expect(result.email.resetUrl).toMatch(/reset-password\.html\?token=/);
    expect(result.email.resetUrl).toMatch(/^https:\/\/app\.example\.com/);
  });

  it('persists a reset token record', async () => {
    const { resetAdapter } = await setup('bob@example.com');
    const result = await forgotPassword('bob@example.com', { secret: SECRET });
    // Token should be present and unused
    const tokenUrl = result.email.resetUrl;
    const tokenValue = new URL(tokenUrl).searchParams.get('token');
    expect(tokenValue).toBeTruthy();
    // Extract jti from token
    const payload = JSON.parse(Buffer.from(tokenValue.split('.')[1], 'base64url').toString('utf8'));
    const record = await resetAdapter.findResetToken(payload.jti);
    expect(record).not.toBeNull();
    expect(record.usedAt).toBeNull();
  });

  it('throws when no user adapter is configured', async () => {
    setUserAdapter(null);
    await expect(forgotPassword('x@x.com', { secret: SECRET })).rejects.toThrow(
      'No user adapter configured',
    );
  });
});

// ── resetPassword ─────────────────────────────────────────────────────────────

describe('resetPassword', () => {
  async function setupWithToken(email = 'alice@example.com') {
    const ctx = await setup(email);
    const forgotResult = await forgotPassword(email, {
      secret: SECRET,
      baseUrl: 'https://test.example.com',
    });
    const tokenUrl   = forgotResult.email.resetUrl;
    const resetToken = new URL(tokenUrl).searchParams.get('token');
    return { ...ctx, resetToken };
  }

  it('returns success:true on valid token + new password', async () => {
    const { resetToken } = await setupWithToken();
    const result = await resetPassword(resetToken, 'new-secure-password!', { secret: SECRET });
    expect(result.success).toBe(true);
  });

  it('updates the password hash in the user store', async () => {
    const { userAdapter, userId, resetToken } = await setupWithToken();
    await resetPassword(resetToken, 'brand-new-pass1!', { secret: SECRET });
    const user = await userAdapter.findUserById(userId);
    expect(verifyPassword('brand-new-pass1!', user.passwordHash)).toBe(true);
  });

  it('old password no longer matches after reset', async () => {
    const { userAdapter, userId, password, resetToken } = await setupWithToken();
    await resetPassword(resetToken, 'replacement-pass!', { secret: SECRET });
    const user = await userAdapter.findUserById(userId);
    expect(verifyPassword(password, user.passwordHash)).toBe(false);
  });

  it('marks the token as used after reset', async () => {
    const { resetAdapter, resetToken } = await setupWithToken();
    await resetPassword(resetToken, 'pass-after-mark!', { secret: SECRET });
    // Extract jti
    const payload = JSON.parse(Buffer.from(resetToken.split('.')[1], 'base64url').toString('utf8'));
    const record = await resetAdapter.findResetToken(payload.jti);
    expect(record.usedAt).toBeGreaterThan(0);
  });

  it('rejects a reused token', async () => {
    const { resetToken } = await setupWithToken();
    await resetPassword(resetToken, 'first-use-pass!!', { secret: SECRET });
    await expect(resetPassword(resetToken, 'second-use-pass!', { secret: SECRET })).rejects.toThrow(
      'already been used',
    );
  });

  it('rejects a token with a wrong secret', async () => {
    const { resetToken } = await setupWithToken();
    await expect(resetPassword(resetToken, 'any-pass-here!!', { secret: 'wrong-secret' })).rejects.toThrow(
      'Invalid token signature',
    );
  });

  it('rejects an expired token', async () => {
    await setup('exp@example.com');
    // Issue a token that is already expired (TTL = -1)
    const forgotResult = await forgotPassword('exp@example.com', {
      secret: SECRET,
      baseUrl: 'https://test.example.com',
      tokenTTL: -1,
    });
    const expiredToken = new URL(forgotResult.email.resetUrl).searchParams.get('token');
    await expect(resetPassword(expiredToken, 'any-password!!', { secret: SECRET })).rejects.toThrow(
      'Token expired',
    );
  });

  it('rejects a plaintext non-token string', async () => {
    await setup();
    await expect(resetPassword('not.a.real.token', 'somepassword!', { secret: SECRET })).rejects.toThrow();
  });

  it('throws when no reset-token adapter is configured', async () => {
    const { resetToken } = await setupWithToken();
    setResetTokenAdapter(null);
    await expect(resetPassword(resetToken, 'pass-no-adapter!', { secret: SECRET })).rejects.toThrow(
      'No reset-token adapter configured',
    );
  });
});
