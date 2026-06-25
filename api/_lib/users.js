/**
 * users.js — In-memory User model with seed data.
 *
 * Schema:
 *   { id: string, email: string, passwordHash: string, role: 'admin' | 'user' }
 *
 * In a real deployment this would be backed by a database. For now an in-memory
 * store is sufficient — the structure matches what a DB layer would expose, so
 * swapping it in later is a one-file change.
 */

import bcrypt from 'bcryptjs';

/** @type {Array<{id: string, email: string, passwordHash: string, role: 'admin'|'user'}>} */
const _users = [];

let _nextId = 1;

/**
 * Seed two users (one admin, one regular) so tests and manual QA have
 * pre-existing accounts. Passwords are hashed synchronously at module load
 * with a low bcrypt cost factor (4) so start-up is fast in tests.
 */
function _seed() {
  const SALT_ROUNDS = 4; // low cost for seed data only
  _users.push({
    id: String(_nextId++),
    email: 'admin@wander.test',
    passwordHash: bcrypt.hashSync('admin-pass-1', SALT_ROUNDS),
    role: 'admin',
  });
  _users.push({
    id: String(_nextId++),
    email: 'user@wander.test',
    passwordHash: bcrypt.hashSync('user-pass-1', SALT_ROUNDS),
    role: 'user',
  });
}

_seed();

/**
 * Find a user by e-mail address (case-insensitive).
 * @param {string} email
 * @returns {{ id: string, email: string, passwordHash: string, role: string } | undefined}
 */
export function findByEmail(email) {
  return _users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

/**
 * Find a user by id.
 * @param {string} id
 * @returns {{ id: string, email: string, passwordHash: string, role: string } | undefined}
 */
export function findById(id) {
  return _users.find(u => u.id === id);
}

/**
 * Create a new user. Throws if the e-mail is already registered.
 * @param {{ email: string, passwordHash: string, role?: 'admin'|'user' }} params
 * @returns {{ id: string, email: string, role: string }}
 */
export function createUser({ email, passwordHash, role = 'user' }) {
  if (findByEmail(email)) {
    throw new Error(`Email already registered: ${email}`);
  }
  const user = {
    id: String(_nextId++),
    email: email.toLowerCase().trim(),
    passwordHash,
    role,
  };
  _users.push(user);
  return { id: user.id, email: user.email, role: user.role };
}

/**
 * Return a safe public view (no passwordHash) for all users.
 * Useful for admin endpoints / tests.
 */
export function listUsers() {
  return _users.map(({ id, email, role }) => ({ id, email, role }));
}

/**
 * Reset the store back to seed state — for use in tests only.
 */
export function _resetForTests() {
  _users.length = 0;
  _nextId = 1;
  _seed();
}
