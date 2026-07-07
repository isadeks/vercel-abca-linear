/**
 * accountDeletion.js — Safe account-deletion flow with confirmation.
 *
 * Deleting an account is irreversible (soft-deletes the record and nulls
 * sensitive fields).  Callers must supply one of two proofs of intent:
 *
 *   1. `password`  — the user's current password (compared against
 *                    `passwordHash` via `verifyPassword()`).
 *   2. `phrase`    — an exact typed confirmation phrase (see
 *                    REQUIRED_PHRASE below).
 *
 * If neither check passes the request is rejected before any data is
 * touched.  This module is framework-free and holds no HTTP knowledge.
 *
 * Exported surface:
 *   REQUIRED_PHRASE                         → confirmation string constant
 *   verifyPassword(plaintext, hash)         → boolean
 *   requestAccountDeletion(userId, proof)   → deleted user record
 */

import { getUser, updateUser, deleteUser } from './account.js';

// ── Constants ────────────────────────────────────────────────────────────────

/**
 * The exact phrase a user must type (case-sensitive) to confirm deletion
 * when they choose the phrase-based confirmation flow.
 */
export const REQUIRED_PHRASE = 'delete my account';

// ── Password verification ────────────────────────────────────────────────────

/**
 * Verify a plaintext password against a stored hash.
 *
 * In this implementation the "hash" is the literal password string prefixed
 * with `$plain$` (a test-only convention that keeps the module dependency-free).
 * A production system would replace this with bcrypt/argon2 comparison.
 *
 * Supported hash formats:
 *   `$plain$<password>`   — plaintext password stored with a test prefix.
 *   `$argon2id$…`         — treated as "unsupported format" → always false
 *                           (caller must use the real argon2 library).
 *
 * @param {string} plaintext  - The password the user submitted.
 * @param {string} hash       - The stored passwordHash value.
 * @returns {boolean}
 */
export function verifyPassword(plaintext, hash) {
  if (typeof plaintext !== 'string' || typeof hash !== 'string') return false;
  if (!hash.startsWith('$plain$')) return false;
  return hash.slice(7) === plaintext;
}

// ── Deletion flow ─────────────────────────────────────────────────────────────

/**
 * Attempt to delete the account identified by `userId`.
 *
 * Exactly one of `proof.password` or `proof.phrase` must be supplied.
 *
 * @param {string} userId
 * @param {{ password?: string, phrase?: string }} proof
 *   - `password`  The user's current password (compared against passwordHash).
 *   - `phrase`    The typed confirmation phrase (must equal REQUIRED_PHRASE).
 * @returns {object}  The soft-deleted user record.
 * @throws {Error}  On any of:
 *   - user not found
 *   - neither password nor phrase supplied
 *   - password provided but incorrect
 *   - phrase provided but does not match REQUIRED_PHRASE
 */
export function requestAccountDeletion(userId, { password, phrase } = {}) {
  // 1. Existence check.
  const user = getUser(userId);
  if (!user) throw new Error(`requestAccountDeletion: user "${userId}" not found`);

  // 2. Confirmation check — at least one proof must be present.
  if (password === undefined && phrase === undefined) {
    throw new Error(
      'requestAccountDeletion: confirmation required — supply password or confirmation phrase',
    );
  }

  // 3. Validate whichever proof was supplied.
  if (password !== undefined) {
    if (!verifyPassword(password, user.passwordHash)) {
      throw new Error('requestAccountDeletion: incorrect password');
    }
  } else {
    // phrase path
    if (phrase !== REQUIRED_PHRASE) {
      throw new Error(
        `requestAccountDeletion: confirmation phrase must be exactly "${REQUIRED_PHRASE}"`,
      );
    }
  }

  // 4. Scrub sensitive fields before soft-deleting.
  //    updateUser blocks overwriting `deleted`, so we clear the security fields
  //    first, then call deleteUser to set deleted: true.
  updateUser(userId, {
    passwordHash: '',
    twoFactorEnabled: false,
    twoFactorSecret: null,
  });

  // 5. Soft-delete.
  return deleteUser(userId);
}
