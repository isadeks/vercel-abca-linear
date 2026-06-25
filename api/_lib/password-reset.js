// Password-reset flow module.
//
// Implements:
//   1. forgotPassword(email, opts) — looks up user by email, creates a
//      time-limited signed reset token, persists the token record, and
//      returns the token + a mock "send email" side-effect.
//   2. resetPassword(token, newPassword, opts) — validates the reset token,
//      enforces single-use semantics, hashes the new password, and updates
//      the user record.
//
// Pluggable adapters (injected via setUserAdapter / setResetTokenAdapter)
// allow tests to provide in-memory stores without hitting a real database.
//
// Password hashing uses PBKDF2-SHA256 via Node.js built-in `crypto`.  The
// format is:  pbkdf2:<iterations>:<salt_hex>:<digest>
// (same scheme used in the earlier auth module on this repo).

import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import { createPasswordResetToken, verifyPasswordResetToken } from './auth.js';

// ── Adapter registry ──────────────────────────────────────────────────────────

let _userAdapter = null;
let _resetTokenAdapter = null;

/**
 * Register a user database adapter.
 * @param {{ createUser, findUserByEmail, findUserById, updateUser }} adapter
 */
export function setUserAdapter(adapter) {
  _userAdapter = adapter;
}

/**
 * Register a password-reset token adapter.
 * @param {{ createResetToken, findResetToken, markResetTokenUsed }} adapter
 */
export function setResetTokenAdapter(adapter) {
  _resetTokenAdapter = adapter;
}

function userAdapter() {
  if (!_userAdapter) {
    throw new Error(
      'No user adapter configured. Call setUserAdapter() before using password-reset helpers.',
    );
  }
  return _userAdapter;
}

function resetTokenAdapter() {
  if (!_resetTokenAdapter) {
    throw new Error(
      'No reset-token adapter configured. Call setResetTokenAdapter() before using password-reset helpers.',
    );
  }
  return _resetTokenAdapter;
}

// ── Password hashing ──────────────────────────────────────────────────────────

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEYLEN = 32; // bytes → 64 hex chars
const PBKDF2_DIGEST = 'sha256';

/**
 * Hash a plaintext password.
 * @param {string} password
 * @returns {string}  opaque hash string safe to store
 */
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const dk = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST);
  return `pbkdf2:${PBKDF2_ITERATIONS}:${salt}:${dk.toString('hex')}`;
}

/**
 * Verify a plaintext password against a stored hash.
 * @param {string} password
 * @param {string} storedHash
 * @returns {boolean}
 */
export function verifyPassword(password, storedHash) {
  const parts = storedHash.split(':');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
    throw new Error('Invalid hash format');
  }
  const [, iterations, salt, expected] = parts;
  const dk = pbkdf2Sync(
    password,
    salt,
    parseInt(iterations, 10),
    PBKDF2_KEYLEN,
    PBKDF2_DIGEST,
  );
  // Timing-safe comparison via Buffer.from + crypto.timingSafeEqual
  const actual = dk.toString('hex');
  // Use fixed-length SHA-256 digests for timing-safe comparison regardless
  // of whether the hex strings happen to differ in length.
  const aDig = createHash('sha256').update(actual).digest();
  const eDig = createHash('sha256').update(expected).digest();
  return timingSafeEqual(aDig, eDig);
}

// ── Transactional email stub ──────────────────────────────────────────────────

/**
 * Send (or stub) a password-reset email.
 * In production, swap this with a real email provider (Resend, SendGrid, etc.).
 * Returns a structured object so tests can inspect the "sent" message.
 *
 * @param {string} to       recipient email address
 * @param {string} resetUrl full URL the user visits to reset their password
 * @returns {{ to: string, subject: string, resetUrl: string, sentAt: number }}
 */
export function sendPasswordResetEmail(to, resetUrl) {
  const message = {
    to,
    subject: 'Reset your Wander password',
    resetUrl,
    sentAt: Math.floor(Date.now() / 1000),
  };
  // In a real implementation, call your email provider here.
  // e.g.  await resend.emails.send({ from: 'noreply@...', to, subject, html });
  return message;
}

// ── Core flow ─────────────────────────────────────────────────────────────────

/**
 * Initiate a password-reset request.
 *
 * If the email is not found we still return success to avoid user enumeration.
 *
 * @param {string} email
 * @param {{
 *   secret: string,
 *   baseUrl?: string,
 *   tokenTTL?: number,
 * }} opts
 * @returns {Promise<{
 *   success: true,
 *   email?: { to, subject, resetUrl, sentAt },
 * }>}
 */
export async function forgotPassword(email, opts) {
  const { secret, baseUrl = 'http://localhost:3000', tokenTTL = 3600 } = opts;

  const user = await userAdapter().findUserByEmail(email);

  if (!user) {
    // Return generic success — do NOT disclose whether the email exists.
    return { success: true };
  }

  const token = createPasswordResetToken(user.id, secret, tokenTTL);

  // Decode jti from token so we can persist it for single-use enforcement.
  const [, bodyB64] = token.split('.');
  const payload = JSON.parse(Buffer.from(bodyB64, 'base64url').toString('utf8'));

  await resetTokenAdapter().createResetToken({
    jti: payload.jti,
    userId: user.id,
    expiresAt: payload.exp,
    usedAt: null,
  });

  const resetUrl = `${baseUrl}/reset-password.html?token=${token}`;
  const emailResult = sendPasswordResetEmail(email, resetUrl);

  return { success: true, email: emailResult };
}

/**
 * Complete a password-reset request.
 *
 * @param {string} token       the reset token from the URL
 * @param {string} newPassword the user's desired new password
 * @param {{
 *   secret: string,
 * }} opts
 * @returns {Promise<{ success: true }>}
 */
export async function resetPassword(token, newPassword, opts) {
  const { secret } = opts;

  // 1. Verify signature + expiry
  const payload = verifyPasswordResetToken(token, secret);

  const { sub: userId, jti } = payload;

  // 2. Single-use check — look up the stored token record
  const tokenRecord = await resetTokenAdapter().findResetToken(jti);
  if (!tokenRecord) {
    throw new Error('Reset token not found or already invalidated');
  }
  if (tokenRecord.usedAt !== null) {
    throw new Error('Reset token has already been used');
  }

  // 3. Validate the user still exists
  const user = await userAdapter().findUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // 4. Hash the new password
  const passwordHash = hashPassword(newPassword);

  // 5. Persist new password hash
  await userAdapter().updateUser(userId, { passwordHash });

  // 6. Mark the token as used (single-use enforcement)
  await resetTokenAdapter().markResetTokenUsed(jti);

  return { success: true };
}
