// POST /api/signup — register a new account (email + password) and sign in.
//
// Body: { email, password }
// On success: creates the user, opens a session, sets the session cookie, and
// returns the public user. On conflict/validation error returns a 4xx.
import { createUser, publicUser } from './_lib/users.js';
import { createSession } from './_lib/sessions.js';
import { buildSessionCookie, readJsonBody, sendJson } from './_lib/http.js';

const STATUS_BY_CODE = {
  INVALID_EMAIL: 400,
  WEAK_PASSWORD: 400,
  EMAIL_TAKEN: 409,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed.' }, { Allow: 'POST' });
  }
  const { email, password } = await readJsonBody(req);
  try {
    const user = await createUser(email, password);
    const session = await createSession(user.id);
    return sendJson(res, 201, { user: publicUser(user) }, {
      'Set-Cookie': buildSessionCookie(session.id),
    });
  } catch (err) {
    const status = STATUS_BY_CODE[err.code] || 500;
    return sendJson(res, status, {
      error: status === 500 ? 'Something went wrong. Please try again.' : err.message,
    });
  }
}
