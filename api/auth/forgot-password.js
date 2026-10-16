/**
 * POST /api/auth/forgot-password
 *
 * Accepts an email address, generates a time-limited reset token, and
 * dispatches a reset link via email (stubbed in this implementation).
 *
 * The response is deliberately vague ("If an account with that email exists…")
 * to prevent user-enumeration attacks — the caller can't distinguish a
 * registered from an unregistered address.
 *
 * Request body: { email: string }
 * Response:     { message: string }
 */
import { findUserByEmail } from '../_lib/user.js';
import { createResetToken } from '../_lib/resetToken.js';
import { sendPasswordResetEmail } from '../_lib/email.js';
import { handleCors } from '../_lib/middleware.js';

/** Base URL for building the reset link — defaults to localhost in dev. */
const APP_BASE_URL = process.env.APP_BASE_URL ?? 'http://localhost:3000';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body ?? {};
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email is required' });
  }

  // Always return the same response to prevent email enumeration.
  const safeResponse = {
    message: 'If an account with that email exists, a reset link has been sent.',
  };

  try {
    const user = findUserByEmail(email);
    if (!user) {
      // Account doesn't exist — respond identically to avoid enumeration.
      return res.status(200).json(safeResponse);
    }

    const { token, expiresAt } = createResetToken(user.email);
    const resetLink = `${APP_BASE_URL}/reset-password.html?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`;

    await sendPasswordResetEmail({ to: user.email, resetLink, expiresAt });

    return res.status(200).json(safeResponse);
  } catch (err) {
    console.error('[forgot-password] unexpected error:', err);
    // Still return the safe response — don't leak internal errors.
    return res.status(200).json(safeResponse);
  }
}
