/**
 * GET /api/health
 *
 * Lightweight health probe. Returns HTTP 200 with a JSON envelope so the
 * status page badge can colour itself green (ok) or red (any non-200 / error).
 */
export default function handler(_req, res) {
  res.status(200).json({
    ok: true,
    timestamp: new Date().toISOString(),
  });
}
