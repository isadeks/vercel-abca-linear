/**
 * POST /api/account/password
 *
 * Change the authenticated user's password.
 *
 * Request body (JSON)
 * ───────────────────
 * {
 *   "userId":          "<string>",  // user performing the change
 *   "currentPassword": "<string>",  // must match stored passwordHash
 *   "newPassword":     "<string>",  // minimum 8 characters
 *   "confirmPassword": "<string>"   // must equal newPassword
 * }
 *
 * Responses
 * ─────────
 *   200  { "ok": true }
 *   400  { "error": "<message>", "code": "<error code>" }
 *        Codes: PASSWORD_MISMATCH | PASSWORD_TOO_SHORT | WRONG_CURRENT_PASSWORD | INVALID_REQUEST
 *   404  { "error": "User not found.", "code": "USER_NOT_FOUND" }
 *   405  Method Not Allowed
 */

import { changePassword } from '../_lib/password.js';

/** Maps business-logic error codes to HTTP status codes. */
const STATUS_FOR_CODE = {
  USER_NOT_FOUND: 404,
  WRONG_CURRENT_PASSWORD: 400,
  PASSWORD_MISMATCH: 400,
  PASSWORD_TOO_SHORT: 400,
};

/**
 * Vercel / Node serverless handler.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse}  res
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed.' }));
    return;
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body;
  try {
    const raw = await readBody(req);
    body = JSON.parse(raw);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid JSON body.', code: 'INVALID_REQUEST' }));
    return;
  }

  const { userId, currentPassword, newPassword, confirmPassword } = body ?? {};

  if (!userId || !currentPassword || !newPassword || !confirmPassword) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'userId, currentPassword, newPassword, and confirmPassword are all required.',
      code: 'INVALID_REQUEST',
    }));
    return;
  }

  // ── Business logic ────────────────────────────────────────────────────────
  try {
    const result = changePassword(userId, currentPassword, newPassword, confirmPassword);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } catch (err) {
    const status = STATUS_FOR_CODE[err.code] ?? 400;
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message, code: err.code }));
  }
}

/** Read the full request body as a UTF-8 string. */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
