// POST /api/auth/forgot-password — request a password-reset token.
// In production: email the reset link; here we return the token in the response
// (so it is testable without an email service).
import { findUserByEmail } from '../_lib/auth/users.js';
import { createResetToken } from '../_lib/auth/reset.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email } = req.body ?? {};
  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }

  const user = findUserByEmail(email);
  // Always respond 200 to prevent email enumeration.
  if (!user) {
    return res.status(200).json({ message: 'If that address is registered, a reset link has been sent.' });
  }

  const token = createResetToken(user.id);
  // TODO: email `token` to user instead of returning it
  return res.status(200).json({ message: 'Reset token generated', resetToken: token });
}
