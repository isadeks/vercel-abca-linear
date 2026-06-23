/**
 * api/notify/prefs.js — Vercel serverless function
 *
 * Routes:
 *   GET  /api/notify/prefs?userId=<id>          → 200 {prefs}
 *   POST /api/notify/prefs                       → 200 {prefs}  body: {userId, ...booleans}
 *   DELETE /api/notify/prefs?userId=<id>         → 200 {prefs}  (reset to defaults)
 *
 * userId is required for all methods. In a real app this would be pulled from
 * a session / JWT; here it is an explicit parameter for demo simplicity.
 */

import { getPrefs, setPrefs, resetPrefs } from '../_lib/notify-prefs.js';

/**
 * @param {import('@vercel/node').VercelRequest}  req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default function handler(req, res) {
  // CORS headers — allow the settings page to call from any origin in dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    if (req.method === 'GET') {
      const userId = req.query?.userId;
      if (!userId) return res.status(400).json({ error: 'userId query param is required' });
      const prefs = getPrefs(String(userId));
      return res.status(200).json({ prefs });
    }

    if (req.method === 'POST') {
      const body   = req.body ?? {};
      const userId = body.userId;
      if (!userId) return res.status(400).json({ error: 'userId is required in request body' });

      const updates = Object.fromEntries(            // strip userId before passing to setPrefs
        Object.entries(body).filter(([k]) => k !== 'userId')
      );
      const prefs = setPrefs(String(userId), updates);
      return res.status(200).json({ prefs });
    }

    if (req.method === 'DELETE') {
      const userId = req.query?.userId;
      if (!userId) return res.status(400).json({ error: 'userId query param is required' });
      const prefs = resetPrefs(String(userId));
      return res.status(200).json({ prefs });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof RangeError || err instanceof TypeError) {
      return res.status(400).json({ error: err.message });
    }
    console.error('[notify/prefs]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
