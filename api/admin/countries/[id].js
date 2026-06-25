/**
 * /api/admin/countries/[id] — Single-resource endpoint (admin-only).
 *
 * GET    — fetch one country by id
 *   Response 200: { country: Country }
 *   Response 404: { error: string }
 *
 * PUT    — full/partial update of a country
 *   Body: { name?: string, code?: string, capital?: string, continent?: string }
 *   Response 200: { country: Country }
 *   Response 400: { error: string }  — validation failure / duplicate code
 *   Response 404: { error: string }  — id not found
 *
 * DELETE — remove a country
 *   Response 200: { message: string }
 *   Response 404: { error: string }
 *
 * Response 401: missing / invalid token
 * Response 403: authenticated but not an admin
 * Response 405: wrong HTTP method
 *
 * NOTE: Vercel passes the dynamic segment via req.query.id.
 */

import { requireAdmin } from '../../_lib/authMiddleware.js';
import { findCountryById, updateCountry, deleteCountry } from '../../_lib/countries.js';

export default async function handler(req, res) {
  // ── Auth guard ─────────────────────────────────────────────────────────────
  const authResult = await requireAdmin(req, res);
  if (!authResult) return; // response already sent (401/403)

  const { id } = req.query ?? {};

  // ── GET ────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const country = findCountryById(id);
    if (!country) return res.status(404).json({ error: `Country not found: ${id}` });
    return res.status(200).json({ country });
  }

  // ── PUT ────────────────────────────────────────────────────────────────────
  if (req.method === 'PUT') {
    const { name, code, capital, continent } = req.body ?? {};
    try {
      const country = updateCountry(id, { name, code, capital, continent });
      if (!country) return res.status(404).json({ error: `Country not found: ${id}` });
      return res.status(200).json({ country });
    } catch (err) {
      return res.status(400).json({ error: err.message ?? 'Failed to update country' });
    }
  }

  // ── DELETE ─────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const deleted = deleteCountry(id);
    if (!deleted) return res.status(404).json({ error: `Country not found: ${id}` });
    return res.status(200).json({ message: `Country ${id} deleted` });
  }

  res.setHeader('Allow', 'GET, PUT, DELETE');
  return res.status(405).json({ error: 'Method Not Allowed' });
}
