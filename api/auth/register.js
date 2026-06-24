/**
 * POST /api/auth/register
 *
 * Create a new user account.
 *
 * Request body (JSON):
 *   { email: string, password: string, name: string }
 *
 * Responses:
 *   201  { user: { id, email, name, createdAt }, token: string }
 *   400  { error: string }
 *   409  { error: 'Email already registered' }
 *   405  (method not allowed)
 */

import { hashPassword, generateToken } from '../_lib/auth.js';
import { users } from '../_lib/users.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, name } = req.body ?? {};

  // ── Validation ────────────────────────────────────────────────────────────
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Valid email is required' });
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  if (!name || typeof name !== 'string' || name.trim().length < 1) {
    return res.status(400).json({ error: 'Name is required' });
  }

  // ── Uniqueness check ──────────────────────────────────────────────────────
  if (users.exists(email)) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  // ── Create user ───────────────────────────────────────────────────────────
  const passwordHash = hashPassword(password);
  const user = users.create({ email, name, passwordHash });
  const token = generateToken({ sub: user.id, email: user.email });

  return res.status(201).json({ user, token });
}
