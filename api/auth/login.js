/**
 * POST /api/auth/login
 *
 * Authenticates a local user and returns an access token + refresh token.
 *
 * Request body: { email: string, password: string }
 * Response:     { accessToken: string, user: { id, email, provider, createdAt } }
 * Refresh token is returned as a secure HttpOnly cookie.
 */
import { findUserByEmail, verifyPassword } from '../_lib/user.js';
import { createAccessToken, createRefreshToken, buildRefreshTokenCookie } from '../_lib/session.js';
import { handleCors } from '../_lib/middleware.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const user = findUserByEmail(email);
    if (!user) {
      // Use a constant-time comparison path — don't reveal whether the email exists.
      await verifyPassword('dummy', '$2b$12$invalidHashThatWillAlwaysFail000000000000000000');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const publicUser = { id: user.id, email: user.email, provider: user.provider, role: user.role ?? 'viewer', createdAt: user.createdAt };
    const [accessToken, { token: refreshToken, expiresAt }] = await Promise.all([
      createAccessToken(publicUser),
      Promise.resolve(createRefreshToken(publicUser)),
    ]);
    res.setHeader('Set-Cookie', buildRefreshTokenCookie(refreshToken, expiresAt));
    return res.status(200).json({ accessToken, user: publicUser });
  } catch (err) {
    console.error('[login] unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
