/**
 * OAuth 2.0 provider helpers — Google and GitHub.
 *
 * Provides:
 *  - Provider configuration lookup
 *  - Authorization URL builder
 *  - Code-for-token exchange
 *  - User-info fetcher (normalises provider-specific shapes)
 *  - Short-lived in-memory state store for CSRF protection
 */

// ---------------------------------------------------------------------------
// Provider configuration
// ---------------------------------------------------------------------------

const PROVIDERS = {
  google: {
    authUrl:     'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl:    'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    clientId:     () => process.env.GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
    scope:        'email profile',
  },
  github: {
    authUrl:     'https://github.com/login/oauth/authorize',
    tokenUrl:    'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    clientId:     () => process.env.GITHUB_CLIENT_ID,
    clientSecret: () => process.env.GITHUB_CLIENT_SECRET,
    scope:        'user:email',
  },
};

/** @type {string[]} */
export const SUPPORTED_PROVIDERS = Object.keys(PROVIDERS);

/**
 * Return provider config or throw for unknown providers.
 * @param {string} provider
 */
export function getProviderConfig(provider) {
  const config = PROVIDERS[provider];
  if (!config) throw new Error(`Unsupported OAuth provider: ${provider}`);
  return config;
}

// ---------------------------------------------------------------------------
// Authorization URL
// ---------------------------------------------------------------------------

/**
 * Build the provider's authorization URL.
 *
 * @param {string} provider      'google' | 'github'
 * @param {string} state         Random CSRF-prevention value
 * @param {string} redirectUri   Where the provider should redirect after auth
 * @returns {string}
 */
export function getAuthorizationUrl(provider, state, redirectUri) {
  const config = getProviderConfig(provider);
  const clientId = config.clientId();
  if (!clientId) {
    throw new Error(`${provider.toUpperCase()}_CLIENT_ID is not configured`);
  }
  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         config.scope,
    state,
  });
  return `${config.authUrl}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Code-for-token exchange
// ---------------------------------------------------------------------------

/**
 * Exchange an authorization code for a provider access token.
 *
 * @param {string} provider
 * @param {string} code
 * @param {string} redirectUri  Must match the URI used in the auth request
 * @returns {Promise<string>}   Provider access token
 */
export async function exchangeCodeForToken(provider, code, redirectUri) {
  const config = getProviderConfig(provider);
  const clientId     = config.clientId();
  const clientSecret = config.clientSecret();
  if (!clientId || !clientSecret) {
    throw new Error(`${provider} OAuth credentials are not configured`);
  }

  const body = new URLSearchParams({
    client_id:     clientId,
    client_secret: clientSecret,
    code,
    redirect_uri:  redirectUri,
    grant_type:    'authorization_code',
  });

  const response = await fetch(config.tokenUrl, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept':        'application/json',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed with status ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error_description ?? data.error);
  }
  return data.access_token;
}

// ---------------------------------------------------------------------------
// User-info fetcher
// ---------------------------------------------------------------------------

/**
 * Fetch user profile from provider and normalise to { id, email, name }.
 *
 * For GitHub, falls back to the /user/emails endpoint when the primary email
 * is not included in the main profile (private email setting).
 *
 * @param {string} provider
 * @param {string} accessToken  Provider access token
 * @returns {Promise<{ id: string, email: string|null, name: string|null }>}
 */
export async function fetchUserInfo(provider, accessToken) {
  const config = getProviderConfig(provider);

  const response = await fetch(config.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent':  'wander-travel-app',
      Accept:        'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`User info request failed with status ${response.status}`);
  }

  const data = await response.json();

  if (provider === 'github') {
    let email = data.email ?? null;
    if (!email) {
      // Private email — fetch the emails list.
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent':  'wander-travel-app',
          Accept:        'application/json',
        },
      });
      if (emailsRes.ok) {
        const emails = await emailsRes.json();
        const primary = emails.find(e => e.primary && e.verified);
        email = primary?.email ?? emails[0]?.email ?? null;
      }
    }
    return {
      id:    String(data.id),
      email,
      name:  data.name ?? data.login ?? null,
    };
  }

  // Google
  return {
    id:    String(data.id),
    email: data.email ?? null,
    name:  data.name ?? null,
  };
}

// ---------------------------------------------------------------------------
// OAuth state store — CSRF protection
// ---------------------------------------------------------------------------

/**
 * @type {Map<string, number>}
 * Key: state UUID  →  Value: expiry timestamp (ms)
 */
const _oauthStates = new Map();

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Generate and store a one-time state value.
 * @returns {string}
 */
export function createOAuthState() {
  const state = crypto.randomUUID();
  _oauthStates.set(state, Date.now() + STATE_TTL_MS);
  return state;
}

/**
 * Verify a state value: must exist and not be expired.
 * Consumes (deletes) the state whether valid or not to prevent replay.
 *
 * @param {string} state
 * @returns {boolean}
 */
export function verifyOAuthState(state) {
  if (!state) return false;
  const expiresAt = _oauthStates.get(state);
  _oauthStates.delete(state);
  if (expiresAt === undefined) return false;
  return Date.now() < expiresAt;
}

/**
 * Clear all pending states — for test isolation only.
 */
export function _resetOAuthStateStore() {
  _oauthStates.clear();
}
