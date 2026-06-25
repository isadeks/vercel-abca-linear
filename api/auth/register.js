/**
 * POST /api/auth/register
 *
 * Body: { email: string, password: string, role?: 'admin'|'user' }
 *
 * Response 201: { user: { id, email, role }, token }
 * Response 400: { error: string }
 * Response 409: { error: string }   — email already taken
 * Response 405: { error: string }   — wrong HTTP method
 */

import { register } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, password, role } = req.body ?? {};

  try {
    const result = await register({ email, password, role });
    return res.status(201).json(result);
  } catch (err) {
    const message = err.message ?? 'Registration failed';
    const status = message.includes('already registered') ? 409 : 400;
    return res.status(status).json({ error: message });
  }
}
