// Session management: issue/refresh access+refresh token pairs.
// Refresh tokens are stored in-memory (replace with DB in production).
import { randomBytes } from 'node:crypto';
import { sign, verify, ACCESS_TTL, REFRESH_TTL } from './jwt.js';

/** @type {Map<string, { userId: string, expiresAt: number }>} */
const _refreshTokens = new Map();

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET environment variable is not set');
  return s;
}

/**
 * Issue a new access+refresh token pair for a user.
 * @param {{ id: string, email: string, roles: string[] }} user
 * @returns {{ accessToken: string, refreshToken: string, expiresIn: number }}
 */
export function issueTokens(user) {
  const secret = getSecret();
  const accessToken = sign({ sub: user.id, email: user.email, roles: user.roles }, secret, ACCESS_TTL);

  const refreshToken = randomBytes(40).toString('hex');
  const expiresAt = Math.floor(Date.now() / 1000) + REFRESH_TTL;
  _refreshTokens.set(refreshToken, { userId: user.id, expiresAt });

  return { accessToken, refreshToken, expiresIn: ACCESS_TTL };
}

/**
 * Rotate a refresh token: validate the old one, invalidate it, issue fresh pair.
 * @param {string} oldRefreshToken
 * @param {function(string): object|null} getUserById - callback to load user
 * @returns {{ accessToken: string, refreshToken: string, expiresIn: number }}
 */
export function rotateRefreshToken(oldRefreshToken, getUserById) {
  const entry = _refreshTokens.get(oldRefreshToken);
  if (!entry) throw new Error('Refresh token not found or already used');

  const now = Math.floor(Date.now() / 1000);
  if (entry.expiresAt < now) {
    _refreshTokens.delete(oldRefreshToken);
    throw new Error('Refresh token expired');
  }

  _refreshTokens.delete(oldRefreshToken);

  const user = getUserById(entry.userId);
  if (!user) throw new Error('User not found');
  return issueTokens(user);
}

/**
 * Revoke a refresh token (logout).
 * @param {string} refreshToken
 */
export function revokeRefreshToken(refreshToken) {
  _refreshTokens.delete(refreshToken);
}

/**
 * Authenticate a request by verifying its Bearer access token.
 * Returns the decoded claims, or throws on failure.
 * @param {string|undefined} authorizationHeader - Value of the Authorization header
 * @returns {object} Decoded JWT claims
 */
export function authenticateRequest(authorizationHeader) {
  if (!authorizationHeader) throw new Error('Missing Authorization header');
  const match = authorizationHeader.match(/^Bearer\s+(\S+)$/i);
  if (!match) throw new Error('Authorization header must be "Bearer <token>"');
  return verify(match[1], getSecret());
}

/** Clear all refresh tokens — for tests only. */
export function _clearSessions() {
  _refreshTokens.clear();
}
