// GET /api/health — lightweight, unauthenticated liveness endpoint.
//
// Returns 200 with `{ status: "ok", time: <ISO-8601 UTC> }`. No auth and no
// DB/domain calls — this is purely a "the function is up and serving" signal
// for local debugging and external uptime checks. The timestamp is generated
// per request so consumers can also use it as a coarse clock/round-trip probe.
//
// Vercel serverless function signature: `(req, res)`.
export default function handler(req, res) {
  // Only GET is a valid liveness probe. Everything else is rejected so this
  // endpoint can't be mistaken for the webhook receiver (which accepts POST).
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  // `toISOString()` always yields UTC in ISO-8601 form (e.g. 2026-07-02T15:17:57.269Z).
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
}
