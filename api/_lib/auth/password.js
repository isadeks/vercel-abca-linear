// Password hashing (scrypt) and reset-token generation.
// Uses Node.js built-in `crypto` — no external dependencies.
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;

/**
 * Hash a plaintext password.
 * Returns a "{salt}:{hash}" string safe to store.
 * @param {string} plaintext
 * @returns {string}
 */
export function hashPassword(plaintext) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plaintext, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return `${salt}:${hash.toString('hex')}`;
}

/**
 * Verify a plaintext password against a stored hash.
 * @param {string} plaintext
 * @param {string} stored   - "{salt}:{hash}" as produced by hashPassword()
 * @returns {boolean}
 */
export function verifyPassword(plaintext, stored) {
  const colonIdx = stored.indexOf(':');
  if (colonIdx === -1) return false;
  const salt = stored.slice(0, colonIdx);
  const hashHex = stored.slice(colonIdx + 1);
  const derived = scryptSync(plaintext, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  const storedBuf = Buffer.from(hashHex, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return timingSafeEqual(derived, storedBuf);
}

/**
 * Generate a cryptographically random reset token (hex string).
 * @returns {string}
 */
export function generateResetToken() {
  return randomBytes(32).toString('hex');
}
