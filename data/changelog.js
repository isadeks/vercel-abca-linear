/**
 * Changelog entries for the Wander marketing site.
 * Each entry: { version, date (ISO YYYY-MM-DD), title, category, body (markdown) }
 * Keep sorted newest-first.
 */
export const changelog = [
  {
    version: '2.4.0',
    date: '2026-06-15',
    title: 'Destination Finder quiz revamp',
    category: 'Feature',
    body: `We rebuilt the Destination Finder quiz from scratch. Eight new questions now account for travel pace, climate preference, food priorities, and budget — producing sharper matches than before. Results pages include a curated reading list for your matched destination.`,
  },
  {
    version: '2.3.2',
    date: '2026-05-28',
    title: 'Performance improvements and image loading',
    category: 'Improvement',
    body: `Destination-card images now use lazy loading and next-gen formats where the browser supports them. Page weight on the home page dropped by roughly 40 %. Navigation feels noticeably snappier on mobile connections.`,
  },
  {
    version: '2.3.1',
    date: '2026-05-10',
    title: 'Fixed newsletter sign-up on Safari iOS',
    category: 'Fix',
    body: `A CSS grid bug on iOS 17 Safari was clipping the subscribe button in the newsletter section. The layout now uses a single-column flexbox fallback that looks correct across all tested browsers.`,
  },
  {
    version: '2.3.0',
    date: '2026-04-22',
    title: 'Norway fjords guide published',
    category: 'Content',
    body: `A new long-form guide covers Norway's western fjords in midsummer — including the best viewpoints on the Hardangerfjord, overnight ferry routes, and a practical packing list for shoulder-season hiking.`,
  },
  {
    version: '2.2.0',
    date: '2026-03-30',
    title: 'Booking API: group discounts',
    category: 'Feature',
    body: `The booking API now accepts a \`groupSize\` field. Groups of 4 or more receive a 10 % discount automatically. The discount is reflected in the price breakdown returned by \`/api/book\`.`,
  },
  {
    version: '2.1.0',
    date: '2026-02-14',
    title: 'Dark mode support',
    category: 'Feature',
    body: `The site now respects \`prefers-color-scheme\`. All pages adapt to the system dark-mode preference with carefully chosen ink/cream inversions that keep the editorial feel intact.`,
  },
  {
    version: '2.0.0',
    date: '2026-01-05',
    title: 'Wander 2.0 — redesigned from the ground up',
    category: 'Release',
    body: `After six months of design iteration, Wander 2.0 ships with a completely new visual language: Cormorant Garamond for headlines, a tighter sand-and-teal palette, full-bleed destination photography, and a rebuilt guide-card layout. The URL structure is unchanged — all existing links continue to work.`,
  },
];
