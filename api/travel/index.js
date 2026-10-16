/**
 * Travel bookings endpoint for the authenticated user.
 *
 * GET  /api/travel — list the caller's travel records
 * POST /api/travel — create a new travel booking
 *
 * POST body: { countryId: string }
 *
 * Response 200 (GET): { records: Array<{ id, userId, countryId, status, createdAt }> }
 * Response 201 (POST): { record: { id, userId, countryId, status, createdAt } }
 * Response 400: validation error
 * Response 401: unauthenticated
 * Response 404: countryId not found
 * Response 405: wrong method
 */

import { requireUser } from '../_lib/authMiddleware.js';
import { findCountryById } from '../_lib/countries.js';
import { createTravel, listTravelByUser } from '../_lib/travel.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const authResult = await requireUser(req, res);
  if (!authResult) return;

  const { user } = authResult;

  if (req.method === 'GET') {
    return res.status(200).json({ records: listTravelByUser(user.id) });
  }

  // POST — create a booking
  const { countryId } = req.body ?? {};
  if (!countryId) {
    return res.status(400).json({ error: 'countryId is required' });
  }

  if (!findCountryById(countryId)) {
    return res.status(404).json({ error: `Country not found: ${countryId}` });
  }

  try {
    const record = createTravel({ userId: user.id, countryId });
    return res.status(201).json({ record });
  } catch (err) {
    return res.status(400).json({ error: err.message ?? 'Failed to create travel record' });
  }
}
