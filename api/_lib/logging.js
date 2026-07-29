// logging.js — sanitized structured runtime logging for the quote API.
//
// Emits exactly one JSON console event per request so browser requests can be
// correlated with Vercel runtime logs via `requestId`. Crucially, these
// helpers only ever accept a fixed allow-list of fields — email addresses and
// full request bodies are structurally impossible to log through them.

/** Emits a `trip_quote_created` event for a successful quote. */
export function logQuoteCreated({ requestId, destinationId, status, durationMs }) {
  console.log(
    JSON.stringify({
      event: 'trip_quote_created',
      requestId,
      destinationId,
      status,
      durationMs,
    }),
  );
}

/** Emits a `trip_quote_rejected` event for a rejected request. */
export function logQuoteRejected({
  requestId,
  destinationId,
  status,
  reason,
  durationMs,
}) {
  const payload = {
    event: 'trip_quote_rejected',
    requestId,
    status,
    reason,
    durationMs,
  };
  // destinationId is only included when it was a valid, known destination.
  if (destinationId !== undefined) {
    payload.destinationId = destinationId;
  }
  console.warn(JSON.stringify(payload));
}
