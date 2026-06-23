/**
 * POST /api/auth/login
 *
 * Body (JSON): { email, password }
 *
 * Success 200: { ok: true, token: "<jwt>", user: { id, email } }
 * Error   400: { ok: false, error: "invalid email or password" }
 * Error   405: method not allowed
 */

import { login } from '../_lib/auth.js';
import { users } from '../_lib/userStore.js';

const AUTH_SECRET = process.env.AUTH_SECRET || 'wander-dev-secret-change-in-production';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const { email, password } = req.body || {};
  const result = login(users, email, password, AUTH_SECRET);

  if (!result.ok) {
    return res.status(400).json(result);
  }

  return res.status(200).json(result);
}
