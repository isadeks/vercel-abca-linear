// POST /api/auth/logout — revoke a refresh token.
import { revokeRefreshToken } from '../_lib/auth/sessions.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { refreshToken } = req.body ?? {};
  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken is required' });
  }

  revokeRefreshToken(refreshToken);
  return res.status(200).json({ message: 'Logged out successfully' });
}
