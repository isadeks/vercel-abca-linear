/**
 * Docs site search — page index and filter logic.
 * Pure module: no DOM access, safe to import in Node (vitest).
 */

/** @typedef {{ title: string, url: string, region: string, description: string }} Page */

/** @type {Page[]} */
export const PAGES = [
  {
    title: 'Home',
    url: 'index.html',
    region: '',
    description: 'Wander travel guide home page',
  },
  {
    title: 'All Destinations',
    url: 'destinations.html',
    region: '',
    description: 'Browse every destination we cover in depth',
  },
  {
    title: 'Quiz — Where to go?',
    url: 'quiz.html',
    region: '',
    description: 'Destination finder quiz — eight questions, personalised match',
  },
  {
    title: 'About',
    url: 'about.html',
    region: '',
    description: 'About Wander, our editorial team, and mission',
  },
  {
    title: 'Contact',
    url: 'contact.html',
    region: '',
    description: 'Get in touch with the Wander team',
  },
  {
    title: 'Amalfi Coast',
    url: 'amalfi-guide.html',
    region: 'Southern Italy',
    description: "Italy's most dramatic shoreline — cliffs, villages, and sea",
  },
  {
    title: 'Kyoto',
    url: 'kyoto-guide.html',
    region: 'Japan',
    description: "Japan's ancient capital, temples, cherry blossoms, and ryokan",
  },
  {
    title: 'Santorini',
    url: 'santorini-guide.html',
    region: 'Greece',
    description: 'Cyclades island, caldera views, white-washed villages, and sunsets',
  },
  {
    title: 'Patagonia',
    url: 'patagonia-guide.html',
    region: 'South America',
    description: 'W Trek, glaciers, and wind-scoured peaks at the end of the world',
  },
  {
    title: 'Rajasthan',
    url: 'rajasthan-guide.html',
    region: 'India',
    description: 'Golden cities by rail — Jaipur, Jodhpur, and the regal state',
  },
  {
    title: "Norway's Fjords",
    url: 'norway-guide.html',
    region: 'Scandinavia',
    description: 'Fjords, midnight sun, and still water beneath granite walls',
  },
];

/**
 * Filter pages by a query string.
 *
 * Matches against title, region, and description (case-insensitive substring).
 * Returns an empty array for blank / whitespace-only queries.
 *
 * @param {string} query - User input string.
 * @param {Page[]} [pages] - Page list to search (defaults to PAGES).
 * @returns {Page[]} Matching pages, preserving original order.
 */
export function filterPages(query, pages = PAGES) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return pages.filter(({ title, region, description }) =>
    title.toLowerCase().includes(q) ||
    region.toLowerCase().includes(q) ||
    description.toLowerCase().includes(q)
  );
}
