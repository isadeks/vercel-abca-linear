import { describe, it, expect, beforeEach } from 'vitest';
import {
  setSessionAdapter,
  createSession,
  getSession,
  validateAccessToken,
  refreshSession,
  deleteSession,
} from '../api/_lib/session.js';
import { buildInMemoryAdapter } from '../api/_lib/db-adapter.js';

const SECRET = 'session-test-secret-key';
const USER_ID = 'user-abc-123';

// Reset adapter before each test to avoid cross-test contamination
beforeEach(() => {
  setSessionAdapter(buildInMemoryAdapter());
});

describe('createSession', () => {
  it('returns a session record with correct shape', async () => {
    const session = await createSession(USER_ID, SECRET);
    expect(session.userId).toBe(USER_ID);
    expect(typeof session.accessToken).toBe('string');
    expect(typeof session.refreshToken).toBe('string');
    expect(typeof session.createdAt).toBe('number');
    expect(typeof session.expiresAt).toBe('number');
  });

  it('expiresAt is ~7 days from now by default', async () => {
    const before = Math.floor(Date.now() / 1000);
    const session = await createSession(USER_ID, SECRET);
    const after = Math.floor(Date.now() / 1000);
    expect(session.expiresAt).toBeGreaterThanOrEqual(before + 604800);
    expect(session.expiresAt).toBeLessThanOrEqual(after + 604800);
  });

  it('respects custom TTL options', async () => {
    const session = await createSession(USER_ID, SECRET, {
      accessTTL: 60,
      refreshTTL: 3600,
    });
    const now = Math.floor(Date.now() / 1000);
    expect(session.expiresAt - now).toBeLessThanOrEqual(3600);
    expect(session.expiresAt - now).toBeGreaterThan(3599);
  });
});

describe('getSession', () => {
  it('returns null when no session exists', async () => {
    const result = await getSession('no-such-user');
    expect(result).toBeNull();
  });

  it('returns the session after creation', async () => {
    await createSession(USER_ID, SECRET);
    const session = await getSession(USER_ID);
    expect(session).not.toBeNull();
    expect(session.userId).toBe(USER_ID);
  });
});

describe('validateAccessToken', () => {
  it('returns payload for a valid access token', async () => {
    const session = await createSession(USER_ID, SECRET);
    const payload = validateAccessToken(session.accessToken, SECRET);
    expect(payload.sub).toBe(USER_ID);
    expect(payload.type).toBe('access');
  });

  it('throws when passed a refresh token', async () => {
    const session = await createSession(USER_ID, SECRET);
    expect(() => validateAccessToken(session.refreshToken, SECRET)).toThrow(
      'Expected access token',
    );
  });

  it('throws for an invalid signature', () => {
    expect(() => validateAccessToken('bad.token.here', SECRET)).toThrow();
  });
});

describe('refreshSession', () => {
  it('returns new access and refresh tokens', async () => {
    const original = await createSession(USER_ID, SECRET);
    const { accessToken, refreshToken } = await refreshSession(USER_ID, SECRET);
    expect(accessToken).not.toBe(original.accessToken);
    expect(refreshToken).not.toBe(original.refreshToken);
  });

  it('new access token is valid', async () => {
    await createSession(USER_ID, SECRET);
    const { accessToken } = await refreshSession(USER_ID, SECRET);
    const payload = validateAccessToken(accessToken, SECRET);
    expect(payload.sub).toBe(USER_ID);
  });

  it('throws when session does not exist', async () => {
    await expect(refreshSession('unknown-user', SECRET)).rejects.toThrow(
      'Session not found',
    );
  });

  it('updates the stored session to the new tokens', async () => {
    await createSession(USER_ID, SECRET);
    const { accessToken } = await refreshSession(USER_ID, SECRET);
    const stored = await getSession(USER_ID);
    expect(stored.accessToken).toBe(accessToken);
  });
});

describe('deleteSession', () => {
  it('removes the session so getSession returns null', async () => {
    await createSession(USER_ID, SECRET);
    await deleteSession(USER_ID);
    const result = await getSession(USER_ID);
    expect(result).toBeNull();
  });
});

describe('setSessionAdapter — guard', () => {
  it('throws when no adapter is set', async () => {
    setSessionAdapter(null);
    await expect(createSession(USER_ID, SECRET)).rejects.toThrow(
      'No session adapter configured',
    );
  });
});
