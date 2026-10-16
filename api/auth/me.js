/**
 * GET /api/auth/me
 *
 * Returns the currently authenticated user's public profile.
 * Requires a valid Bearer access token in the Authorization header.
 *
 * Response: { id: string, email: string, role: string }
 */
import { requireAuth, handleCors } from '../_lib/middleware.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const payload = await requireAuth(req, res);
  if (!payload) return; // 401 already sent
  return res.status(200).json({ id: payload.sub, email: payload.email, role: payload.role ?? 'viewer' });
}
