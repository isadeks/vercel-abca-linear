/**
 * password.js — Password-change business logic.
 *
 * Provides `changePassword`, the single entry-point for the
 * POST /api/account/password endpoint.  All persistence is delegated
 * to the shared account store via `getUser` / `updateUser`.
 *
 * Security notes
 * ──────────────
 * In this in-memory prototype the "hash" is stored as-is.  A production
 * implementation would replace the equality check with `bcrypt.compare`
 * and the assignment with `bcrypt.hash`.  The contract exposed to callers
 * is identical either way.
 */

import { getUser, updateUser } from './account.js';

/** Minimum acceptable length for a new password. */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Attempt to change a user's password.
 *
 * @param {string} userId          - The user whose password should change.
 * @param {string} currentPassword - The password the user claims to have now.
 * @param {string} newPassword     - The desired replacement password.
 * @param {string} confirmPassword - Must equal `newPassword` exactly.
 *
 * @returns {{ ok: true }}
 *   On success — callers should treat the resolved value as an opaque success
 *   signal; do not rely on additional fields.
 *
 * @throws {Error}  With a `code` property set to one of the exported error
 *   codes below so callers can map errors to HTTP statuses / UI messages.
 */
export function changePassword(userId, currentPassword, newPassword, confirmPassword) {
  // ── 1. Load user ──────────────────────────────────────────────────────────
  const user = getUser(userId);
  if (!user) {
    throw Object.assign(new Error('User not found.'), { code: 'USER_NOT_FOUND' });
  }

  // ── 2. Verify current password ────────────────────────────────────────────
  // In production: await bcrypt.compare(currentPassword, user.passwordHash)
  if (currentPassword !== user.passwordHash) {
    throw Object.assign(
      new Error('Current password is incorrect.'),
      { code: 'WRONG_CURRENT_PASSWORD' },
    );
  }

  // ── 3. Confirm passwords match ────────────────────────────────────────────
  if (newPassword !== confirmPassword) {
    throw Object.assign(
      new Error('New password and confirmation do not match.'),
      { code: 'PASSWORD_MISMATCH' },
    );
  }

  // ── 4. Enforce minimum strength ───────────────────────────────────────────
  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    throw Object.assign(
      new Error(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`),
      { code: 'PASSWORD_TOO_SHORT' },
    );
  }

  // ── 5. Persist the new password ───────────────────────────────────────────
  // In production: newHash = await bcrypt.hash(newPassword, 12)
  updateUser(userId, { passwordHash: newPassword });

  return { ok: true };
}
