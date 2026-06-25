// Vercel Serverless Function — /api/auth/github
//
// Initiates the GitHub OAuth flow:
//   1. Generates a random CSRF state token.
//   2. Sets it in a short-lived HttpOnly cookie (`oauth_state`).
//   3. Redirects the user to GitHub's authorization endpoint.
//
// Required env vars:
//   GITHUB_CLIENT_ID       — from GitHub OAuth App settings
//   NEXT_PUBLIC_BASE_URL   — e.g. https://wander.example.com  (no trailing slash)

import { generateState, buildGitHubAuthUrl } from '../_lib/oauth.js';

export default function handler(req, res) {
  const clientId    = process.env.GITHUB_CLIENT_ID;
  const baseUrl     = process.env.NEXT_PUBLIC_BASE_URL ?? '';
  const redirectUri = `${baseUrl}/api/auth/callback/github`;

  if (!clientId) {
    res.status(500).json({ error: 'GITHUB_CLIENT_ID is not configured.' });
    return;
  }

  const state   = generateState();
  const authUrl = buildGitHubAuthUrl(state, clientId, redirectUri);

  // Store state in a 5-minute HttpOnly cookie so the callback can verify it.
  res.setHeader('Set-Cookie', [
    `oauth_state=${state}; HttpOnly; Path=/; Max-Age=300; SameSite=Lax`,
  ]);

  res.redirect(302, authUrl);
}
