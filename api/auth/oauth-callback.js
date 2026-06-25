/**
 * GET /api/auth/oauth-callback?provider=google|github&code=...&state=...
 *
 * OAuth 2.0 callback handler.  Exchanges the authorization code for a
 * provider access token, fetches user info, upserts the User record, and
 * establishes a session (access token + refresh token cookie).
 *
 * On success:  302 redirect to /login.html#token=<accessToken>
 *              (the fragment is never sent to the server — safe for
 *               single-page pickup; swap for a full redirect in a Next.js app)
 * On error:    302 redirect to /login.html?error=<message>
 *
 * Query params:
 *   provider   'google' | 'github'
 *   code       Authorization code from provider
 *   state      One-time CSRF value issued by /api/auth/oauth-init
 *   error      (Optional) Provider error code — handled as auth denial
 */
import { exchangeCodeForToken, fetchUserInfo, verifyOAuthState, SUPPORTED_PROVIDERS } from '../_lib/oauth.js';
import { upsertOAuthUser } from '../_lib/user.js';
import { createAccessToken, createRefreshToken, buildRefreshTokenCookie } from '../_lib/session.js';
import { handleCors } from '../_lib/middleware.js';

/**
 * Derive the callback URL (must exactly match the value used in oauth-init).
 * @param {import('http').IncomingMessage} req
 * @param {string} provider
 * @returns {string}
 */
function buildCallbackUrl(req, provider) {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    `http://${req.headers?.host ?? 'localhost:3000'}`;
  return `${base}/api/auth/oauth-callback?provider=${provider}`;
}

/**
 * Build the login page URL, appending an error query param.
 * @param {import('http').IncomingMessage} req
 * @param {string} message
 * @returns {string}
 */
function errorRedirectUrl(req, message) {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    `http://${req.headers?.host ?? 'localhost:3000'}`;
  return `${base}/login.html?error=${encodeURIComponent(message)}`;
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { provider, code, state, error: providerError } = req.query ?? {};

  // Provider-sent error (user denied access, etc.)
  if (providerError) {
    res.setHeader('Location', errorRedirectUrl(req, providerError));
    return res.status(302).end();
  }

  // Validate provider
  if (!provider || !SUPPORTED_PROVIDERS.includes(provider)) {
    res.setHeader('Location', errorRedirectUrl(req, 'Invalid provider'));
    return res.status(302).end();
  }

  // Validate state (CSRF)
  if (!verifyOAuthState(state)) {
    res.setHeader('Location', errorRedirectUrl(req, 'Invalid or expired state parameter'));
    return res.status(302).end();
  }

  if (!code) {
    res.setHeader('Location', errorRedirectUrl(req, 'Missing authorization code'));
    return res.status(302).end();
  }

  try {
    const redirectUri  = buildCallbackUrl(req, provider);
    const accessToken  = await exchangeCodeForToken(provider, code, redirectUri);
    const profile      = await fetchUserInfo(provider, accessToken);

    if (!profile.email) {
      res.setHeader('Location', errorRedirectUrl(req, 'Could not retrieve email from provider'));
      return res.status(302).end();
    }

    const user = upsertOAuthUser({
      email:          profile.email,
      provider,
      providerUserId: profile.id,
    });

    const [jwtAccessToken, { token: refreshToken, expiresAt }] = await Promise.all([
      createAccessToken(user),
      Promise.resolve(createRefreshToken(user)),
    ]);

    res.setHeader('Set-Cookie', buildRefreshTokenCookie(refreshToken, expiresAt));

    // Redirect to login page — JS picks up the token from the fragment.
    const base =
      process.env.NEXT_PUBLIC_BASE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
      `http://${req.headers?.host ?? 'localhost:3000'}`;
    res.setHeader('Location', `${base}/login.html#token=${encodeURIComponent(jwtAccessToken)}`);
    return res.status(302).end();
  } catch (err) {
    console.error('[oauth-callback] unexpected error:', err);
    res.setHeader('Location', errorRedirectUrl(req, 'Authentication failed'));
    return res.status(302).end();
  }
}
