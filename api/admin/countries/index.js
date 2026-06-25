/**
 * /api/admin/countries — Collection endpoint (admin-only).
 *
 * GET  — list all countries
 *   Response 200: { countries: Country[] }
 *
 * POST — create a new country
 *   Body: { name: string, code: string, capital?: string, continent?: string }
 *   Response 201: { country: Country }
 *   Response 400: { error: string }  — validation failure / duplicate code
 *
 * Response 401: missing / invalid token
 * Response 403: authenticated but not an admin
 * Response 405: wrong HTTP method
 */

import { requireAdmin } from '../../_lib/authMiddleware.js';
import { listCountries, createCountry } from '../../_lib/countries.js';

export default async function handler(req, res) {
  // ── Auth guard ─────────────────────────────────────────────────────────────
  const authResult = await requireAdmin(req, res);
  if (!authResult) return; // response already sent (401/403)

  // ── Route ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    return res.status(200).json({ countries: listCountries() });
  }

  if (req.method === 'POST') {
    const { name, code, capital, continent } = req.body ?? {};
    try {
      const country = createCountry({ name, code, capital, continent });
      return res.status(201).json({ country });
    } catch (err) {
      return res.status(400).json({ error: err.message ?? 'Failed to create country' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method Not Allowed' });
}
