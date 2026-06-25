/**
 * GET /api/auth/oauth-init?provider=google|github
 *
 * Redirects the browser to the OAuth provider's authorization page.
 * Generates a one-time state parameter for CSRF protection.
 *
 * Query params:
 *   provider   'google' | 'github'  (required)
 *
 * On success: 302 redirect to provider authorization URL
 * On error:   400 JSON { error: string }
 */
import { getAuthorizationUrl, createOAuthState, SUPPORTED_PROVIDERS } from '../_lib/oauth.js';
import { handleCors } from '../_lib/middleware.js';

/**
 * Derive the callback URL from the incoming request's host.
 * In production on Vercel the NEXT_PUBLIC_BASE_URL / VERCEL_URL env vars
 * are available; fall back to the request Host header for local dev.
 *
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

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const provider = req.query?.provider;
  if (!provider || !SUPPORTED_PROVIDERS.includes(provider)) {
    return res.status(400).json({
      error: `provider must be one of: ${SUPPORTED_PROVIDERS.join(', ')}`,
    });
  }

  try {
    const state       = createOAuthState();
    const redirectUri = buildCallbackUrl(req, provider);
    const authUrl     = getAuthorizationUrl(provider, state, redirectUri);

    res.setHeader('Location', authUrl);
    return res.status(302).end();
  } catch (err) {
    if (err.message?.includes('not configured')) {
      return res.status(503).json({ error: err.message });
    }
    console.error('[oauth-init] unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
