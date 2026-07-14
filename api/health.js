// Vercel serverless function: GET /health
// Returns { status: 'ok', version } as JSON with a 200 status.
import { getHealth } from './_lib/health.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  res.status(200).json(getHealth());
}
