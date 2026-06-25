// Core auth module — JWT creation and verification.
// Uses only Node.js built-in `crypto`; no external dependencies.
//
// Token types:
//   access  — short-lived (default 15 min), used to authenticate API requests
//   refresh — long-lived  (default 7 days),  used to obtain new access tokens

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// ── Base64url helpers ─────────────────────────────────────────────────────────

function b64urlEncode(str) {
  return Buffer.from(str, 'utf8').toString('base64url');
}

function b64urlDecode(str) {
  return Buffer.from(str, 'base64url').toString('utf8');
}

// ── Low-level JWT ─────────────────────────────────────────────────────────────

const HEADER = b64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));

/**
 * Sign an arbitrary payload and return a compact JWT string.
 * @param {object} payload
 * @param {string} secret
 * @returns {string}
 */
export function signToken(payload, secret) {
  const body = b64urlEncode(JSON.stringify(payload));
  const sig = createHmac('sha256', secret)
    .update(`${HEADER}.${body}`)
    .digest('base64url');
  return `${HEADER}.${body}.${sig}`;
}

/**
 * Verify a JWT string.  Throws on invalid signature or expired token.
 * @param {string} token
 * @param {string} secret
 * @returns {object} decoded payload
 */
export function verifyToken(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');

  const [header, body, sig] = parts;

  const expectedSig = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);

  // Timing-safe comparison guards against length-extension / timing attacks.
  if (
    sigBuf.length !== expBuf.length ||
    !timingSafeEqual(sigBuf, expBuf)
  ) {
    throw new Error('Invalid token signature');
  }

  const payload = JSON.parse(b64urlDecode(body));

  if (payload.exp !== undefined && Math.floor(Date.now() / 1000) > payload.exp) {
    throw new Error('Token expired');
  }

  return payload;
}

// ── High-level token factories ────────────────────────────────────────────────

/**
 * Create a short-lived access token for the given user.
 * @param {string} userId
 * @param {string} secret
 * @param {number} [expiresInSeconds=900]  default: 15 minutes
 * @returns {string}
 */
export function createAccessToken(userId, secret, expiresInSeconds = 900) {
  const now = Math.floor(Date.now() / 1000);
  return signToken(
    {
      sub: userId,
      iat: now,
      exp: now + expiresInSeconds,
      type: 'access',
      jti: randomBytes(16).toString('hex'),
    },
    secret,
  );
}

/**
 * Create a long-lived refresh token for the given user.
 * A random `jti` (JWT ID) is embedded so that each refresh token is unique
 * even when issued for the same user at the same second.
 * @param {string} userId
 * @param {string} secret
 * @param {number} [expiresInSeconds=604800]  default: 7 days
 * @returns {string}
 */
export function createRefreshToken(userId, secret, expiresInSeconds = 604800) {
  const now = Math.floor(Date.now() / 1000);
  return signToken(
    {
      sub: userId,
      iat: now,
      exp: now + expiresInSeconds,
      type: 'refresh',
      jti: randomBytes(16).toString('hex'),
    },
    secret,
  );
}
