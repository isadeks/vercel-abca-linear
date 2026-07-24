// /api/quiz-results — persist + review the "Where Should I Go?" quiz outcome
// for a signed-in visitor.
//
//   GET  → { results: [...] }   the signed-in user's saved results, newest first
//   POST → { result: {...} }    save a completed result for the signed-in user
//
// Body (POST): { destinationId, destinationName?, destinationRegion?,
//                destinationCountry?, score, answers? }
//
// Both methods require a valid session. Anonymous visitors get 401 — the quiz
// itself still works for them, the client simply doesn't call this endpoint
// (nothing is saved), so their experience is unaffected.
import { getSession } from './_lib/sessions.js';
import { findUserById } from './_lib/users.js';
import { getSessionId, readJsonBody, sendJson } from './_lib/http.js';
import { saveQuizResult, listQuizResults } from './_lib/quiz-results.js';

// Resolve the signed-in user from the session cookie, or null if anonymous.
async function currentUser(req) {
  const session = await getSession(getSessionId(req));
  if (!session) return null;
  return findUserById(session.userId);
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed.' }, { Allow: 'GET, POST' });
  }

  const user = await currentUser(req);
  if (!user) {
    return sendJson(res, 401, { error: 'You must be signed in to save or view quiz results.' });
  }

  if (req.method === 'GET') {
    const results = await listQuizResults(user.id);
    return sendJson(res, 200, { results });
  }

  // POST — save a completed result.
  const body = await readJsonBody(req);
  try {
    const result = await saveQuizResult(user.id, body);
    return sendJson(res, 201, { result });
  } catch (err) {
    const status = err.code === 'INVALID_RESULT' ? 400 : 500;
    return sendJson(res, status, {
      error: status === 400 ? err.message : 'Something went wrong. Please try again.',
    });
  }
}
