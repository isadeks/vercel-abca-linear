// api/health.js — Vercel serverless function
// Returns a JSON health payload consumed by status.html.
export default function handler(_req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'wander-api',
    version: '1.0.0',
  });
}
