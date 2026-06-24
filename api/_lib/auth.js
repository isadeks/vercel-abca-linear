/**
 * auth.js — Authentication helpers (JWT + password hashing).
 *
 * No external dependencies; uses Node's built-in `crypto` module only.
 * Import from serverless handlers and unit tests alike.
 */

import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const JWT_EXPIRY_SECS = 60 * 60 * 24 * 7; // 7 days

// Allow tests to lower cost factor via env var (SCRYPT_N=1024 npm test)
const SCRYPT_N = process.env.SCRYPT_N ? Number(process.env.SCRYPT_N) : 16384;
const SCRYPT_KEYLEN = 32;

// ── Internal helpers ──────────────────────────────────────────────────────────

function b64url(str) {
  return Buffer.from(str).toString('base64url');
}

function b64urlParse(str) {
  return JSON.parse(Buffer.from(str, 'base64url').toString('utf8'));
}

// ── JWT (HS256) ───────────────────────────────────────────────────────────────

/**
 * Issue a signed HS256 JWT.
 * @param {Record<string, unknown>} payload  Custom claims (sub, email, …).
 * @returns {string} Compact JWT string.
 */
export function generateToken(payload) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY_SECS,
    }),
  );
  const sig = createHmac('sha256', JWT_SECRET)
    .update(`${header}.${claims}`)
    .digest('base64url');
  return `${header}.${claims}.${sig}`;
}

/**
 * Verify a JWT and return its payload.
 * @param {string} token
 * @returns {Record<string, unknown>} Decoded payload.
 * @throws {Error} If signature is invalid or token is expired.
 */
export function verifyToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');

  const [header, claims, sig] = parts;

  const expected = createHmac('sha256', JWT_SECRET)
    .update(`${header}.${claims}`)
    .digest('base64url');

  // Timing-safe comparison — both buffers must be same length.
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw new Error('Invalid token signature');
  }

  const payload = b64urlParse(claims);
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }
  return payload;
}

// ── Password hashing (scrypt) ─────────────────────────────────────────────────

/**
 * Hash a plaintext password.
 * @param {string} password
 * @returns {string} `salt:hash` hex string suitable for storage.
 */
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: 8,
    p: 1,
  }).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a plaintext password against a stored hash.
 * @param {string} password   Plaintext candidate.
 * @param {string} stored     `salt:hash` string produced by hashPassword().
 * @returns {boolean}
 */
export function verifyPassword(password, stored) {
  const colonIdx = stored.indexOf(':');
  const salt = stored.slice(0, colonIdx);
  const hashHex = stored.slice(colonIdx + 1);

  const candidate = scryptSync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: 8,
    p: 1,
  });
  const storedBuf = Buffer.from(hashHex, 'hex');

  if (candidate.length !== storedBuf.length) return false;
  return timingSafeEqual(candidate, storedBuf);
}
