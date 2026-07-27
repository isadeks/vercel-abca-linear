// POST /api/login — sign in with email + password.
//
// Body: { email, password }
// On success: opens a session, sets the session cookie, returns the public
// user. On bad credentials returns 401 (without revealing which field failed).
import { authenticate, publicUser } from './_lib/users.js';
import { createSession } from './_lib/sessions.js';
import { buildSessionCookie, readJsonBody, sendJson } from './_lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed.' }, { Allow: 'POST' });
  }
  const { email, password } = await readJsonBody(req);
  try {
    const user = await authenticate(email, password);
    if (!user) {
      return sendJson(res, 401, { error: 'Incorrect email or password.' });
    }
    const session = await createSession(user.id);
    return sendJson(res, 200, { user: publicUser(user) }, {
      'Set-Cookie': buildSessionCookie(session.id),
    });
  } catch {
    return sendJson(res, 500, { error: 'Something went wrong. Please try again.' });
  }
}
