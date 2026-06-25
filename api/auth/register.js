// POST /api/auth/register — create a new local (email+password) account.
import { createUser, findUserByEmail } from '../_lib/auth/users.js';
import { hashPassword } from '../_lib/auth/password.js';
import { issueTokens } from '../_lib/auth/sessions.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' });
  }

  if (findUserByEmail(email)) {
    return res.status(409).json({ error: 'An account with that email already exists' });
  }

  const passwordHash = hashPassword(password);
  const user = createUser({ email, passwordHash });
  const tokens = issueTokens(user);

  return res.status(201).json({ user: { id: user.id, email: user.email, roles: user.roles }, ...tokens });
}
