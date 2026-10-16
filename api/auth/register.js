/**
 * POST /api/auth/register
 *
 * Creates a new local user account and returns an access token + refresh token
 * (refresh token delivered as an HttpOnly cookie).
 *
 * Request body: { email: string, password: string }
 * Response:     { accessToken: string, user: { id, email, provider, createdAt } }
 */
import { createUser } from '../_lib/user.js';
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
    const user = await createUser({ email, password });
    const [accessToken, { token: refreshToken, expiresAt }] = await Promise.all([
      createAccessToken(user),
      Promise.resolve(createRefreshToken(user)),
    ]);
    res.setHeader('Set-Cookie', buildRefreshTokenCookie(refreshToken, expiresAt));
    return res.status(201).json({ accessToken, user });
  } catch (err) {
    if (err.message === 'Email already registered') {
      return res.status(409).json({ error: err.message });
    }
    if (err.message?.includes('Password must be')) {
      return res.status(400).json({ error: err.message });
    }
    console.error('[register] unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
