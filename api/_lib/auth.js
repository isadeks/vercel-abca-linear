// Authentication for the Wander booking API.
//
// Framework-free ES module (node built-ins only), consistent with the rest of
// `api/_lib/`. Provides two independent concerns:
//
//   1. Password hashing   — hashPassword / verifyPassword (scrypt + per-hash salt)
//   2. Stateless sessions — createToken / verifyToken (HMAC-SHA256 signed tokens)
//
// Stateless HMAC tokens fit the Vercel serverless model: there is no shared
// session store between function invocations, so a signed, self-describing
// token that any invocation can verify with a shared secret is the natural fit.

import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHmac,
} from 'node:crypto';

// --- Password hashing --------------------------------------------------------

const SCRYPT_KEYLEN = 64;
const SALT_BYTES = 16;

/**
 * Hash a plaintext password with scrypt and a fresh random salt.
 * Returns a self-describing string: `scrypt$<saltHex>$<hashHex>`.
 *
 * @param {string} password
 * @returns {string} encoded hash safe to persist
 */
export function hashPassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new TypeError('password must be a non-empty string');
  }
  const salt = randomBytes(SALT_BYTES);
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

/**
 * Verify a plaintext password against a stored hash from hashPassword().
 * Constant-time comparison; returns false for malformed input rather than
 * throwing, so a corrupt stored value can never authenticate.
 *
 * @param {string} password
 * @param {string} stored encoded hash produced by hashPassword()
 * @returns {boolean}
 */
export function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') {
    return false;
  }
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }
  const [, saltHex, hashHex] = parts;
  let expected;
  try {
    expected = Buffer.from(hashHex, 'hex');
  } catch {
    return false;
  }
  if (expected.length !== SCRYPT_KEYLEN) {
    return false;
  }
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), SCRYPT_KEYLEN);
  return timingSafeEqual(actual, expected);
}

// --- Stateless session tokens ------------------------------------------------

const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour

function base64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlDecode(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function sign(data, secret) {
  return base64url(createHmac('sha256', secret).update(data).digest());
}

/**
 * Create a signed, self-expiring session token.
 *
 * The token is `<payloadB64>.<signatureB64>` where the payload carries the
 * caller's claims plus issued-at (`iat`) and expiry (`exp`) timestamps.
 *
 * @param {object} payload arbitrary JSON-serialisable claims (e.g. { sub })
 * @param {string} secret server-side signing secret
 * @param {{ ttlSeconds?: number, now?: number }} [opts]
 * @returns {string} token
 */
export function createToken(payload, secret, opts = {}) {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError('payload must be a plain object');
  }
  if (typeof secret !== 'string' || secret.length === 0) {
    throw new TypeError('secret must be a non-empty string');
  }
  const ttl = opts.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const now = Math.floor((opts.now ?? Date.now()) / 1000);
  const claims = { ...payload, iat: now, exp: now + ttl };
  const encoded = base64url(JSON.stringify(claims));
  return `${encoded}.${sign(encoded, secret)}`;
}

/**
 * Verify a token's signature and expiry. Returns the decoded claims on
 * success, or throws an Error whose message explains the failure.
 *
 * @param {string} token
 * @param {string} secret same secret passed to createToken()
 * @param {{ now?: number }} [opts]
 * @returns {object} decoded claims
 */
export function verifyToken(token, secret, opts = {}) {
  if (typeof token !== 'string' || typeof secret !== 'string' || secret.length === 0) {
    throw new Error('invalid token or secret');
  }
  const dot = token.indexOf('.');
  if (dot === -1) {
    throw new Error('malformed token');
  }
  const encoded = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = sign(encoded, secret);

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw new Error('bad signature');
  }

  let claims;
  try {
    claims = JSON.parse(base64urlDecode(encoded).toString('utf8'));
  } catch {
    throw new Error('malformed payload');
  }

  const now = Math.floor((opts.now ?? Date.now()) / 1000);
  if (typeof claims.exp === 'number' && now >= claims.exp) {
    throw new Error('token expired');
  }
  return claims;
}

/**
 * Convenience helper for serverless handlers: pull a Bearer token out of an
 * Authorization header value and verify it. Returns the claims, or null when
 * the header is absent/malformed or the token is invalid/expired.
 *
 * @param {string | undefined | null} authorizationHeader
 * @param {string} secret
 * @param {{ now?: number }} [opts]
 * @returns {object | null}
 */
export function authenticateRequest(authorizationHeader, secret, opts = {}) {
  if (typeof authorizationHeader !== 'string') {
    return null;
  }
  const match = /^Bearer (.+)$/.exec(authorizationHeader.trim());
  if (!match) {
    return null;
  }
  try {
    return verifyToken(match[1], secret, opts);
  } catch {
    return null;
  }
}
