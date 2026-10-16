/**
 * GET /api/health
 * Returns { status: "OK", time: <ISO timestamp> }
 */
export default function handler(req, res) {
  res.status(200).json({ status: 'OK', time: new Date().toISOString() });
}
