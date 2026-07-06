/**
 * Vercel serverless function — GET /api/notifications
 *
 * Returns a hard-coded list of sample notification objects.
 * Each notification has the shape:
 *   { id, title, timestamp, read }
 */

const NOTIFICATIONS = [
  {
    id: 1,
    title: 'Your Kyoto guide has been updated with new autumn itineraries.',
    timestamp: '2026-07-05T10:30:00Z',
    read: false,
  },
  {
    id: 2,
    title: 'New guide published: Hidden beaches of the Amalfi Coast.',
    timestamp: '2026-07-04T08:15:00Z',
    read: false,
  },
  {
    id: 3,
    title: 'Wander weekly digest — top destinations for August.',
    timestamp: '2026-07-03T07:00:00Z',
    read: true,
  },
  {
    id: 4,
    title: 'Your saved destination Patagonia has a new travel alert.',
    timestamp: '2026-07-01T14:45:00Z',
    read: true,
  },
  {
    id: 5,
    title: 'Welcome to Wander! Start exploring our destination guides.',
    timestamp: '2026-06-28T09:00:00Z',
    read: true,
  },
];

/**
 * Handler — callable directly in tests as well as by Vercel.
 *
 * @param {object} _req  - Incoming request (unused for this mock endpoint)
 * @param {object} res   - Response object with .status(), .setHeader(), .json()
 */
export function handler(_req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ notifications: NOTIFICATIONS });
}

export default handler;
