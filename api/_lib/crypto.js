// Password hashing + token generation for the auth layer.
//
// Framework-free ES module. Uses Node's built-in `crypto` (scrypt) so there is
// no third-party dependency — passwords are never stored in plaintext, and the
// stored value embeds its own random salt so every hash is unique.
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

const KEY_LEN = 64;

// Hash a plaintext password. Returns "salt:hash" (both hex). The salt is random
// per call, so two identical passwords produce different stored values.
export function hashPassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('password must be a non-empty string');
  }
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEY_LEN).toString('hex');
  return `${salt}:${hash}`;
}

// Verify a plaintext password against a stored "salt:hash" value. Uses a
// constant-time comparison to avoid leaking timing information.
export function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, KEY_LEN);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

// Generate a cryptographically-random, URL-safe token (used for session ids).
export function generateToken(bytes = 32) {
  return randomBytes(bytes).toString('hex');
}

// Normalize an email for storage/lookup: trim + lowercase.
export function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

// Minimal RFC-5322-ish email sanity check — good enough to reject obvious junk
// without pretending to be a full validator.
export function isValidEmail(email) {
  const e = normalizeEmail(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}
