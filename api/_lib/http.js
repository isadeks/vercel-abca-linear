// HTTP helpers shared by the auth serverless functions: cookie parsing,
// Set-Cookie building, JSON body reading, and JSON responses.
//
// Framework-free — works with the raw (req, res) Node objects that Vercel
// serverless functions receive.
import { SESSION_TTL_MS } from './sessions.js';

export const SESSION_COOKIE = 'wander_session';

// Parse a Cookie header into a { name: value } object.
export function parseCookies(req) {
  const header = req.headers?.cookie || '';
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (name) out[name] = decodeURIComponent(value);
  }
  return out;
}

export function getSessionId(req) {
  return parseCookies(req)[SESSION_COOKIE] || null;
}

// Build a Set-Cookie string for the session. `maxAgeMs = 0` expires it (logout).
// HttpOnly (no JS access) + SameSite=Lax + Secure (in production) hardens it
// against XSS/CSRF token theft.
export function buildSessionCookie(token, maxAgeMs = SESSION_TTL_MS) {
  const secure = process.env.NODE_ENV === 'production';
  const maxAge = Math.floor(maxAgeMs / 1000);
  const attrs = [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (secure) attrs.push('Secure');
  if (maxAgeMs === 0) attrs.push('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  return attrs.join('; ');
}

export function clearSessionCookie() {
  return buildSessionCookie('', 0);
}

// Read + JSON-parse a request body. Vercel usually pre-parses `req.body`, but we
// tolerate a raw stream too so the helpers work in tests and other runtimes.
export async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.length) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

export function sendJson(res, status, payload, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(payload));
}
