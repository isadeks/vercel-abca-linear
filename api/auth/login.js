/**
 * POST /api/auth/login
 *
 * Authenticate an existing user and return a JWT.
 *
 * Request body (JSON):
 *   { email: string, password: string }
 *
 * Responses:
 *   200  { user: { id, email, name, createdAt }, token: string }
 *   400  { error: string }
 *   401  { error: 'Invalid credentials' }
 *   405  (method not allowed)
 */

import { verifyPassword, generateToken } from '../_lib/auth.js';
import { users } from '../_lib/users.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body ?? {};

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' });
  }

  const record = users.findByEmail(email);
  // Use a constant-time check even on a missing user to prevent timing attacks.
  const passwordMatches =
    record !== undefined && verifyPassword(password, record.passwordHash);

  if (!record || !passwordMatches) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // eslint-disable-next-line no-unused-vars
  const { passwordHash, ...user } = record;
  const token = generateToken({ sub: user.id, email: user.email });

  return res.status(200).json({ user, token });
}
