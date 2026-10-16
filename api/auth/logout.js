/**
 * POST /api/auth/logout
 *
 * Revokes the current refresh token and clears the cookie.
 * The access token itself is short-lived (15 min) so no server-side
 * revocation is needed for it.
 *
 * No request body required — token is taken from the cookie.
 * Response: { message: 'Logged out' }
 */
import { revokeRefreshToken, parseRefreshTokenCookie, clearRefreshTokenCookie } from '../_lib/session.js';
import { handleCors } from '../_lib/middleware.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cookieHeader = req.headers?.cookie;
  const token = parseRefreshTokenCookie(cookieHeader);
  if (token) {
    revokeRefreshToken(token);
  }
  res.setHeader('Set-Cookie', clearRefreshTokenCookie());
  return res.status(200).json({ message: 'Logged out' });
}
