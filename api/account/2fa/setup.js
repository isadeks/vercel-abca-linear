/**
 * POST /api/account/2fa/setup
 *
 * Begins the two-factor authentication setup flow for a user.
 * Returns a TOTP secret and an otpauth:// URI that the client can render
 * as a QR code.  The secret is NOT yet persisted — the user must verify
 * a code via POST /api/account/2fa/verify before 2FA is activated.
 *
 * Request body (JSON):
 *   { "userId": string }
 *
 * Success response 200:
 *   { "secret": string, "uri": string }
 *
 * Error responses:
 *   400  — missing userId
 *   404  — user not found
 *   405  — wrong HTTP method
 */

import { setupTwoFactor } from '../_lib/twoFactor.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userId } = req.body ?? {};
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const { secret, uri } = setupTwoFactor(userId);
    return res.status(200).json({ secret, uri });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}
