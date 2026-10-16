/**
 * DELETE /api/account/2fa
 *
 * Disables two-factor authentication for a user and clears the stored secret.
 *
 * Request body (JSON):
 *   { "userId": string }
 *
 * Success response 200:
 *   { "twoFactorEnabled": false }
 *
 * Error responses:
 *   400  — missing userId or 2FA was already disabled
 *   404  — user not found
 *   405  — wrong HTTP method
 */

import { disableTwoFactor } from '../../_lib/twoFactor.js';

export default function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userId } = req.body ?? {};
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const updated = disableTwoFactor(userId);
    return res.status(200).json({ twoFactorEnabled: updated.twoFactorEnabled });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    if (err.message.includes('does not have 2FA enabled')) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}
