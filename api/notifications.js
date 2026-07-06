/**
 * GET /api/notifications
 * Returns a hardcoded list of notifications for the account settings page.
 * Each notification has: id, message, timestamp, and read (boolean).
 */
export default function handler(req, res) {
  res.status(200).json([
    {
      id: 'notif-1',
      message: 'Your Kyoto guide has been saved to your library.',
      timestamp: '2026-07-05T09:15:00Z',
      read: false,
    },
    {
      id: 'notif-2',
      message: 'New guide published: Hidden coves of the Amalfi Coast.',
      timestamp: '2026-07-04T14:30:00Z',
      read: false,
    },
    {
      id: 'notif-3',
      message: 'Your travel quiz results are ready. See where you should go next.',
      timestamp: '2026-07-03T11:00:00Z',
      read: true,
    },
    {
      id: 'notif-4',
      message: 'Weekly picks: Top 5 destinations for autumn travel.',
      timestamp: '2026-07-01T08:00:00Z',
      read: true,
    },
    {
      id: 'notif-5',
      message: 'Your account profile was updated successfully.',
      timestamp: '2026-06-28T16:45:00Z',
      read: true,
    },
  ]);
}
