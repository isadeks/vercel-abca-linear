// POST /api/auth/login — authenticate with email + password.
import { findUserByEmail } from '../_lib/auth/users.js';
import { verifyPassword } from '../_lib/auth/password.js';
import { issueTokens } from '../_lib/auth/sessions.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = findUserByEmail(email);
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const tokens = issueTokens(user);
  return res.status(200).json({ user: { id: user.id, email: user.email, roles: user.roles }, ...tokens });
}
