/**
 * users.js — In-memory user store with PBKDF2 password hashing.
 *
 * For this self-contained auth implementation there is no external database.
 * Data lives in module-level memory; a real deployment would swap this out
 * for a persistent store (e.g. PlanetScale, Vercel Postgres) without changing
 * the API surface.
 *
 * Passwords are hashed with Node's built-in `crypto.pbkdf2Sync` — no extra
 * dependencies.
 */

import { randomBytes, pbkdf2Sync } from 'crypto';

const HASH_ITERS = 100_000;
const HASH_LEN = 32;
const HASH_DIGEST = 'sha256';

// ── Internal store ─────────────────────────────────────────────────────────
// Map<email, { email, displayName, passwordHash, salt, createdAt }>
const users = new Map();

// ── Password helpers ───────────────────────────────────────────────────────

/**
 * Hash a plaintext password.  Returns a storable `"salt$hash"` string.
 * @param {string} plaintext
 * @returns {string}
 */
export function hashPassword(plaintext) {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(plaintext, salt, HASH_ITERS, HASH_LEN, HASH_DIGEST).toString('hex');
  return `${salt}$${hash}`;
}

/**
 * Verify a plaintext password against a stored hash string.
 * @param {string} plaintext
 * @param {string} stored   Format: "salt$hash"
 * @returns {boolean}
 */
export function verifyPassword(plaintext, stored) {
  const [salt, expected] = stored.split('$');
  if (!salt || !expected) return false;
  const actual = pbkdf2Sync(plaintext, salt, HASH_ITERS, HASH_LEN, HASH_DIGEST).toString('hex');
  return actual === expected;
}

// ── Validation ─────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate email + password inputs.
 * Returns an array of error strings (empty = valid).
 * @param {string} email
 * @param {string} password
 * @param {{ confirmPassword?: string, displayName?: string }} [extra]
 * @returns {string[]}
 */
export function validateAuthInputs(email, password, extra = {}) {
  const errors = [];

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    errors.push('A valid email address is required.');
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required.');
  } else {
    if (password.length < 8) errors.push('Password must be at least 8 characters.');
    if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter.');
    if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number.');
  }

  if (extra.confirmPassword !== undefined && extra.confirmPassword !== password) {
    errors.push('Passwords do not match.');
  }

  if (extra.displayName !== undefined) {
    const name = String(extra.displayName ?? '').trim();
    if (!name || name.length < 2) errors.push('Display name must be at least 2 characters.');
  }

  return errors;
}

// ── CRUD ───────────────────────────────────────────────────────────────────

/**
 * Create a new user.
 * @param {{ email: string, password: string, displayName: string }} opts
 * @returns {{ ok: true, user: object } | { ok: false, errors: string[] }}
 */
export function createUser({ email, password, displayName }) {
  const cleanEmail = (email ?? '').trim().toLowerCase();
  const validationErrors = validateAuthInputs(cleanEmail, password, { displayName });
  if (validationErrors.length) return { ok: false, errors: validationErrors };

  if (users.has(cleanEmail)) {
    return { ok: false, errors: ['An account with that email already exists.'] };
  }

  const user = {
    email: cleanEmail,
    displayName: String(displayName).trim(),
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  users.set(cleanEmail, user);

  return { ok: true, user: publicUser(user) };
}

/**
 * Look up a user by email and verify their password.
 * @param {{ email: string, password: string }} opts
 * @returns {{ ok: true, user: object } | { ok: false, errors: string[] }}
 */
export function authenticateUser({ email, password }) {
  const cleanEmail = (email ?? '').trim().toLowerCase();
  const user = users.get(cleanEmail);

  // Intentionally vague error message to avoid user enumeration
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { ok: false, errors: ['Invalid email or password.'] };
  }

  return { ok: true, user: publicUser(user) };
}

/**
 * Find a user by email (no password check).
 * @param {string} email
 * @returns {object|null}
 */
export function findUserByEmail(email) {
  const user = users.get((email ?? '').trim().toLowerCase());
  return user ? publicUser(user) : null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Strip the password hash before returning user data to callers. */
function publicUser({ email, displayName, createdAt }) {
  return { email, displayName, createdAt };
}

/**
 * Remove all users — used by tests to reset state between runs.
 */
export function _resetUsersForTesting() {
  users.clear();
}
