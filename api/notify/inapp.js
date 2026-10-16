/**
 * /api/notify/inapp — In-app notifications feed endpoint.
 *
 * Vercel serverless function (Node.js runtime).
 *
 * GET  /api/notify/inapp          → returns the full feed (JSON array)
 * POST /api/notify/inapp          → push a new notification (JSON body)
 *
 * Feed shape:
 *   Array<{ id, title, body, href?, ts }>
 *
 * Storage:
 *   In production this would be backed by a database.  For this implementation
 *   we use an in-process module-level array so the feed survives across warm
 *   invocations within the same serverless instance.  The seed data below
 *   means the endpoint is immediately useful for UI development.
 *
 * CORS: same-origin only (no Access-Control-Allow-Origin header).
 */

/** @typedef {{ id: string, title: string, body: string, href?: string, ts: string }} Notification */

/** @type {Notification[]} */
const SEED = [
  {
    id: 'n-001',
    title: 'New guide: Amalfi Coast',
    body: 'Your curated Amalfi Coast travel guide is now live.',
    href: '/amalfi-guide.html',
    ts: '2026-06-20T09:00:00.000Z',
  },
  {
    id: 'n-002',
    title: 'Booking confirmed',
    body: 'Your Kyoto retreat booking has been confirmed.',
    href: '/kyoto-guide.html',
    ts: '2026-06-21T14:30:00.000Z',
  },
  {
    id: 'n-003',
    title: 'Santorini availability alert',
    body: 'Rooms at your saved Santorini property are almost full.',
    href: '/santorini-guide.html',
    ts: '2026-06-22T08:15:00.000Z',
  },
];

/** Module-level store (survives warm invocations). */
const feed = [...SEED];

let nextSeq = SEED.length + 1;

/** @returns {string} */
function generateId() {
  return `n-${String(nextSeq++).padStart(3, '0')}`;
}

/**
 * Vercel serverless handler.
 * @param {import('@vercel/node').VercelRequest} req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default function handler(req, res) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  }

  if (req.method === 'POST') {
    return handlePost(req, res);
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}

/** GET /api/notify/inapp */
function handleGet(_req, res) {
  // Return newest-first
  const sorted = [...feed].sort((a, b) => (a.ts < b.ts ? 1 : -1));
  return res.status(200).json(sorted);
}

/** POST /api/notify/inapp */
function handlePost(req, res) {
  const body = req.body ?? {};

  const { title, body: msgBody, href } = body;

  if (typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: '`title` is required and must be a non-empty string.' });
  }

  if (typeof msgBody !== 'string' || msgBody.trim() === '') {
    return res.status(400).json({ error: '`body` is required and must be a non-empty string.' });
  }

  /** @type {Notification} */
  const notification = {
    id: generateId(),
    title: title.trim(),
    body: msgBody.trim(),
    ts: new Date().toISOString(),
  };

  if (typeof href === 'string' && href.trim() !== '') {
    notification.href = href.trim();
  }

  feed.unshift(notification);

  return res.status(201).json(notification);
}
