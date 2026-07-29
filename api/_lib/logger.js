// logger.js — sanitized structured logging for the trip quote service.
//
// Emits single-line JSON to stdout/stderr so Vercel captures them as
// structured logs. Deliberately narrow: callers pass only non-PII fields.
// Email and the raw request body are never logged.

/**
 * Emit a structured log line.
 * @param {'info' | 'warn' | 'error'} level
 * @param {string} event  Event name (e.g. 'trip_quote_created').
 * @param {Record<string, unknown>} fields Sanitized, non-PII fields.
 */
function log(level, event, fields = {}) {
  const line = JSON.stringify({
    level,
    event,
    at: new Date().toISOString(),
    ...fields,
  });
  if (level === 'error' || level === 'warn') {
    console.error(line);
  } else {
    console.log(line);
  }
}

/**
 * Log a successfully priced quote. Only non-PII summary fields are included —
 * never the email or the full request.
 *
 * @param {Object} params
 * @param {string} params.requestId
 * @param {string} params.destinationId
 * @param {number} params.nights
 * @param {number} params.rooms
 * @param {number} params.guests
 * @param {number} params.totalUsd
 * @param {string} params.currency
 */
export function logQuoteCreated({
  requestId,
  destinationId,
  nights,
  rooms,
  guests,
  totalUsd,
  currency,
}) {
  log('info', 'trip_quote_created', {
    requestId,
    destinationId,
    nights,
    rooms,
    guests,
    totalUsd,
    currency,
  });
}

/**
 * Log a rejected quote request. Only the error code (and optional destination
 * id, when known) is included — never the email or the full request.
 *
 * @param {Object} params
 * @param {string} params.requestId
 * @param {string} params.code  Machine-readable rejection code.
 * @param {string} [params.destinationId]
 */
export function logQuoteRejected({ requestId, code, destinationId }) {
  const fields = { requestId, code };
  if (destinationId !== undefined) fields.destinationId = destinationId;
  log('warn', 'trip_quote_rejected', fields);
}
