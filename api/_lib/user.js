/**
 * User model helpers — password hashing and user schema definition.
 *
 * The in-memory store is intentionally simple: real deployments swap it out
 * for a database.  The interface (createUser / findUserByEmail / verifyPassword)
 * remains stable so callers don't need to change.
 */
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * User schema shape:
 * {
 *   id:           string   — UUID
 *   email:        string   — unique, lower-cased
 *   passwordHash: string   — bcrypt hash (null when provider != 'local')
 *   provider:     'local' | 'google' | 'github'
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
 * @param {{ email: string, password: string }} opts
 * @returns {Promise<{ id: string, email: string, provider: string, createdAt: string }>}
 */
export async function createUser({ email, password }) {
  if (!email || typeof email !== 'string') {
    throw new Error('email is required');
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
 * Update the password hash for an existing user.
 * @param {string} email
 * @param {string} newPassword  Plain-text password; will be hashed internally.
 * @returns {Promise<void>}
 * @throws when the user is not found or the password is invalid.
 */
export async function updateUserPassword(email, newPassword) {
  if (!email) throw new Error('email is required');
  const normalizedEmail = email.toLowerCase().trim();
  const user = _users.get(normalizedEmail);
  if (!user) throw new Error('User not found');
  user.passwordHash = await hashPassword(newPassword);
  _users.set(normalizedEmail, user);
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
