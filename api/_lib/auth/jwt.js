// JSON Web Token helpers — HMAC-SHA256, no external dependencies.
// Uses Node.js built-in `crypto` module.
import { createHmac, timingSafeEqual } from 'node:crypto';

export const ACCESS_TTL = 15 * 60;             // 15 minutes in seconds
export const REFRESH_TTL = 7 * 24 * 60 * 60;  // 7 days in seconds

function b64urlEncode(input) {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64url');
}

function b64urlDecode(str) {
  return Buffer.from(str, 'base64url');
}

/**
 * Create a signed JWT.
 * @param {object} payload - Claims to embed (sub, roles, etc.)
 * @param {string} secret  - HMAC secret
 * @param {number} ttl     - Lifetime in seconds (default: ACCESS_TTL)
 * @returns {string} Signed JWT string
 */
export function sign(payload, secret, ttl = ACCESS_TTL) {
  const header = b64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const claims = { ...payload, iat: now, exp: now + ttl };
  const body = b64urlEncode(JSON.stringify(claims));
  const signingInput = `${header}.${body}`;
  const sig = createHmac('sha256', secret).update(signingInput).digest('base64url');
  return `${signingInput}.${sig}`;
}

/**
 * Verify a JWT and return its decoded claims.
 * Throws if the signature is invalid or the token has expired.
 * @param {string} token
 * @param {string} secret
 * @returns {object} Decoded claims
 */
export function verify(token, secret) {
  if (typeof token !== 'string') throw new Error('Token must be a string');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');
  const [header, body, sig] = parts;

  const signingInput = `${header}.${body}`;
  const expectedSig = createHmac('sha256', secret).update(signingInput).digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  const lengthMatch = sigBuf.length === expectedBuf.length;
  const sigMatch = lengthMatch && timingSafeEqual(sigBuf, expectedBuf);
  if (!sigMatch) throw new Error('Invalid token signature');

  const claims = JSON.parse(b64urlDecode(body).toString('utf8'));
  const now = Math.floor(Date.now() / 1000);
  if (claims.exp !== undefined && claims.exp < now) throw new Error('Token expired');
  return claims;
}
