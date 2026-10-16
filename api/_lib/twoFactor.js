/**
 * twoFactor.js — TOTP-based two-factor authentication helpers.
 *
 * Implements TOTP (RFC 6238) on top of HOTP (RFC 4226) using Node.js
 * built-in `node:crypto`.  No third-party packages required.
 *
 * Exported surface:
 *   generateTotpSecret()                         → base32 secret string
 *   getTotpUri(secret, accountName, issuer)       → otpauth:// URI
 *   generateTotp(secret, opts)                    → 6-digit OTP string
 *   verifyTotp(secret, token, opts)               → boolean
 *   setupTwoFactor(userId)                        → { secret, uri }
 *   enableTwoFactor(userId, token, opts)          → updated user record
 *   disableTwoFactor(userId)                      → updated user record
 */

import { createHmac, randomBytes } from 'node:crypto';
import { getUser, updateUser } from './account.js';

// ── Constants ────────────────────────────────────────────────────────────────

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Seconds per TOTP time step (RFC 6238 default). */
const TOTP_STEP_SECONDS = 30;

/** Number of OTP digits. */
const TOTP_DIGITS = 6;

/**
 * Number of steps to allow on either side of the current step.
 * Window of 1 tolerates ±30 s of clock skew.
 */
const DEFAULT_WINDOW = 1;

/** Number of random bytes used to generate a secret (20 → 32 base32 chars). */
const SECRET_BYTE_LENGTH = 20;

// ── Base32 helpers ────────────────────────────────────────────────────────────

/**
 * Encode a Buffer (or Uint8Array) as a base32 string (RFC 4648, no padding).
 *
 * @param {Buffer} buffer
 * @returns {string}
 */
export function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }
  return output;
}

/**
 * Decode a base32 string (RFC 4648) to a Buffer.
 * Accepts upper- and lower-case input; strips trailing '=' padding.
 *
 * @param {string} str
 * @returns {Buffer}
 * @throws {Error} on invalid characters.
 */
export function base32Decode(str) {
  const clean = str.toUpperCase().replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  const output = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) {
      throw new Error(`base32Decode: invalid character "${clean[i]}"`);
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

// ── HOTP / TOTP core ──────────────────────────────────────────────────────────

/**
 * Generate an HOTP value (RFC 4226).
 *
 * @param {string} secretBase32  - Base32-encoded shared secret.
 * @param {number} counter       - 32-bit non-negative integer counter.
 * @returns {string}  Zero-padded TOTP_DIGITS-digit OTP.
 */
export function hotp(secretBase32, counter) {
  const secretBuffer = base32Decode(secretBase32);

  // Encode counter as a big-endian 8-byte buffer.
  // Counters for TOTP fit comfortably in 32 bits for many years.
  const counterBuffer = Buffer.alloc(8, 0);
  const hi = Math.floor(counter / 0x100000000);
  const lo = counter >>> 0; // unsigned 32-bit
  counterBuffer.writeUInt32BE(hi, 0);
  counterBuffer.writeUInt32BE(lo, 4);

  const hmac = createHmac('sha1', secretBuffer);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  // Dynamic truncation (RFC 4226 §5.3).
  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(code % Math.pow(10, TOTP_DIGITS)).padStart(TOTP_DIGITS, '0');
}

/**
 * Generate a TOTP value (RFC 6238).
 *
 * @param {string} secretBase32  - Base32-encoded shared secret.
 * @param {{ now?: number }} [opts]
 *   `now` — Unix epoch in **milliseconds** (defaults to `Date.now()`).
 *           Pass a fixed value in tests for deterministic output.
 * @returns {string}  Current 6-digit OTP.
 */
export function generateTotp(secretBase32, { now = Date.now() } = {}) {
  const step = Math.floor(now / 1000 / TOTP_STEP_SECONDS);
  return hotp(secretBase32, step);
}

/**
 * Verify a TOTP token within a ±`window` step tolerance.
 *
 * @param {string} secretBase32  - Base32-encoded shared secret.
 * @param {string} token         - 6-digit string entered by the user.
 * @param {{ window?: number, now?: number }} [opts]
 * @returns {boolean}
 */
export function verifyTotp(secretBase32, token, { window = DEFAULT_WINDOW, now = Date.now() } = {}) {
  if (typeof token !== 'string' || token.length !== TOTP_DIGITS) return false;
  const currentStep = Math.floor(now / 1000 / TOTP_STEP_SECONDS);
  for (let delta = -window; delta <= window; delta++) {
    if (hotp(secretBase32, currentStep + delta) === token) return true;
  }
  return false;
}

// ── High-level helpers ────────────────────────────────────────────────────────

/**
 * Generate a cryptographically random base32 TOTP secret.
 *
 * @returns {string}  20-byte secret encoded as base32 (32 characters).
 */
export function generateTotpSecret() {
  return base32Encode(randomBytes(SECRET_BYTE_LENGTH));
}

/**
 * Build the `otpauth://totp/…` URI that TOTP apps (Google Authenticator,
 * Authy, etc.) consume when scanning a QR code.
 *
 * @param {string} secret       - Base32 secret.
 * @param {string} accountName  - User identifier shown in the app (e.g. email).
 * @param {string} [issuer='Wander']  - Service name shown in the app.
 * @returns {string}  otpauth URI.
 */
export function getTotpUri(secret, accountName, issuer = 'Wander') {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  return (
    `otpauth://totp/${label}` +
    `?secret=${secret}` +
    `&issuer=${encodeURIComponent(issuer)}` +
    `&algorithm=SHA1` +
    `&digits=${TOTP_DIGITS}` +
    `&period=${TOTP_STEP_SECONDS}`
  );
}

/**
 * Begin the 2FA setup flow for a user.
 *
 * Generates a fresh secret and QR-code URI.  The secret is **not** yet
 * persisted to the user record — call `enableTwoFactor()` after the user
 * has verified the code.
 *
 * @param {string} userId
 * @returns {{ secret: string, uri: string }}
 * @throws {Error}  If the user is not found.
 */
export function setupTwoFactor(userId) {
  const user = getUser(userId);
  if (!user) throw new Error(`setupTwoFactor: user "${userId}" not found`);
  const secret = generateTotpSecret();
  const uri = getTotpUri(secret, user.email || userId);
  return { secret, uri };
}

/**
 * Enable 2FA for a user after verifying that they scanned the QR code correctly.
 *
 * @param {string} userId
 * @param {string} secret    - The secret generated by `setupTwoFactor`.
 * @param {string} token     - The 6-digit code from the user's TOTP app.
 * @param {{ now?: number }} [opts]  - Pass `now` in tests for determinism.
 * @returns {object}  The updated user record.
 * @throws {Error}  If the token does not verify, or the user is not found.
 */
export function enableTwoFactor(userId, secret, token, { now = Date.now() } = {}) {
  const user = getUser(userId);
  if (!user) throw new Error(`enableTwoFactor: user "${userId}" not found`);
  if (!verifyTotp(secret, token, { now })) {
    throw new Error('enableTwoFactor: invalid or expired TOTP token');
  }
  return updateUser(userId, { twoFactorEnabled: true, twoFactorSecret: secret });
}

/**
 * Disable 2FA for a user and clear the stored secret.
 *
 * @param {string} userId
 * @returns {object}  The updated user record.
 * @throws {Error}  If the user is not found or 2FA is already disabled.
 */
export function disableTwoFactor(userId) {
  const user = getUser(userId);
  if (!user) throw new Error(`disableTwoFactor: user "${userId}" not found`);
  if (!user.twoFactorEnabled) {
    throw new Error(`disableTwoFactor: user "${userId}" does not have 2FA enabled`);
  }
  return updateUser(userId, { twoFactorEnabled: false, twoFactorSecret: null });
}
