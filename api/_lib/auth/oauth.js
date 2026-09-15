// OAuth 2.0 helpers for Google and GitHub.
// Builds authorization URLs and exchanges auth codes for user profiles.
// Uses only Node.js built-ins (https module) — no external dependencies.
import { request } from 'node:https';

function httpsPost(url, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const data = JSON.stringify(body);
    const options = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        Accept: 'application/json',
        ...extraHeaders,
      },
    };
    const req = request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { reject(new Error(`Failed to parse response: ${raw}`)); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: { Accept: 'application/json', ...headers },
    };
    const req = request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { reject(new Error(`Failed to parse response: ${raw}`)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ─── Google OAuth ─────────────────────────────────────────────────────────────

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

/**
 * Build the Google OAuth authorization URL.
 * @param {{ redirectUri: string, state?: string }} opts
 * @returns {string}
 */
export function googleAuthUrl({ redirectUri, state = '' }) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'consent',
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange a Google auth code for a user profile.
 * @param {string} code
 * @param {string} redirectUri
 * @returns {Promise<{ id: string, email: string, name: string }>}
 */
export async function exchangeGoogleCode(code, redirectUri) {
  const tokenRes = await httpsPost(GOOGLE_TOKEN_URL, {
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  if (tokenRes.error) throw new Error(`Google token error: ${tokenRes.error_description}`);

  const userinfo = await httpsGet(GOOGLE_USERINFO_URL, {
    Authorization: `Bearer ${tokenRes.access_token}`,
  });
  if (!userinfo.sub) throw new Error('Google userinfo missing sub');

  return { id: userinfo.sub, email: userinfo.email, name: userinfo.name };
}

// ─── GitHub OAuth ─────────────────────────────────────────────────────────────

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_EMAIL_URL = 'https://api.github.com/user/emails';

/**
 * Build the GitHub OAuth authorization URL.
 * @param {{ redirectUri: string, state?: string }} opts
 * @returns {string}
 */
export function githubAuthUrl({ redirectUri, state = '' }) {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID || '',
    redirect_uri: redirectUri,
    scope: 'read:user user:email',
    state,
  });
  return `${GITHUB_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange a GitHub auth code for a user profile.
 * @param {string} code
 * @param {string} redirectUri
 * @returns {Promise<{ id: string, email: string, name: string }>}
 */
export async function exchangeGithubCode(code, redirectUri) {
  const tokenRes = await httpsPost(GITHUB_TOKEN_URL, {
    code,
    client_id: process.env.GITHUB_CLIENT_ID,
    client_secret: process.env.GITHUB_CLIENT_SECRET,
    redirect_uri: redirectUri,
  });
  if (tokenRes.error) throw new Error(`GitHub token error: ${tokenRes.error_description}`);

  const userProfile = await httpsGet(GITHUB_USER_URL, {
    Authorization: `Bearer ${tokenRes.access_token}`,
    'User-Agent': 'wander-app',
  });

  let email = userProfile.email;
  if (!email) {
    const emails = await httpsGet(GITHUB_EMAIL_URL, {
      Authorization: `Bearer ${tokenRes.access_token}`,
      'User-Agent': 'wander-app',
    });
    const primary = emails.find((e) => e.primary && e.verified);
    email = primary ? primary.email : (emails[0] ? emails[0].email : null);
  }
  if (!email) throw new Error('GitHub account has no accessible email address');

  return { id: String(userProfile.id), email, name: userProfile.name || userProfile.login };
}
