/**
 * GET /api/countries
 *
 * Returns the list of available countries. Requires authentication (any role).
 *
 * Response 200: { countries: Array<{ id, name, description, createdBy }> }
 * Response 401: unauthenticated
 * Response 405: wrong method
 */

import { requireUser } from '../_lib/authMiddleware.js';
import { listCountries } from '../_lib/countries.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const authResult = await requireUser(req, res);
  if (!authResult) return;

  return res.status(200).json({ countries: listCountries() });
}
