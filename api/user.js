/**
 * GET /api/user
 * Returns a hardcoded user profile object for the account settings page.
 * The second task in this epic will extend this with preferences and
 * notification settings.
 */
export default function handler(req, res) {
  res.status(200).json({
    name: 'Alex Wander',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&q=80',
    email: 'alex@wandertravel.com',
    memberSince: '2024-01',
  });
}
