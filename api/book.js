// api/book.js — Vercel Function implementing POST /api/book.
//
// This is a thin transport shell: it parses the request, delegates all domain
// work to the tested modules under api/_lib/, emits one sanitized log event,
// and shapes the HTTP response. No business logic lives here.
//
// Contract
// --------
// POST /api/book
//   Request body (JSON):
//     { destinationId, checkIn, checkOut, rooms, guests, email }
//   Responses:
//     200 { ok: true, requestId, quote: {...} }
//     400 { ok: false, requestId, error: { reason, message } }
//     405 { ok: false, requestId, error: { reason: 'method_not_allowed', message } }
// Every response carries a `requestId` (also emitted in the log event) so a
// browser request can be correlated with the Vercel runtime logs.

import { createQuote, generateRequestId } from './_lib/booking.js';
import { logQuoteCreated, logQuoteRejected } from './_lib/logging.js';

/**
 * Reads and JSON-parses the request body across the shapes Vercel/Node may
 * hand us: an already-parsed object, a string, or a raw stream. Returns
 * `{ ok, body }`; `ok:false` means the payload wasn't valid JSON.
 */
async function readJsonBody(req) {
  // Vercel often pre-parses JSON into req.body.
  if (req.body !== undefined && req.body !== null && typeof req.body === 'object') {
    return { ok: true, body: req.body };
  }

  let raw = '';
  if (typeof req.body === 'string') {
    raw = req.body;
  } else if (typeof req[Symbol.asyncIterator] === 'function') {
    for await (const chunk of req) {
      raw += chunk;
    }
  }

  if (raw.trim() === '') {
    return { ok: true, body: {} };
  }
  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false, body: null };
  }
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  const startedAt = Date.now();
  const requestId = generateRequestId();

  // Correlation header on every response, including method rejections.
  res.setHeader('X-Request-Id', requestId);

  // Method guard — only POST is allowed.
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    logQuoteRejected({
      requestId,
      status: 405,
      reason: 'method_not_allowed',
      durationMs: Date.now() - startedAt,
    });
    return sendJson(res, 405, {
      ok: false,
      requestId,
      error: {
        reason: 'method_not_allowed',
        message: 'Only POST is supported for /api/book.',
      },
    });
  }

  // Body parsing.
  const parsed = await readJsonBody(req);
  if (!parsed.ok) {
    logQuoteRejected({
      requestId,
      status: 400,
      reason: 'invalid_json',
      durationMs: Date.now() - startedAt,
    });
    return sendJson(res, 400, {
      ok: false,
      requestId,
      error: { reason: 'invalid_json', message: 'Request body must be valid JSON.' },
    });
  }

  // Domain work.
  const result = createQuote(parsed.body, { requestId });

  if (!result.ok) {
    logQuoteRejected({
      requestId,
      destinationId: result.destinationId,
      status: 400,
      reason: result.reason,
      durationMs: Date.now() - startedAt,
    });
    return sendJson(res, 400, {
      ok: false,
      requestId,
      error: { reason: result.reason, message: result.message },
    });
  }

  logQuoteCreated({
    requestId,
    destinationId: result.quote.destinationId,
    status: 200,
    durationMs: Date.now() - startedAt,
  });
  return sendJson(res, 200, { ok: true, requestId, quote: result.quote });
}
