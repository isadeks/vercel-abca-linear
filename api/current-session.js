// GET /api/current-session — who am I? Reads the session cookie and returns the
// signed-in user, or { user: null } for anonymous visitors.
//
// This is what the site nav calls on every page load to decide whether to show
// "Account / Sign out" vs "Sign in". Later personalization features reuse this
// to resolve the current user before reading/writing per-user data.
import { getSession } from './_lib/sessions.js';
import { findUserById, publicUser } from './_lib/users.js';
import { clearSessionCookie, getSessionId, sendJson } from './_lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method not allowed.' }, { Allow: 'GET' });
  }
  const sessionId = getSessionId(req);
  const session = await getSession(sessionId);
  if (!session) {
    // No session (or expired) — make sure a stale cookie is cleared.
    const headers = sessionId ? { 'Set-Cookie': clearSessionCookie() } : {};
    return sendJson(res, 200, { user: null }, headers);
  }
  const user = await findUserById(session.userId);
  if (!user) {
    return sendJson(res, 200, { user: null }, { 'Set-Cookie': clearSessionCookie() });
  }
  return sendJson(res, 200, { user: publicUser(user) });
}
