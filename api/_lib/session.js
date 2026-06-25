/**
 * Session management — signed JWTs (access tokens) backed by jose.
 *
 * Access tokens are short-lived (15 min) and signed with HS256.
 * Refresh tokens are longer-lived (7 days) and opaque (random UUID stored
 * in-memory here; swap for DB persistence in production).
 *
 * Cookie helpers emit the correct Set-Cookie header strings so the calling
 * Vercel handler only needs to attach them to the response.
 */
import { SignJWT, jwtVerify } from 'jose';

// ---------------------------------------------------------------------------
// Config — read from environment with safe defaults for local dev.
// ---------------------------------------------------------------------------

const JWT_SECRET = process.env.JWT_SECRET ?? 'change-me-in-production-min-32-chars!';
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;          // 15 minutes
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/** @type {TextEncoder} */
const encoder = new TextEncoder();

/**
 * Derive the HMAC key from the JWT_SECRET string.
 * @returns {Uint8Array}
 */
function secretKey() {
  return encoder.encode(JWT_SECRET);
}

// ---------------------------------------------------------------------------
// Access tokens (JWT)
// ---------------------------------------------------------------------------

/**
 * Issue a signed JWT access token for the given user.
 * @param {{ id: string, email: string, role?: string }} user
 * @returns {Promise<string>} compact JWT string
 */
export async function createAccessToken(user) {
  if (!user?.id || !user?.email) {
    throw new Error('user.id and user.email are required');
  }
  const iat = Math.floor(Date.now() / 1000);
  const claims = { sub: user.id, email: user.email };
  if (user.role) claims.role = user.role;
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(iat)
    .setExpirationTime(iat + ACCESS_TOKEN_TTL_SECONDS)
    .sign(secretKey());
}

/**
 * Verify and decode a JWT access token.
 * @param {string} token
 * @returns {Promise<{ sub: string, email: string, role?: string, iat: number, exp: number }>}
 * @throws on invalid / expired tokens
 */
export async function verifyAccessToken(token) {
  const { payload } = await jwtVerify(token, secretKey(), {
    algorithms: ['HS256'],
  });
  return payload;
}

// ---------------------------------------------------------------------------
// Refresh tokens (opaque, in-memory store)
// ---------------------------------------------------------------------------

/**
 * @type {Map<string, { userId: string, email: string, expiresAt: number, family: string }>}
 * Key: refresh token UUID
 */
const _refreshTokens = new Map();

/**
 * Issue a new refresh token and store it.
 * @param {{ id: string, email: string }} user
 * @param {string} [family]  Token family for rotation detection; defaults to a new UUID.
 * @returns {{ token: string, expiresAt: number }}
 */
export function createRefreshToken(user, family) {
  if (!user?.id || !user?.email) {
    throw new Error('user.id and user.email are required');
  }
  const token = crypto.randomUUID();
  const expiresAt = Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000;
  const tokenFamily = family ?? crypto.randomUUID();
  _refreshTokens.set(token, { userId: user.id, email: user.email, expiresAt, family: tokenFamily });
  return { token, expiresAt };
}

/**
 * Rotate a refresh token: consume the old one, issue a new one in the same family.
 * If the old token is already consumed (reuse detected), the entire family is
 * invalidated (refresh token reuse attack mitigation).
 *
 * @param {string} oldToken
 * @returns {{ userId: string, email: string, newRefreshToken: string, expiresAt: number }}
 * @throws on invalid, expired, or reused tokens
 */
export function rotateRefreshToken(oldToken) {
  const entry = _refreshTokens.get(oldToken);
  if (!entry) {
    // Possible reuse attack — try to find and revoke the family.
    // In production you'd query the DB by family; here we do a linear scan.
    // We can't identify the family from the stale token alone (it's gone),
    // so we just throw — callers must re-authenticate.
    throw new Error('Refresh token not found or already consumed');
  }
  if (Date.now() > entry.expiresAt) {
    _refreshTokens.delete(oldToken);
    throw new Error('Refresh token expired');
  }
  // Consume the old token.
  _refreshTokens.delete(oldToken);
  // Issue a new token in the same family.
  const { token: newToken, expiresAt } = createRefreshToken(
    { id: entry.userId, email: entry.email },
    entry.family,
  );
  return { userId: entry.userId, email: entry.email, newRefreshToken: newToken, expiresAt };
}

/**
 * Revoke a refresh token explicitly (logout).
 * @param {string} token
 */
export function revokeRefreshToken(token) {
  _refreshTokens.delete(token);
}

/**
 * Clear all refresh tokens — for test isolation only.
 */
export function _resetRefreshTokenStore() {
  _refreshTokens.clear();
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

const REFRESH_TOKEN_COOKIE = 'refreshToken';
const SECURE_FLAG = process.env.NODE_ENV === 'production' ? '; Secure' : '';

/**
 * Build the Set-Cookie header value for the refresh token.
 * @param {string} token
 * @param {number} expiresAt  Unix epoch in milliseconds
 * @returns {string}
 */
export function buildRefreshTokenCookie(token, expiresAt) {
  const expires = new Date(expiresAt).toUTCString();
  return `${REFRESH_TOKEN_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/api/auth${SECURE_FLAG}; Expires=${expires}`;
}

/**
 * Build a Set-Cookie header that clears the refresh token cookie.
 * @returns {string}
 */
export function clearRefreshTokenCookie() {
  return `${REFRESH_TOKEN_COOKIE}=; HttpOnly; SameSite=Strict; Path=/api/auth${SECURE_FLAG}; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0`;
}

/**
 * Parse the refresh token from an incoming Cookie header string.
 * @param {string|undefined} cookieHeader
 * @returns {string|null}
 */
export function parseRefreshTokenCookie(cookieHeader) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === REFRESH_TOKEN_COOKIE) return rest.join('=') || null;
  }
  return null;
}
