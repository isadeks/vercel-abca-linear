// Login sessions — create, read, destroy. Backed by the pluggable store.
//
// A session is an opaque random token (the cookie value) mapped to a record:
//   { id, userId, createdAt, expiresAt }
//
// Key: session:<token>
import { getStore } from './store.js';
import { generateToken } from './crypto.js';

// 30 days — long enough to "stay signed in across visits".
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function sessionKey(id) {
  return `session:${id}`;
}

export async function createSession(userId) {
  const store = getStore();
  const now = Date.now();
  const session = {
    id: generateToken(32),
    userId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
  };
  await store.set(sessionKey(session.id), session);
  return session;
}

// Fetch a session by token. Returns null if missing or expired (expired
// sessions are proactively deleted).
export async function getSession(id) {
  if (!id) return null;
  const store = getStore();
  const session = await store.get(sessionKey(id));
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await store.del(sessionKey(id));
    return null;
  }
  return session;
}

export async function destroySession(id) {
  if (!id) return;
  await getStore().del(sessionKey(id));
}
