/**
 * PATCH /api/account/profile
 *
 * Vercel serverless function — updates a user's editable profile fields.
 *
 * Request
 * ───────
 * Method : PATCH
 * Body   : JSON  { userId, displayName?, email?, avatarUrl? }
 *   userId      — required; identifies which account to update.
 *   displayName — optional string (1–100 chars).
 *   email       — optional string (valid email format, max 254 chars).
 *   avatarUrl   — optional string (http/https URL, or '' to clear).
 *
 * Success response — 200
 * ──────────────────────
 *   { userId, displayName, email, avatarUrl, updatedAt }
 *
 * Error responses
 * ───────────────
 *   400  Missing userId / no profile fields / validation failure.
 *   405  Non-PATCH request.
 *   500  Unexpected server error.
 */

import { updateProfile } from '../_lib/profile.js';

/**
 * @param {import('@vercel/node').VercelRequest}  req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default function handler(req, res) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userId, displayName, email, avatarUrl } = req.body ?? {};

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const profile = updateProfile(userId, { displayName, email, avatarUrl });
    return res.status(200).json(profile);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // updateProfile throws descriptive errors for validation failures and
    // "not found" / "deleted" states — surface them all as 400.
    return res.status(400).json({ error: message });
  }
}
