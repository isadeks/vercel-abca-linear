// Vercel Serverless Function — /api/auth/logout
//
// Destroys the user's session:
//   1. Reads the session cookie to identify the user.
//   2. Deletes the session from the store.
//   3. Clears the cookie and redirects to the home page.
//
// Required env vars:
//   JWT_SECRET — used to verify the access token and extract userId

import { parseCookies } from '../_lib/oauth.js';
import { validateAccessToken, deleteSession } from '../_lib/session.js';

export default async function handler(req, res) {
  const cookies     = parseCookies(req.headers.cookie);
  const accessToken = cookies.session;

  if (accessToken) {
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret) {
      try {
        const payload = validateAccessToken(accessToken, jwtSecret);
        await deleteSession(payload.sub);
      } catch {
        // Token invalid / expired — clear the cookie anyway.
      }
    }
  }

  res.setHeader('Set-Cookie', [
    'session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax',
  ]);

  res.redirect(302, '/');
}
