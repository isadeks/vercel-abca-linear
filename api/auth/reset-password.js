/**
 * POST /api/auth/reset-password
 *
 * Validates the reset token and updates the user's password.
 * On success:
 *   1. The reset token is consumed (invalidated).
 *   2. A new session (access token + refresh token) is issued so the user
 *      is immediately logged in — no extra login step required.
 *
 * Request body: { email: string, token: string, password: string }
 * Response:     { accessToken: string, user: { id, email, provider, createdAt } }
 * Refresh token is returned as a secure HttpOnly cookie.
 */
import { findUserByEmail, updateUserPassword } from '../_lib/user.js';
import { validateResetToken, consumeResetToken } from '../_lib/resetToken.js';
import { createAccessToken, createRefreshToken, buildRefreshTokenCookie } from '../_lib/session.js';
import { handleCors } from '../_lib/middleware.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, token, password } = req.body ?? {};

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email is required' });
  }
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'token is required' });
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'password is required' });
  }

  try {
    // Validate token — throws on invalid/expired/mismatched.
    const normalizedEmail = validateResetToken(token, email);

    // Update the password (also validates minimum length via hashPassword).
    await updateUserPassword(normalizedEmail, password);

    // Consume the token so it can't be reused.
    consumeResetToken(token);

    // Issue a fresh session so the user is logged in immediately.
    const user = findUserByEmail(normalizedEmail);
    if (!user) {
      // Should never happen — updateUserPassword would have thrown first.
      return res.status(500).json({ error: 'Internal server error' });
    }
    const publicUser = { id: user.id, email: user.email, provider: user.provider, createdAt: user.createdAt };
    const [accessToken, { token: refreshToken, expiresAt }] = await Promise.all([
      createAccessToken(publicUser),
      Promise.resolve(createRefreshToken(publicUser)),
    ]);

    res.setHeader('Set-Cookie', buildRefreshTokenCookie(refreshToken, expiresAt));
    return res.status(200).json({ accessToken, user: publicUser });
  } catch (err) {
    // Token / validation errors → 400
    if (
      err.message?.includes('token') ||
      err.message?.includes('expired') ||
      err.message?.includes('email') ||
      err.message?.includes('Password must be') ||
      err.message?.includes('User not found')
    ) {
      return res.status(400).json({ error: err.message });
    }
    console.error('[reset-password] unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
