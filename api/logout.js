// POST /api/logout — sign out: destroy the session and clear the cookie.
//
// Idempotent: returns 200 even if there was no active session.
import { destroySession } from './_lib/sessions.js';
import { clearSessionCookie, getSessionId, sendJson } from './_lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed.' }, { Allow: 'POST' });
  }
  const sessionId = getSessionId(req);
  if (sessionId) await destroySession(sessionId);
  return sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie() });
}
