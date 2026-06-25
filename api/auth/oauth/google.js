// GET  /api/auth/oauth/google         — redirect to Google OAuth
// GET  /api/auth/oauth/google?code=…  — OAuth callback
import { googleAuthUrl, exchangeGoogleCode } from '../../_lib/auth/oauth.js';
import { findUserByOAuth, findUserByEmail, createUser, updateUser } from '../../_lib/auth/users.js';
import { issueTokens } from '../../_lib/auth/sessions.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { code, state } = req.query ?? {};
  const redirectUri = `${process.env.APP_URL ?? ''}/api/auth/oauth/google`;

  // ── Step 1: redirect to Google ─────────────────────────────────────────────
  if (!code) {
    const url = googleAuthUrl({ redirectUri, state: state ?? '' });
    return res.redirect(302, url);
  }

  // ── Step 2: handle callback ────────────────────────────────────────────────
  try {
    const profile = await exchangeGoogleCode(code, redirectUri);

    let user = findUserByOAuth('google', profile.id);
    if (!user) {
      user = findUserByEmail(profile.email);
      if (user) {
        // Link Google to existing account
        updateUser(user.id, {
          oauthProviders: { ...user.oauthProviders, google: profile.id },
        });
        user = { ...user, oauthProviders: { ...user.oauthProviders, google: profile.id } };
      } else {
        user = createUser({ email: profile.email, oauthProviders: { google: profile.id } });
      }
    }

    const tokens = issueTokens(user);
    return res.status(200).json({ user: { id: user.id, email: user.email, roles: user.roles }, ...tokens });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}
