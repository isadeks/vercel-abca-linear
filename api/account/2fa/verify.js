/**
 * POST /api/account/2fa/verify
 *
 * Confirms that the user scanned the QR code correctly by verifying their
 * first TOTP code, then enables 2FA on their account.
 *
 * Request body (JSON):
 *   { "userId": string, "secret": string, "token": string }
 *
 * Success response 200:
 *   { "twoFactorEnabled": true }
 *
 * Error responses:
 *   400  — missing fields or invalid/expired token
 *   404  — user not found
 *   405  — wrong HTTP method
 */

import { enableTwoFactor } from '../../_lib/twoFactor.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userId, secret, token } = req.body ?? {};
  if (!userId || !secret || !token) {
    return res.status(400).json({ error: 'userId, secret, and token are required' });
  }

  try {
    const updated = enableTwoFactor(userId, secret, token);
    return res.status(200).json({ twoFactorEnabled: updated.twoFactorEnabled });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    if (err.message.includes('invalid or expired')) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}
