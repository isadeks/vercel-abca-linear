// POST /api/auth/reset-password — consume a reset token and set a new password.
import { redeemResetToken } from '../_lib/auth/reset.js';
import { findUserById, updateUser } from '../_lib/auth/users.js';
import { hashPassword } from '../_lib/auth/password.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { token, password } = req.body ?? {};
  if (!token || !password) {
    return res.status(400).json({ error: 'token and password are required' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' });
  }

  let userId;
  try {
    userId = redeemResetToken(token);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const user = findUserById(userId);
  if (!user) {
    return res.status(400).json({ error: 'User not found' });
  }

  updateUser(userId, { passwordHash: hashPassword(password) });
  return res.status(200).json({ message: 'Password updated successfully' });
}
