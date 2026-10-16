/**
 * DELETE /api/account
 *
 * Permanently (soft-)deletes the caller's account.
 * Requires either the current password or the exact confirmation phrase to be
 * supplied in the request body — without one of these the request is rejected
 * before any data is modified.
 *
 * Request body (JSON):
 *   { "userId": string, "password"?: string, "phrase"?: string }
 *
 *   Supply exactly one of `password` or `phrase`.
 *
 * Success response 200:
 *   { "deleted": true }
 *
 * Error responses:
 *   400  — missing userId, missing confirmation, or wrong password/phrase
 *   404  — user not found
 *   405  — wrong HTTP method
 */

import { requestAccountDeletion } from '../_lib/accountDeletion.js';

export default function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userId, password, phrase } = req.body ?? {};
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const deleted = requestAccountDeletion(userId, { password, phrase });
    return res.status(200).json({ deleted: deleted.deleted });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    if (
      err.message.includes('confirmation required') ||
      err.message.includes('incorrect password') ||
      err.message.includes('confirmation phrase')
    ) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}
