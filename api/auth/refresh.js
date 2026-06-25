// POST /api/auth/refresh — exchange a refresh token for a fresh token pair.
import { rotateRefreshToken } from '../_lib/auth/sessions.js';
import { findUserById } from '../_lib/auth/users.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { refreshToken } = req.body ?? {};
  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken is required' });
  }

  try {
    const tokens = rotateRefreshToken(refreshToken, findUserById);
    return res.status(200).json(tokens);
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
}
