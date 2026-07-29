// api/book.js — Vercel serverless handler for POST /api/book.
//
// Thin adapter: parse the request, delegate pricing/validation to the domain
// (`createQuote`), attach a correlation id, emit sanitized logs, and shape the
// HTTP response. No business logic lives here.

import { createQuote } from './_lib/booking.js';
import { resolveRequestId } from './_lib/request-id.js';
import { logQuoteCreated, logQuoteRejected } from './_lib/logger.js';

/**
 * Parse the request body into a plain object. Vercel usually parses JSON for
 * us (req.body is already an object), but we tolerate a raw string too.
 * @param {unknown} body
 * @returns {unknown}
 */
function parseBody(body) {
  if (typeof body === 'string') {
    if (body.trim() === '') return {};
    try {
      return JSON.parse(body);
    } catch {
      return undefined; // signals malformed JSON
    }
  }
  return body ?? {};
}

/**
 * @param {import('http').IncomingMessage & { method?: string, headers?: Record<string, unknown>, body?: unknown }} req
 * @param {import('http').ServerResponse & { status: (n: number) => any, setHeader: (k: string, v: string) => void, json: (b: unknown) => void }} res
 */
export default function handler(req, res) {
  const requestId = resolveRequestId(req.headers);
  res.setHeader('X-Request-Id', requestId);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    logQuoteRejected({ requestId, code: 'method_not_allowed' });
    return sendJson(res, 405, {
      ok: false,
      requestId,
      error: {
        code: 'method_not_allowed',
        message: 'Only POST is supported for this endpoint.',
      },
    });
  }

  const body = parseBody(req.body);
  if (body === undefined) {
    logQuoteRejected({ requestId, code: 'invalid_json' });
    return sendJson(res, 400, {
      ok: false,
      requestId,
      error: { code: 'invalid_json', message: 'The request body is not valid JSON.' },
    });
  }

  const result = createQuote(body);

  if (!result.ok) {
    logQuoteRejected({
      requestId,
      code: result.error.code,
      destinationId: result.destinationId,
    });
    return sendJson(res, 400, { ok: false, requestId, error: result.error });
  }

  const { quote } = result;
  logQuoteCreated({
    requestId,
    destinationId: result.destinationId,
    nights: quote.nights,
    rooms: body.rooms,
    guests: body.guests,
    totalUsd: quote.totalUsd,
    currency: quote.currency,
  });

  return sendJson(res, 200, { ok: true, requestId, quote });
}

/**
 * Write a JSON response, supporting both the Vercel res helpers and a bare
 * Node ServerResponse (used in tests).
 * @param {any} res
 * @param {number} status
 * @param {unknown} payload
 */
function sendJson(res, status, payload) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(status).json(payload);
  }
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
  return res;
}
