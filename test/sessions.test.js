import { describe, it, expect, beforeEach } from 'vitest';
import { getStore, resetStore } from '../api/_lib/store.js';
import {
  createSession,
  getSession,
  destroySession,
  SESSION_TTL_MS,
} from '../api/_lib/sessions.js';

describe('sessions', () => {
  beforeEach(() => {
    resetStore();
  });

  it('creates a session for a user and reads it back', async () => {
    const session = await createSession('user-1');
    expect(session.id).toBeTruthy();
    expect(session.userId).toBe('user-1');
    const fetched = await getSession(session.id);
    expect(fetched.userId).toBe('user-1');
  });

  it('returns null for an unknown session', async () => {
    expect(await getSession('does-not-exist')).toBeNull();
    expect(await getSession(null)).toBeNull();
  });

  it('destroys a session', async () => {
    const session = await createSession('user-1');
    await destroySession(session.id);
    expect(await getSession(session.id)).toBeNull();
  });

  it('treats an expired session as invalid and deletes it', async () => {
    const store = getStore();
    // Write an already-expired session directly.
    const expired = {
      id: 'expired-1',
      userId: 'user-1',
      createdAt: new Date(Date.now() - SESSION_TTL_MS * 2).toISOString(),
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    };
    await store.set('session:expired-1', expired);
    expect(await getSession('expired-1')).toBeNull();
    // Confirm it was purged.
    expect(await store.get('session:expired-1')).toBeNull();
  });

  it('sets an expiry in the future for staying signed in', async () => {
    const session = await createSession('user-1');
    expect(new Date(session.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });
});
