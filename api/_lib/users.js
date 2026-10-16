/**
 * users.js — In-memory user store for the Wander auth system.
 *
 * In a production deployment this would be backed by a database (e.g. Vercel
 * Postgres / Upstash Redis). The in-memory map is fine for demo/staging:
 * Vercel serverless functions are stateless per-invocation, so this store
 * provides a clean, zero-dep interface that's easy to swap out later.
 *
 * The module exports a plain object whose methods mirror a real DB layer so
 * the handlers above it stay database-agnostic.
 */

/** @type {Map<string, {id:string, email:string, name:string, passwordHash:string, createdAt:string}>} */
const _store = new Map();
let _idSeq = 1;

function nextId() {
  return String(_idSeq++);
}

export const users = {
  /**
   * Create a new user record.
   * @param {{ email:string, name:string, passwordHash:string }} fields
   * @returns {{ id:string, email:string, name:string, createdAt:string }}
   */
  create({ email, name, passwordHash }) {
    const id = nextId();
    const record = {
      id,
      email: email.toLowerCase().trim(),
      name: name.trim(),
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    _store.set(record.email, record);
    return _publicFields(record);
  },

  /**
   * Find a user by email (case-insensitive).
   * @param {string} email
   * @returns {{ id:string, email:string, name:string, passwordHash:string, createdAt:string } | undefined}
   */
  findByEmail(email) {
    return _store.get(email.toLowerCase().trim());
  },

  /**
   * Find a user by their numeric id.
   * @param {string} id
   * @returns {{ id:string, email:string, name:string, createdAt:string } | undefined}
   */
  findById(id) {
    for (const record of _store.values()) {
      if (record.id === id) return _publicFields(record);
    }
    return undefined;
  },

  /**
   * Check if an email address is already registered.
   * @param {string} email
   * @returns {boolean}
   */
  exists(email) {
    return _store.has(email.toLowerCase().trim());
  },

  /** @internal used by tests to reset state between test cases */
  _reset() {
    _store.clear();
    _idSeq = 1;
  },
};

function _publicFields({ id, email, name, createdAt }) {
  return { id, email, name, createdAt };
}
