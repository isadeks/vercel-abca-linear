/**
 * Static product catalog for the Wander travel site.
 *
 * Each product has:
 *   id          – stable identifier
 *   name        – display name (searched by full-text)
 *   description – longer copy (searched by full-text)
 *   category    – 'tour' | 'accommodation' | 'activity'
 *   price       – numeric USD price
 *   date        – ISO date string (product added / departure date)
 */
export const products = [
  {
    id: 'prod-001',
    name: 'Santorini Sunset Tour',
    description:
      'A guided evening tour of Santorini\'s famous caldera villages, ending with a spectacular sunset view from Oia.',
    category: 'tour',
    price: 89,
    date: '2026-08-15',
  },
  {
    id: 'prod-002',
    name: 'Amalfi Coast Boat Trip',
    description:
      'Cruise the turquoise waters along the Amalfi Coast, stopping at hidden sea caves and the village of Positano.',
    category: 'activity',
    price: 120,
    date: '2026-07-20',
  },
  {
    id: 'prod-003',
    name: 'Kyoto Temple Walking Tour',
    description:
      'A half-day walking tour through Kyoto\'s most iconic Zen temples and traditional gardens.',
    category: 'tour',
    price: 55,
    date: '2026-09-01',
  },
  {
    id: 'prod-004',
    name: 'Rajasthan Desert Camp',
    description:
      'Spend a night under the stars in a luxury tented camp in the Thar Desert, with camel rides and folk music.',
    category: 'accommodation',
    price: 210,
    date: '2026-11-10',
  },
  {
    id: 'prod-005',
    name: 'Patagonia Glacier Hike',
    description:
      'A full-day guided trek across the Perito Moreno glacier with crampons and safety equipment provided.',
    category: 'activity',
    price: 175,
    date: '2026-12-05',
  },
  {
    id: 'prod-006',
    name: 'Norway Fjord Kayaking',
    description:
      'Paddle through the dramatic Nærøyfjord on a guided kayaking tour, passing waterfalls and traditional farms.',
    category: 'activity',
    price: 95,
    date: '2026-06-28',
  },
  {
    id: 'prod-007',
    name: 'Santorini Cliffside Suite',
    description:
      'A luxury whitewashed suite carved into the volcanic cliffs of Oia with a private plunge pool and caldera views.',
    category: 'accommodation',
    price: 450,
    date: '2026-08-01',
  },
  {
    id: 'prod-008',
    name: 'Kyoto Ryokan Stay',
    description:
      'Two nights in a traditional Japanese inn (ryokan) near the Gion district, including kaiseki dinner.',
    category: 'accommodation',
    price: 320,
    date: '2026-09-10',
  },
  {
    id: 'prod-009',
    name: 'Amalfi Cooking Class',
    description:
      'Learn to make fresh pasta and traditional Campanian dishes with a local chef in their home kitchen.',
    category: 'activity',
    price: 75,
    date: '2026-07-25',
  },
  {
    id: 'prod-010',
    name: 'Rajasthan Palace Tour',
    description:
      'A full-day guided tour of Jaipur\'s Amber Fort, City Palace, and Hawa Mahal with a local historian.',
    category: 'tour',
    price: 65,
    date: '2026-11-15',
  },
];
