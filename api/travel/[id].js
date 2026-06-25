/**
 * Single travel record endpoint.
 *
 * GET    /api/travel/:id — view a specific record (owner or admin)
 * DELETE /api/travel/:id — cancel a specific record (owner only)
 *
 * Response 200 (GET): { record: { id, userId, countryId, status, createdAt } }
 * Response 200 (DELETE): { record: { ...updated } }
 * Response 401: unauthenticated
 * Response 403: caller does not own the record
 * Response 404: record not found
 * Response 405: wrong method
 */

import { requireUser } from '../_lib/authMiddleware.js';
import { findTravelById, cancelTravel } from '../_lib/travel.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'GET, DELETE');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const authResult = await requireUser(req, res);
  if (!authResult) return;

  const { user } = authResult;
  const id = req.query?.id;

  const record = findTravelById(id);
  if (!record) {
    return res.status(404).json({ error: `Travel record not found: ${id}` });
  }

  // Admins can view any record; regular users can only see their own
  if (record.userId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: you do not own this record' });
  }

  if (req.method === 'GET') {
    return res.status(200).json({ record });
  }

  // DELETE — cancel the record (owner only, even for admins acting on others' records)
  if (record.userId !== user.id) {
    return res.status(403).json({ error: 'Forbidden: only the owner can cancel a travel record' });
  }

  try {
    const updated = cancelTravel(id);
    return res.status(200).json({ record: updated });
  } catch (err) {
    return res.status(400).json({ error: err.message ?? 'Failed to cancel travel record' });
  }
}
