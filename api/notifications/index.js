/**
 * api/notifications/index.js — Vercel serverless function
 *
 * Returns a hardcoded JSON array of mock notification objects.
 * Each object has the shape: { id, type, message, timestamp }
 *
 * GET /api/notifications → 200 JSON array
 * Any other method       → 405 Method Not Allowed
 */

/** @type {Array<{id: string, type: string, message: string, timestamp: string}>} */
const MOCK_NOTIFICATIONS = [
  {
    id: 'notif-001',
    type: 'booking_confirmed',
    message: 'Your booking for Amalfi Coast (3 nights) has been confirmed.',
    timestamp: '2026-07-04T09:15:00Z',
  },
  {
    id: 'notif-002',
    type: 'new_guide',
    message: 'A new travel guide for Kyoto — Cherry Blossom Season has been published.',
    timestamp: '2026-07-03T14:30:00Z',
  },
  {
    id: 'notif-003',
    type: 'price_alert',
    message: 'Prices for Santorini in August have dropped by 12%. Book now to lock in the rate.',
    timestamp: '2026-07-02T11:00:00Z',
  },
  {
    id: 'notif-004',
    type: 'itinerary_update',
    message: 'Your Patagonia itinerary has been updated with new trail conditions for the W Trek.',
    timestamp: '2026-07-01T18:45:00Z',
  },
  {
    id: 'notif-005',
    type: 'newsletter',
    message: 'Your latest Wander newsletter is ready — featuring hidden gems in Rajasthan.',
    timestamp: '2026-06-30T08:00:00Z',
  },
  {
    id: 'notif-006',
    type: 'reminder',
    message: 'Reminder: your trip to Norway starts in 7 days. Check your packing list.',
    timestamp: '2026-06-29T10:20:00Z',
  },
  {
    id: 'notif-007',
    type: 'review_request',
    message: 'How was your stay in Kyoto? Share your experience with the Wander community.',
    timestamp: '2026-06-28T16:10:00Z',
  },
];

/**
 * Vercel serverless handler.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  res.end(JSON.stringify(MOCK_NOTIFICATIONS));
}
