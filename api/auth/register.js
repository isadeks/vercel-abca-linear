/**
 * POST /api/auth/register
 *
 * Body (JSON): { email, password }
 *
 * Success 201: { ok: true, user: { id, email } }
 * Error   400: { ok: false, error: "<message>" }
 * Error   405: method not allowed
 */

import { register } from '../_lib/auth.js';
import { users } from '../_lib/userStore.js';

const AUTH_SECRET = process.env.AUTH_SECRET || 'wander-dev-secret-change-in-production';

// Re-export so callers can also verify tokens after registration
export { AUTH_SECRET };

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const { email, password } = req.body || {};
  const result = register(users, email, password);

  if (!result.ok) {
    return res.status(400).json(result);
  }

  return res.status(201).json(result);
}
