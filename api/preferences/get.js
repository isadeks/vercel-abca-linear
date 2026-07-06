// Vercel serverless ES-module function — GET /api/preferences
//
// Returns the current user preferences as a JSON response.
//
// Persistence: preferences are stored in a module-level Map. This means data
// lives only for the lifetime of a single serverless function instance and is
// NOT shared across instances or deployments. A production implementation
// would replace this Map with a durable store (e.g. a database or KV store).

/**
 * Default preference values.
 * Exported so that other handlers (e.g. DELETE /api/preferences) can restore
 * the Map to a known baseline without duplicating the list.
 *
 * @type {Record<string, unknown>}
 */
export const DEFAULTS = {
  currency:      'USD',
  language:      'en',
  theme:         'light',
  notifications: true,
  pageSize:      20,
};

/** @type {Map<string, unknown>} */
const preferences = new Map(Object.entries(DEFAULTS));

/**
 * GET /api/preferences
 *
 * @param {import('@vercel/node').VercelRequest}  req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const data = Object.fromEntries(preferences);
  res.status(200).json(data);
}

// Export the preferences Map for direct use in tests (avoids HTTP round-trips).
export { preferences };
