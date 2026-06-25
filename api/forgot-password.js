// Vercel serverless function — POST /api/forgot-password
//
// Accepts:  { email: string }
// Returns:  { success: true }  (always, to prevent user enumeration)
//
// In production, wire up real adapters and configure:
//   RESET_TOKEN_SECRET — strong random secret (≥ 32 bytes)
//   APP_BASE_URL       — e.g. https://wander.example.com

import { forgotPassword, setUserAdapter, setResetTokenAdapter } from './_lib/password-reset.js';
import {
  buildInMemoryUserAdapter,
  buildInMemoryResetTokenAdapter,
} from './_lib/db-adapter.js';

// ── Adapter bootstrap ─────────────────────────────────────────────────────────
// In production, replace these with real DB-backed adapters.
// Using module-level singletons so the adapters persist between warm invocations.
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

  const { email } = req.body ?? {};

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email is required' });
  }

  const secret = process.env.RESET_TOKEN_SECRET ?? 'dev-reset-secret-change-me';
  const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3000';

  try {
    await forgotPassword(email.toLowerCase().trim(), { secret, baseUrl });
    // Always return success — never reveal whether the email is registered.
    return res.status(200).json({ success: true });
  } catch (err) {
    // Log internally but return generic success to the client.
    console.error('[forgot-password] unexpected error:', err);
    return res.status(200).json({ success: true });
  }
}
