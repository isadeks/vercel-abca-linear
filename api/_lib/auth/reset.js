// Password-reset flow: token issuance and redemption.
// Tokens are stored in-memory (replace with DB in production).
import { generateResetToken } from './password.js';

/** @type {Map<string, { userId: string, expiresAt: number }>} */
const _resetTokens = new Map();

const RESET_TOKEN_TTL = 60 * 60; // 1 hour in seconds

/**
 * Generate and store a password-reset token for the given userId.
 * @param {string} userId
 * @returns {string} The opaque reset token (send to user via email)
 */
export function createResetToken(userId) {
  const token = generateResetToken();
  const expiresAt = Math.floor(Date.now() / 1000) + RESET_TOKEN_TTL;
  _resetTokens.set(token, { userId, expiresAt });
  return token;
}

/**
 * Redeem a reset token — validates it and returns the userId.
 * Invalidates (single-use) the token on success.
 * @param {string} token
 * @returns {string} userId
 */
export function redeemResetToken(token) {
  const entry = _resetTokens.get(token);
  if (!entry) throw new Error('Invalid or already-used reset token');

  const now = Math.floor(Date.now() / 1000);
  if (entry.expiresAt < now) {
    _resetTokens.delete(token);
    throw new Error('Reset token has expired');
  }

  _resetTokens.delete(token);
  return entry.userId;
}

/** Clear all reset tokens — for tests only. */
export function _clearResetTokens() {
  _resetTokens.clear();
}
