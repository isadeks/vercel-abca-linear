/**
 * /api/auth — unified authentication handler
 *
 * Handles both register and login in a SINGLE Lambda so they share the same
 * in-memory users Map. Split files (api/auth/login.js + api/auth/register.js)
 * each get their own module instance and therefore their own empty Map, which
 * means a user registered via one function can never be found by the other.
 *
 * POST /api/auth?action=register   { email, password }
 *   → 201 { ok: true, user: { id, email } }
 *   → 400 { ok: false, error: string }
 *
 * POST /api/auth?action=login      { email, password }
 *   → 200 { ok: true, token: string, user: { id, email } }
 *   → 400 { ok: false, error: string }
 */

import { register, login } from './_lib/auth.js';

const AUTH_SECRET = process.env.AUTH_SECRET || 'wander-dev-secret-change-in-production';

// Module-scoped store — shared for the lifetime of this warm Lambda instance.
// Both register and login run in the same process, so users registered here
// are immediately visible to login calls in the same instance.
const users = new Map();

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const action = req.query?.action;
  const { email, password } = req.body || {};

  if (action === 'register') {
    const result = register(users, email, password);
    return res.status(result.ok ? 201 : 400).json(result);
  }

  if (action === 'login') {
    const result = login(users, email, password, AUTH_SECRET);
    return res.status(result.ok ? 200 : 400).json(result);
  }

  return res.status(400).json({ ok: false, error: 'Missing or unknown action. Use ?action=register or ?action=login' });
}
