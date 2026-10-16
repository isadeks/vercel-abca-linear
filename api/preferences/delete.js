// Vercel serverless ES-module function — DELETE /api/preferences
//
// Resets all user preferences back to their factory defaults.
// Returns the restored preference values as a JSON response so that callers
// (e.g. the settings page) can re-render the form without a second round-trip.

import { preferences, DEFAULTS } from './get.js';

/**
 * DELETE /api/preferences
 *
 * @param {import('@vercel/node').VercelRequest}  req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  // Replace the Map contents with the documented defaults.
  preferences.clear();
  for (const [key, value] of Object.entries(DEFAULTS)) {
    preferences.set(key, value);
  }

  res.status(200).json({ ok: true, preferences: Object.fromEntries(preferences) });
}
