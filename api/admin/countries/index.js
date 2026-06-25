/**
 * Admin country-management endpoint.
 *
 * GET  /api/admin/countries — list all countries (admin only)
 * POST /api/admin/countries — create a new country (admin only)
 *
 * POST body: { name: string, description?: string }
 *
 * Response 200 (GET): { countries: Array<{ id, name, description, createdBy }> }
 * Response 201 (POST): { country: { id, name, description, createdBy } }
 * Response 400: validation error
 * Response 401: unauthenticated
 * Response 403: insufficient permissions (non-admin)
 * Response 405: wrong method
 * Response 409: country already exists
 */

import { requireAdmin } from '../../_lib/authMiddleware.js';
import { listCountries, createCountry } from '../../_lib/countries.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const authResult = await requireAdmin(req, res);
  if (!authResult) return;

  if (req.method === 'GET') {
    return res.status(200).json({ countries: listCountries() });
  }

  // POST — create a country
  const { name, description } = req.body ?? {};
  try {
    const country = createCountry({ name, description, createdBy: authResult.user.id });
    return res.status(201).json({ country });
  } catch (err) {
    const message = err.message ?? 'Failed to create country';
    const status = message.toLowerCase().includes('already exists') ? 409 : 400;
    return res.status(status).json({ error: message });
  }
}
