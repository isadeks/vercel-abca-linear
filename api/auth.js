/**
 * /api/auth — Authentication route.
 *
 * Vercel serverless function (ESM, Node.js 18+).
 *
 * Supported actions (request body field `action`):
 *
 *   POST /api/auth  { action: "signup",  email, password, confirmPassword, displayName }
 *   POST /api/auth  { action: "signin",  email, password }
 *   POST /api/auth  { action: "signout" }
 *   GET  /api/auth                       → returns the current session (or 401)
 *
 * Responses: JSON  { ok, message?, user?, errors? }
 */

import {
  createUser,
  authenticateUser,
  findUserByEmail,
  validateAuthInputs,
} from './_lib/users.js';

import {
  serializeSessionCookie,
  clearSessionCookie,
  getSession,
} from './_lib/session.js';

// ── Handler ────────────────────────────────────────────────────────────────

export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET') {
    return handleGetSession(req, res);
  }

  if (req.method === 'POST') {
    return handlePost(req, res);
  }

  res.status(405).json({ ok: false, message: 'Method not allowed.' });
}

// ── GET /api/auth ──────────────────────────────────────────────────────────

function handleGetSession(req, res) {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ ok: false, message: 'No active session.' });
  }

  const user = findUserByEmail(session.sub);
  if (!user) {
    // Session token valid but user was deleted; clear cookie
    res.setHeader('Set-Cookie', clearSessionCookie());
    return res.status(401).json({ ok: false, message: 'Session expired or user not found.' });
  }

  return res.status(200).json({ ok: true, user });
}

// ── POST /api/auth ─────────────────────────────────────────────────────────

async function handlePost(req, res) {
  let body;
  try {
    body = await parseBody(req);
  } catch {
    return res.status(400).json({ ok: false, message: 'Invalid request body.' });
  }

  const { action } = body ?? {};

  switch (action) {
    case 'signup':
      return handleSignup(body, res);
    case 'signin':
      return handleSignin(body, res);
    case 'signout':
      return handleSignout(res);
    default:
      return res.status(400).json({ ok: false, message: `Unknown action: "${action}".` });
  }
}

// ── Action handlers ────────────────────────────────────────────────────────

function handleSignup(body, res) {
  const { email, password, confirmPassword, displayName } = body;

  // Pre-validate so we can return all errors at once
  const errors = validateAuthInputs(
    (email ?? '').trim().toLowerCase(),
    password,
    { confirmPassword, displayName },
  );
  if (errors.length) {
    return res.status(422).json({ ok: false, errors });
  }

  const result = createUser({ email, password, displayName });
  if (!result.ok) {
    return res.status(422).json({ ok: false, errors: result.errors });
  }

  res.setHeader('Set-Cookie', serializeSessionCookie({ email: result.user.email }));
  return res.status(201).json({ ok: true, message: 'Account created.', user: result.user });
}

function handleSignin(body, res) {
  const { email, password } = body;

  const result = authenticateUser({ email, password });
  if (!result.ok) {
    return res.status(401).json({ ok: false, errors: result.errors });
  }

  res.setHeader('Set-Cookie', serializeSessionCookie({ email: result.user.email }));
  return res.status(200).json({ ok: true, message: 'Signed in.', user: result.user });
}

function handleSignout(res) {
  res.setHeader('Set-Cookie', clearSessionCookie());
  return res.status(200).json({ ok: true, message: 'Signed out.' });
}

// ── Body parser ────────────────────────────────────────────────────────────

/**
 * Parse JSON body from an IncomingMessage. Vercel pre-parses JSON bodies
 * and exposes them as `req.body`, so we check that first for compatibility.
 * @param {import('http').IncomingMessage & { body?: unknown }} req
 * @returns {Promise<object>}
 */
function parseBody(req) {
  if (req.body !== undefined) {
    return Promise.resolve(typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
  }
  return new Promise((resolve, reject) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}
