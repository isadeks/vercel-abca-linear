// Vercel serverless function — POST /api/reset-password
//
// Accepts:  { token: string, newPassword: string }
// Returns:  { success: true }  on success
//           { error: string }  on failure (invalid/expired/used token, etc.)
//
// In production, wire up real adapters and configure:
//   RESET_TOKEN_SECRET — strong random secret (≥ 32 bytes, same as forgot-password)

import { resetPassword, setUserAdapter, setResetTokenAdapter } from './_lib/password-reset.js';
import {
  buildInMemoryUserAdapter,
  buildInMemoryResetTokenAdapter,
} from './_lib/db-adapter.js';

// ── Adapter bootstrap ─────────────────────────────────────────────────────────
// In production, replace these with real DB-backed adapters.
const userAdapter = buildInMemoryUserAdapter();
const resetTokenAdapter = buildInMemoryResetTokenAdapter();

setUserAdapter(userAdapter);
setResetTokenAdapter(resetTokenAdapter);

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, newPassword } = req.body ?? {};

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'token is required' });
  }
  if (!newPassword || typeof newPassword !== 'string') {
    return res.status(400).json({ error: 'newPassword is required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const secret = process.env.RESET_TOKEN_SECRET ?? 'dev-reset-secret-change-me';

  try {
    await resetPassword(token, newPassword, { secret });
    return res.status(200).json({ success: true });
  } catch (err) {
    const message = err.message ?? 'Invalid or expired reset token';
    // Map internal error messages to user-safe responses
    if (
      message.includes('expired') ||
      message.includes('Invalid token') ||
      message.includes('not found') ||
      message.includes('already been used') ||
      message.includes('password-reset token')
    ) {
      return res.status(400).json({ error: 'Invalid or expired reset token. Please request a new one.' });
    }
    console.error('[reset-password] unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
}
