/**
 * /api/notify/email  — Vercel serverless function
 *
 * POST /api/notify/email
 *
 * Accepts a notification request, renders the appropriate email template,
 * enqueues the rendered email for async dispatch, and returns 202 Accepted
 * immediately so the caller is never blocked on mail delivery.
 *
 * Request body (JSON):
 * {
 *   "to":       "guest@example.com",       // required
 *   "template": "booking_confirmation",    // required — see TEMPLATES enum
 *   "data": {                              // required — template variables
 *     "guestName": "Alice",
 *     "bookingRef": "WND-0042",
 *     ...
 *   }
 * }
 *
 * Responses:
 *   202  { "ok": true,  "jobId": "<id>",  "message": "Email queued." }
 *   400  { "ok": false, "error": "<reason>" }
 *   405  { "ok": false, "error": "Method not allowed." }
 *   500  { "ok": false, "error": "<reason>" }
 */

import { renderTemplate } from '../_lib/email-templates.js';
import { emailQueue } from '../_lib/email-queue.js';
import { emailAllowed } from '../_lib/notificationsContext.js';

/**
 * Vercel serverless handler.
 *
 * @param {import('http').IncomingMessage & { body?: unknown }} req
 * @param {import('http').ServerResponse} res
 */
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed.' }));
    return;
  }

  // Vercel runtime parses JSON bodies automatically when the Content-Type is
  // application/json; fall back to manual parsing if req.body is absent.
  let body;
  try {
    body = await parseBody(req);
  } catch (err) {
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, error: `Invalid JSON: ${err.message}` }));
    return;
  }

  // Validate required fields
  const { to, template, data, userId } = body ?? {};

  if (!to || typeof to !== 'string' || !to.includes('@')) {
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, error: '"to" must be a valid email address.' }));
    return;
  }

  if (!template || typeof template !== 'string') {
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, error: '"template" is required and must be a string.' }));
    return;
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, error: '"data" must be a non-null object.' }));
    return;
  }

  // Check notification preference gate when userId is provided.
  const uid = typeof userId === 'string' && userId.trim() ? userId.trim() : null;
  if (uid && !emailAllowed(uid, template)) {
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, skipped: true, reason: 'User preference disables this email type.' }));
    return;
  }

  // Render template
  let rendered;
  try {
    rendered = renderTemplate(template, data);
  } catch (err) {
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, error: err.message }));
    return;
  }

  // Enqueue
  let job;
  try {
    job = emailQueue.enqueue({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: `Queue error: ${err.message}` }));
    return;
  }

  res.statusCode = 202;
  res.end(JSON.stringify({ ok: true, jobId: job.id, message: 'Email queued.' }));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Reads and parses the request body as JSON.
 * Works with both Vercel's pre-parsed bodies and raw Node streams.
 *
 * @param {import('http').IncomingMessage & { body?: unknown }} req
 * @returns {Promise<unknown>}
 */
async function parseBody(req) {
  if (req.body !== undefined) {
    // Vercel / Next.js already parsed the body.
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }

  // Read raw stream.
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}
