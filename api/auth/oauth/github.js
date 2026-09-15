// GET  /api/auth/oauth/github         — redirect to GitHub OAuth
// GET  /api/auth/oauth/github?code=…  — OAuth callback
import { githubAuthUrl, exchangeGithubCode } from '../../_lib/auth/oauth.js';
import { findUserByOAuth, findUserByEmail, createUser, updateUser } from '../../_lib/auth/users.js';
import { issueTokens } from '../../_lib/auth/sessions.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { code, state } = req.query ?? {};
  const redirectUri = `${process.env.APP_URL ?? ''}/api/auth/oauth/github`;

  // ── Step 1: redirect to GitHub ─────────────────────────────────────────────
  if (!code) {
    const url = githubAuthUrl({ redirectUri, state: state ?? '' });
    return res.redirect(302, url);
  }

  // ── Step 2: handle callback ────────────────────────────────────────────────
  try {
    const profile = await exchangeGithubCode(code, redirectUri);

    let user = findUserByOAuth('github', profile.id);
    if (!user) {
      user = findUserByEmail(profile.email);
      if (user) {
        updateUser(user.id, {
          oauthProviders: { ...user.oauthProviders, github: profile.id },
        });
        user = { ...user, oauthProviders: { ...user.oauthProviders, github: profile.id } };
      } else {
        user = createUser({ email: profile.email, oauthProviders: { github: profile.id } });
      }
    }

    const tokens = issueTokens(user);
    return res.status(200).json({ user: { id: user.id, email: user.email, roles: user.roles }, ...tokens });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}
