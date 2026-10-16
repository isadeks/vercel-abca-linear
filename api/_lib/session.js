// Session management module.
// Consumes auth.js for token creation/verification and exposes the utility
// helpers (getSession, refreshSession) that other API modules depend on.
//
// Session schema stored in the DB adapter:
//   {
//     userId      : string   — FK to users table
//     accessToken : string   — current access JWT
//     refreshToken: string   — current refresh JWT
//     createdAt   : number   — epoch-seconds of session creation
//     expiresAt   : number   — epoch-seconds when refreshToken expires
//   }

import {
  createAccessToken,
  createRefreshToken,
  verifyToken,
} from './auth.js';

// ── In-process session store (replaced by DB adapter in production) ───────────
// The adapter contract:
//   create(sessionData)  → session
//   findByUserId(userId) → session | null
//   update(userId, data) → session
//   delete(userId)       → void

let _adapter = null;

/**
 * Register a database adapter.
 * @param {{ create, findByUserId, update, delete }} adapter
 */
export function setSessionAdapter(adapter) {
  _adapter = adapter;
}

/** Returns the active adapter or throws if none has been registered. */
function adapter() {
  if (!_adapter) {
    throw new Error(
      'No session adapter configured. Call setSessionAdapter() before using session helpers.',
    );
  }
  return _adapter;
}

// ── Session lifecycle ─────────────────────────────────────────────────────────

/**
 * Create a new session for the given user.
 * @param {string} userId
 * @param {string} secret   JWT signing secret
 * @param {{ accessTTL?: number, refreshTTL?: number }} [opts]
 * @returns {Promise<object>} persisted session record
 */
export async function createSession(userId, secret, opts = {}) {
  const { accessTTL = 900, refreshTTL = 604800 } = opts;
  const now = Math.floor(Date.now() / 1000);

  const accessToken = createAccessToken(userId, secret, accessTTL);
  const refreshToken = createRefreshToken(userId, secret, refreshTTL);

  return adapter().create({
    userId,
    accessToken,
    refreshToken,
    createdAt: now,
    expiresAt: now + refreshTTL,
  });
}

/**
 * Retrieve the session for the given user (returns null if not found).
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function getSession(userId) {
  return adapter().findByUserId(userId);
}

/**
 * Validate an access token and return its payload.
 * Throws if the token is invalid or expired.
 * @param {string} accessToken
 * @param {string} secret
 * @returns {object} JWT payload
 */
export function validateAccessToken(accessToken, secret) {
  const payload = verifyToken(accessToken, secret);
  if (payload.type !== 'access') {
    throw new Error('Expected access token, got: ' + payload.type);
  }
  return payload;
}

/**
 * Use a refresh token to issue a new access token.
 * Validates the refresh token, rotates it (new access + refresh tokens),
 * persists the updated session, and returns the new tokens.
 *
 * @param {string} userId
 * @param {string} secret
 * @param {{ accessTTL?: number, refreshTTL?: number }} [opts]
 * @returns {Promise<{ accessToken: string, refreshToken: string }>}
 */
export async function refreshSession(userId, secret, opts = {}) {
  const { accessTTL = 900, refreshTTL = 604800 } = opts;
  const session = await getSession(userId);

  if (!session) throw new Error('Session not found for user: ' + userId);

  // Validate the stored refresh token to make sure the session is still valid.
  const payload = verifyToken(session.refreshToken, secret);
  if (payload.type !== 'refresh') {
    throw new Error('Stored token is not a refresh token');
  }

  const now = Math.floor(Date.now() / 1000);
  const accessToken = createAccessToken(userId, secret, accessTTL);
  const refreshToken = createRefreshToken(userId, secret, refreshTTL);

  await adapter().update(userId, {
    accessToken,
    refreshToken,
    expiresAt: now + refreshTTL,
  });

  return { accessToken, refreshToken };
}

/**
 * Destroy the session for the given user (logout).
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function deleteSession(userId) {
  return adapter().delete(userId);
}
