/**
 * GET /api/auth/me
 *
 * Return the currently-authenticated user's public profile.
 * Clients must include the JWT in the Authorization header:
 *   Authorization: Bearer <token>
 *
 * Responses:
 *   200  { user: { id, email, name, createdAt } }
 *   401  { error: 'Unauthorized' }
 *   405  (method not allowed)
 */

import { verifyToken } from '../_lib/auth.js';
import { users } from '../_lib/users.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers?.authorization ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = users.findById(String(payload.sub));
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return res.status(200).json({ user });
}
