/**
 * POST /api/auth/refresh
 *
 * Rotates the refresh token and issues a new access token.
 * The refresh token is read from and rewritten to the HttpOnly cookie.
 *
 * No request body required — token is taken from the cookie.
 * Response: { accessToken: string }
 */
import { rotateRefreshToken, buildRefreshTokenCookie, parseRefreshTokenCookie } from '../_lib/session.js';
import { createAccessToken } from '../_lib/session.js';
import { handleCors } from '../_lib/middleware.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cookieHeader = req.headers?.cookie;
  const oldToken = parseRefreshTokenCookie(cookieHeader);
  if (!oldToken) {
    return res.status(401).json({ error: 'No refresh token provided' });
  }

  try {
    const { userId, email, newRefreshToken, expiresAt } = rotateRefreshToken(oldToken);
    const accessToken = await createAccessToken({ id: userId, email });
    res.setHeader('Set-Cookie', buildRefreshTokenCookie(newRefreshToken, expiresAt));
    return res.status(200).json({ accessToken });
  } catch (err) {
    if (err.message?.includes('not found') || err.message?.includes('expired')) {
      return res.status(401).json({ error: err.message });
    }
    console.error('[refresh] unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
