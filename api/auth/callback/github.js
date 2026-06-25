// Vercel Serverless Function — /api/auth/callback/github
//
// Handles the GitHub OAuth callback:
//   1. Verifies the CSRF state parameter.
//   2. Exchanges the authorization code for an access token.
//   3. Fetches the user's GitHub profile (with email fallback).
//   4. Finds or creates the user (account-linking when email matches).
//   5. Creates a session and sets the access token in a HttpOnly cookie.
//   6. Redirects to the home page (or an error page on failure).
//
// Required env vars:
//   GITHUB_CLIENT_ID
//   GITHUB_CLIENT_SECRET
//   NEXT_PUBLIC_BASE_URL
//   JWT_SECRET              — shared with the session module

import {
  parseCookies,
  exchangeGitHubCode,
  fetchGitHubProfile,
} from '../../_lib/oauth.js';
import { findOrCreateOAuthUser } from '../../_lib/oauth-account.js';
import { createSession } from '../../_lib/session.js';

export default async function handler(req, res) {
  const { code, state, error } = req.query ?? {};

  // Provider-level error (e.g. user denied access).
  if (error) {
    res.redirect(302, `/?auth_error=${encodeURIComponent(error)}`);
    return;
  }

  if (!code || !state) {
    res.redirect(302, '/?auth_error=missing_params');
    return;
  }

  // ── CSRF state verification ───────────────────────────────────────────────
  const cookies = parseCookies(req.headers.cookie);
  if (!cookies.oauth_state || cookies.oauth_state !== state) {
    res.redirect(302, '/?auth_error=invalid_state');
    return;
  }

  const clientId     = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const baseUrl      = process.env.NEXT_PUBLIC_BASE_URL ?? '';
  const jwtSecret    = process.env.JWT_SECRET;
  const redirectUri  = `${baseUrl}/api/auth/callback/github`;

  if (!clientId || !clientSecret || !jwtSecret) {
    res.status(500).json({ error: 'OAuth not fully configured (missing env vars).' });
    return;
  }

  try {
    // ── Code exchange ─────────────────────────────────────────────────────
    const tokens  = await exchangeGitHubCode(code, clientId, clientSecret, redirectUri);
    const profile = await fetchGitHubProfile(tokens.access_token);

    // ── Find or create user ───────────────────────────────────────────────
    const { userId } = await findOrCreateOAuthUser('github', profile.id, profile);

    // ── Create session ────────────────────────────────────────────────────
    const session = await createSession(userId, jwtSecret);

    // Clear the state cookie and set the session access token.
    res.setHeader('Set-Cookie', [
      'oauth_state=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax',
      `session=${session.accessToken}; HttpOnly; Path=/; Max-Age=900; SameSite=Lax`,
    ]);

    res.redirect(302, '/');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.redirect(302, `/?auth_error=${encodeURIComponent(msg)}`);
  }
}
