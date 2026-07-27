// /api/favorites — per-user saved destinations + travel guides.
//
//   GET    /api/favorites        → { favorites: [...] } for the signed-in user
//   POST   /api/favorites        → save one; body { id, type, title, url?, region? }
//   DELETE /api/favorites?id=…    → remove one by id (id may also be in the body)
//
// Every method requires a signed-in user, resolved from the session cookie via
// the account/session helpers built in ABCA-886 (getSession + findUserById).
// Anonymous callers get 401 { error } with a machine-readable code so the UI can
// prompt them to sign in rather than block browsing.
import { getSession } from './_lib/sessions.js';
import { findUserById } from './_lib/users.js';
import { getSessionId, readJsonBody, sendJson } from './_lib/http.js';
import { addFavorite, listFavorites, removeFavorite } from './_lib/favorites.js';

// Resolve the signed-in user for this request, or null for anonymous visitors.
async function resolveUser(req) {
  const session = await getSession(getSessionId(req));
  if (!session) return null;
  return findUserById(session.userId);
}

export default async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();
  if (!['GET', 'POST', 'DELETE'].includes(method)) {
    return sendJson(res, 405, { error: 'Method not allowed.' }, { Allow: 'GET, POST, DELETE' });
  }

  const user = await resolveUser(req);
  if (!user) {
    // Not signed in — tell the client to prompt for sign-in (don't block browsing).
    return sendJson(res, 401, {
      error: 'Please sign in to save favorites.',
      code: 'AUTH_REQUIRED',
    });
  }

  try {
    if (method === 'GET') {
      return sendJson(res, 200, { favorites: await listFavorites(user.id) });
    }

    if (method === 'POST') {
      const body = await readJsonBody(req);
      const favorites = await addFavorite(user.id, body);
      return sendJson(res, 200, { favorites });
    }

    // DELETE — id from the query string, falling back to the JSON body.
    const fromQuery = idFromUrl(req.url);
    const id = fromQuery || (await readJsonBody(req)).id;
    if (!id) {
      return sendJson(res, 400, { error: 'A favorite id is required.' });
    }
    const favorites = await removeFavorite(user.id, id);
    return sendJson(res, 200, { favorites });
  } catch (err) {
    if (err.code === 'INVALID_FAVORITE') {
      return sendJson(res, 400, { error: err.message });
    }
    return sendJson(res, 500, { error: 'Something went wrong. Please try again.' });
  }
}

// Pull ?id=… out of a request URL without needing a base for the URL parser.
function idFromUrl(url) {
  if (typeof url !== 'string') return '';
  const q = url.indexOf('?');
  if (q === -1) return '';
  return new URLSearchParams(url.slice(q + 1)).get('id') || '';
}
