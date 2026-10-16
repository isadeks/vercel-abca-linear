/**
 * api/notification-preferences.js — Vercel serverless function.
 *
 * Routes
 * ------
 *   GET    /api/notification-preferences?userId=<id>
 *     → 200 { preferences }   (returns defaults when no record exists)
 *     → 400 when userId is missing
 *
 *   PUT    /api/notification-preferences?userId=<id>
 *     body: partial UserPreferences (channels and/or types blocks)
 *     → 200 { preferences }
 *     → 400 on validation failure
 *
 *   DELETE /api/notification-preferences?userId=<id>
 *     → 200 { preferences }   (resets to defaults)
 *     → 400 when userId is missing
 *
 * Storage
 * -------
 * A real deployment would persist to a database.  Because this project has no
 * database layer yet, the module uses an in-process Map (adequate for
 * integration tests and local Vercel dev; resets on cold-start).  A follow-up
 * task can swap the adapter without touching the business logic in _lib/.
 */

import {
  createPreferences,
  updatePreferences,
  validatePreferences,
} from './_lib/notifications.js';
import { preferenceStore } from './_lib/stores.js';

// ── In-process store (swap for a DB adapter) ──────────────────────────────────
const store = preferenceStore;

/**
 * @param {string} userId
 * @returns {UserPreferences}
 */
function getOrCreate(userId) {
  if (!store.has(userId)) {
    store.set(userId, createPreferences(userId));
  }
  return store.get(userId);
}

// ── Handler ───────────────────────────────────────────────────────────────────

/**
 * @param {import('@vercel/node').VercelRequest}  req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default function handler(req, res) {
  const userId = req.query?.userId;

  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    return res
      .status(400)
      .json({ error: 'userId query parameter is required' });
  }

  switch (req.method) {
    case 'GET': {
      const preferences = getOrCreate(userId);
      return res.status(200).json({ preferences });
    }

    case 'PUT': {
      const body = req.body ?? {};
      const { valid, errors } = validatePreferences(body);
      if (!valid) {
        return res.status(400).json({ error: 'Invalid payload', errors });
      }
      const existing = getOrCreate(userId);
      const updated  = updatePreferences(existing, body);
      store.set(userId, updated);
      return res.status(200).json({ preferences: updated });
    }

    case 'DELETE': {
      const fresh = createPreferences(userId);
      store.set(userId, fresh);
      return res.status(200).json({ preferences: fresh });
    }

    default:
      res.setHeader('Allow', 'GET, PUT, DELETE');
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
