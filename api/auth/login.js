/**
 * POST /api/auth/login
 *
 * Body: { email: string, password: string }
 *
 * Response 200: { user: { id, email, role }, token }
 * Response 400: { error: string }
 * Response 401: { error: string }   — invalid credentials
 * Response 405: { error: string }   — wrong HTTP method
 */

import { login } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, password } = req.body ?? {};

  try {
    const result = await login({ email, password });
    return res.status(200).json(result);
  } catch (err) {
    const message = err.message ?? 'Login failed';
    const status = message === 'Invalid credentials' ? 401 : 400;
    return res.status(status).json({ error: message });
  }
}
