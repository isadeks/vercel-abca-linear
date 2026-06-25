/**
 * User model helpers — password hashing and user schema definition.
 *
 * The in-memory store is intentionally simple: real deployments swap it out
 * for a database.  The interface (createUser / findUserByEmail / verifyPassword)
 * remains stable so callers don't need to change.
 */
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

/**
 * Allowed role values (ordered by privilege level, lowest first).
 * @type {readonly ['viewer', 'editor', 'admin']}
 */
export const ROLES = /** @type {const} */ (['viewer', 'editor', 'admin']);

/**
 * Default role assigned to new users.
 * @type {'viewer'}
 */
export const DEFAULT_ROLE = 'viewer';

/**
 * User schema shape:
 * {
 *   id:           string   — UUID
 *   email:        string   — unique, lower-cased
 *   passwordHash: string   — bcrypt hash (null when provider != 'local')
 *   provider:     'local' | 'google' | 'github'
 *   role:         'viewer' | 'editor' | 'admin'
 *   createdAt:    string   — ISO-8601
 * }
 */

// In-memory store — replace with DB calls in production.
const _users = new Map();

/**
 * Hash a plain-text password.
 * @param {string} password
 * @returns {Promise<string>} bcrypt hash
 */
export async function hashPassword(password) {
  if (!password || typeof password !== 'string' || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain-text password against a stored hash.
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, hash) {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

/**
 * Create and persist a new local user.
 * @param {{ email: string, password: string, role?: 'viewer'|'editor'|'admin' }} opts
 * @returns {Promise<{ id: string, email: string, provider: string, role: string, createdAt: string }>}
 */
export async function createUser({ email, password, role = DEFAULT_ROLE }) {
  if (!email || typeof email !== 'string') {
    throw new Error('email is required');
  }
  if (!ROLES.includes(role)) {
    throw new Error(`role must be one of: ${ROLES.join(', ')}`);
  }
  const normalizedEmail = email.toLowerCase().trim();
  if (_users.has(normalizedEmail)) {
    throw new Error('Email already registered');
  }
  const passwordHash = await hashPassword(password);
  const user = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    passwordHash,
    provider: 'local',
    role,
    createdAt: new Date().toISOString(),
  };
  _users.set(normalizedEmail, user);
  return _publicUser(user);
}

/**
 * Look up a user by email.  Returns null when not found.
 * @param {string} email
 * @returns {{ id: string, email: string, provider: string, createdAt: string, passwordHash: string } | null}
 */
export function findUserByEmail(email) {
  if (!email) return null;
  return _users.get(email.toLowerCase().trim()) ?? null;
}

/**
 * Find or create an OAuth user (upsert).
 *
 * On first login the user is created with passwordHash = null.
 * On subsequent logins the existing record is returned unchanged.
 *
 * @param {{ email: string, provider: 'google' | 'github', providerUserId: string, role?: 'viewer'|'editor'|'admin' }} opts
 * @returns {{ id: string, email: string, provider: string, role: string, createdAt: string }}
 */
export function upsertOAuthUser({ email, provider, providerUserId, role = DEFAULT_ROLE }) {
  if (!email || typeof email !== 'string') {
    throw new Error('email is required for OAuth user upsert');
  }
  if (!provider) throw new Error('provider is required');
  if (!providerUserId) throw new Error('providerUserId is required');
  if (!ROLES.includes(role)) {
    throw new Error(`role must be one of: ${ROLES.join(', ')}`);
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = _users.get(normalizedEmail);
  if (existing) {
    return _publicUser(existing);
  }
  const user = {
    id:           crypto.randomUUID(),
    email:        normalizedEmail,
    passwordHash: null,
    provider,
    providerUserId,
    role,
    createdAt:    new Date().toISOString(),
  };
  _users.set(normalizedEmail, user);
  return _publicUser(user);
}

/**
 * Promote or demote a user's role.
 * @param {string} userId
 * @param {'viewer'|'editor'|'admin'} newRole
 * @returns {{ id: string, email: string, provider: string, role: string, createdAt: string }}
 * @throws when userId is not found or role is invalid
 */
export function setUserRole(userId, newRole) {
  if (!ROLES.includes(newRole)) {
    throw new Error(`role must be one of: ${ROLES.join(', ')}`);
  }
  for (const [key, user] of _users) {
    if (user.id === userId) {
      const updated = { ...user, role: newRole };
      _users.set(key, updated);
      return _publicUser(updated);
    }
  }
  throw new Error(`User not found: ${userId}`);
}

/**
 * Clear all users — for test isolation only.
 */
export function _resetStore() {
  _users.clear();
}

// Strip the password hash from public-facing user objects.
function _publicUser(user) {
  const { passwordHash, ...rest } = user; // eslint-disable-line no-unused-vars
  return rest;
}
