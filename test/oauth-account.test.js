import { describe, it, expect, beforeEach } from 'vitest';
import {
  setUserAdapter,
  findOrCreateOAuthUser,
} from '../api/_lib/oauth-account.js';
import { buildInMemoryUserAdapter } from '../api/_lib/db-adapter.js';

const GOOGLE_PROFILE = { id: 'g-123', email: 'alice@example.com', name: 'Alice' };
const GITHUB_PROFILE = { id: 'gh-456', email: 'bob@example.com', name: 'Bob' };

beforeEach(() => {
  setUserAdapter(buildInMemoryUserAdapter());
});

// ── setUserAdapter guard ──────────────────────────────────────────────────────

describe('setUserAdapter — guard', () => {
  it('throws when no adapter is set', async () => {
    setUserAdapter(null);
    await expect(
      findOrCreateOAuthUser('google', 'x', GOOGLE_PROFILE),
    ).rejects.toThrow('No user adapter configured');
  });
});

// ── new user via OAuth ────────────────────────────────────────────────────────

describe('findOrCreateOAuthUser — new user', () => {
  it('returns a userId', async () => {
    const result = await findOrCreateOAuthUser('google', GOOGLE_PROFILE.id, GOOGLE_PROFILE);
    expect(typeof result.userId).toBe('string');
    expect(result.userId.length).toBeGreaterThan(0);
  });

  it('marks the user as new on first login', async () => {
    const result = await findOrCreateOAuthUser('google', GOOGLE_PROFILE.id, GOOGLE_PROFILE);
    expect(result.isNewUser).toBe(true);
  });
});

// ── returning user via same provider ─────────────────────────────────────────

describe('findOrCreateOAuthUser — returning user, same provider', () => {
  it('returns the same userId on subsequent logins', async () => {
    const first  = await findOrCreateOAuthUser('google', GOOGLE_PROFILE.id, GOOGLE_PROFILE);
    const second = await findOrCreateOAuthUser('google', GOOGLE_PROFILE.id, GOOGLE_PROFILE);
    expect(second.userId).toBe(first.userId);
  });

  it('marks the user as NOT new on subsequent logins', async () => {
    await findOrCreateOAuthUser('google', GOOGLE_PROFILE.id, GOOGLE_PROFILE);
    const second = await findOrCreateOAuthUser('google', GOOGLE_PROFILE.id, GOOGLE_PROFILE);
    expect(second.isNewUser).toBe(false);
  });
});

// ── account linking by email ──────────────────────────────────────────────────

describe('findOrCreateOAuthUser — account linking by email', () => {
  it('links a GitHub account to an existing Google user with the same email', async () => {
    const googleResult = await findOrCreateOAuthUser('google', GOOGLE_PROFILE.id, GOOGLE_PROFILE);

    // Same email, different provider
    const sameEmailGitHub = { id: 'gh-999', email: GOOGLE_PROFILE.email, name: 'Alice on GitHub' };
    const githubResult = await findOrCreateOAuthUser('github', sameEmailGitHub.id, sameEmailGitHub);

    expect(githubResult.userId).toBe(googleResult.userId);
  });

  it('creates a separate user when emails differ', async () => {
    const r1 = await findOrCreateOAuthUser('google', GOOGLE_PROFILE.id, GOOGLE_PROFILE);
    const r2 = await findOrCreateOAuthUser('github', GITHUB_PROFILE.id, GITHUB_PROFILE);
    expect(r1.userId).not.toBe(r2.userId);
  });
});

// ── profile without email ─────────────────────────────────────────────────────

describe('findOrCreateOAuthUser — null email', () => {
  it('creates a user when email is null', async () => {
    const noEmailProfile = { id: 'gh-no-email', email: null, name: 'No Email User' };
    const result = await findOrCreateOAuthUser('github', noEmailProfile.id, noEmailProfile);
    expect(typeof result.userId).toBe('string');
    expect(result.isNewUser).toBe(true);
  });

  it('does not link null-email accounts to each other', async () => {
    const p1 = { id: 'gh-001', email: null, name: 'User One' };
    const p2 = { id: 'gh-002', email: null, name: 'User Two' };
    const r1 = await findOrCreateOAuthUser('github', p1.id, p1);
    const r2 = await findOrCreateOAuthUser('github', p2.id, p2);
    expect(r1.userId).not.toBe(r2.userId);
  });
});

// ── buildInMemoryUserAdapter ──────────────────────────────────────────────────

describe('buildInMemoryUserAdapter', () => {
  it('createUser returns a user with an id and createdAt', async () => {
    const adapter = buildInMemoryUserAdapter();
    const user = await adapter.createUser({ email: 'x@example.com', name: 'X' });
    expect(typeof user.id).toBe('string');
    expect(typeof user.createdAt).toBe('number');
    expect(user.email).toBe('x@example.com');
  });

  it('findUserByEmail returns null for unknown email', async () => {
    const adapter = buildInMemoryUserAdapter();
    expect(await adapter.findUserByEmail('ghost@example.com')).toBeNull();
  });

  it('findUserById returns the created user', async () => {
    const adapter = buildInMemoryUserAdapter();
    const created = await adapter.createUser({ email: 'y@example.com', name: 'Y' });
    const found   = await adapter.findUserById(created.id);
    expect(found).toEqual(created);
  });

  it('findAccountByProvider returns null when no account exists', async () => {
    const adapter = buildInMemoryUserAdapter();
    expect(await adapter.findAccountByProvider('google', 'nobody')).toBeNull();
  });

  it('createAccount and findAccountByProvider round-trip', async () => {
    const adapter = buildInMemoryUserAdapter();
    const user    = await adapter.createUser({ email: null, name: 'Z' });
    await adapter.createAccount({ userId: user.id, provider: 'github', providerAccountId: 'gh-789' });
    const account = await adapter.findAccountByProvider('github', 'gh-789');
    expect(account).not.toBeNull();
    expect(account.userId).toBe(user.id);
  });
});
