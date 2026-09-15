// In-memory user store. Replace the Map operations with DB calls in production.
import { randomBytes } from 'node:crypto';

/** @type {Map<string, object>} */
const _store = new Map();

/**
 * Create a new user and persist it to the store.
 * @param {{ email: string, passwordHash?: string|null, roles?: string[], oauthProviders?: object }} params
 * @returns {object} The created user (shallow copy)
 */
export function createUser({ email, passwordHash = null, roles = ['user'], oauthProviders = {} }) {
  const id = randomBytes(12).toString('hex');
  const user = {
    id,
    email,
    passwordHash,
    roles: [...roles],
    oauthProviders: { ...oauthProviders },
    createdAt: new Date().toISOString(),
  };
  _store.set(id, user);
  return { ...user };
}

/**
 * Look up a user by email address (case-sensitive).
 * @param {string} email
 * @returns {object|null}
 */
export function findUserByEmail(email) {
  for (const u of _store.values()) {
    if (u.email === email) return { ...u };
  }
  return null;
}

/**
 * Look up a user by their internal ID.
 * @param {string} id
 * @returns {object|null}
 */
export function findUserById(id) {
  const u = _store.get(id);
  return u ? { ...u } : null;
}

/**
 * Look up a user linked to an OAuth provider+ID pair.
 * @param {string} provider  - e.g. "google" | "github"
 * @param {string} providerId
 * @returns {object|null}
 */
export function findUserByOAuth(provider, providerId) {
  for (const u of _store.values()) {
    if (u.oauthProviders[provider] === providerId) return { ...u };
  }
  return null;
}

/**
 * Merge updates into an existing user record.
 * @param {string} id
 * @param {object} updates
 * @returns {object|null} Updated user, or null if not found
 */
export function updateUser(id, updates) {
  const u = _store.get(id);
  if (!u) return null;
  const updated = { ...u, ...updates };
  _store.set(id, updated);
  return { ...updated };
}

/** Clear the store — for tests only. */
export function _clearUsers() {
  _store.clear();
}
