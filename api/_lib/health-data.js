/**
 * health-data.js
 * Static data backing the project health panel (health.html).
 * Exported as plain JS objects so the panel can be unit-tested
 * independently of any DOM or HTTP layer.
 */

export const RISK_LEVELS = /** @type {const} */ ({
  GREEN: 'green',
  AMBER: 'amber',
  RED:   'red',
});

/** Overall project health summary */
export const projectStatus = {
  name:        'Wander Editorial Platform',
  overallRisk: RISK_LEVELS.AMBER,
  summary:     'Booking API integration on schedule; content pipeline delayed by two weeks due to photography backlog.',
  asOf:        '2026-07-06',
};

/**
 * Risk items — each has a category, level, and short description.
 * @type {Array<{id:string, category:string, level:string, title:string, detail:string}>}
 */
export const risks = [
  {
    id:       'RISK-01',
    category: 'Content',
    level:    RISK_LEVELS.AMBER,
    title:    'Photography backlog',
    detail:   'Hero images for 3 destination guides are pending photographer delivery. Target: Jul 18.',
  },
  {
    id:       'RISK-02',
    category: 'Engineering',
    level:    RISK_LEVELS.GREEN,
    title:    'Booking API stability',
    detail:   'All API endpoints passing CI. Load-test results within SLA thresholds.',
  },
  {
    id:       'RISK-03',
    category: 'Infrastructure',
    level:    RISK_LEVELS.AMBER,
    title:    'Vercel edge-config quota',
    detail:   'Edge-config read quota at 72 % for July. Caching layer optimisation queued for sprint 14.',
  },
  {
    id:       'RISK-04',
    category: 'Legal',
    level:    RISK_LEVELS.GREEN,
    title:    'GDPR cookie banner',
    detail:   'Consent management implementation reviewed and approved by legal on Jul 2.',
  },
];

/**
 * Upcoming milestones.
 * @type {Array<{id:string, title:string, dueDate:string, owner:string, status:string}>}
 */
export const milestones = [
  {
    id:      'MS-01',
    title:   'Booking API v1 — public beta',
    dueDate: '2026-07-14',
    owner:   'eng',
    status:  'on-track',
  },
  {
    id:      'MS-02',
    title:   'Summer 2026 content drop (6 guides)',
    dueDate: '2026-07-21',
    owner:   'editorial',
    status:  'at-risk',
  },
  {
    id:      'MS-03',
    title:   'Newsletter re-platform launch',
    dueDate: '2026-08-04',
    owner:   'product',
    status:  'on-track',
  },
  {
    id:      'MS-04',
    title:   'Mobile-responsive redesign QA sign-off',
    dueDate: '2026-08-18',
    owner:   'design',
    status:  'on-track',
  },
];

/**
 * Recent blockers — issues actively stalling work.
 * @type {Array<{id:string, title:string, raisedDate:string, raisedBy:string, blockedArea:string, resolution:string|null}>}
 */
export const blockers = [
  {
    id:          'BLK-01',
    title:       'Missing API keys for third-party weather widget',
    raisedDate:  '2026-07-01',
    raisedBy:    'Priya Nair',
    blockedArea: 'Destination guides — weather section',
    resolution:  null,
  },
  {
    id:          'BLK-02',
    title:       'Font licence renewal overdue — Cormorant Garamond Pro variant',
    raisedDate:  '2026-07-03',
    raisedBy:    'Design team',
    blockedArea: 'Brand / typography',
    resolution:  'Renewal invoice sent; expected approval by Jul 9.',
  },
  {
    id:          'BLK-03',
    title:       'Vitest upgrade breaks ESM interop in Node 20.18',
    raisedDate:  '2026-07-05',
    raisedBy:    'Marco Silva',
    blockedArea: 'CI pipeline',
    resolution:  null,
  },
];

/**
 * Owner contacts.
 * @type {Array<{id:string, area:string, name:string, role:string, email:string, slack:string}>}
 */
export const owners = [
  {
    id:    'eng',
    area:  'Engineering',
    name:  'Marco Silva',
    role:  'Lead Engineer',
    email: 'marco@wander.example',
    slack: '@marco',
  },
  {
    id:    'editorial',
    area:  'Editorial',
    name:  'Priya Nair',
    role:  'Head of Content',
    email: 'priya@wander.example',
    slack: '@priya',
  },
  {
    id:    'product',
    area:  'Product',
    name:  'Sofia Johansson',
    role:  'Product Manager',
    email: 'sofia@wander.example',
    slack: '@sofia',
  },
  {
    id:    'design',
    area:  'Design',
    name:  'Luca Ferretti',
    role:  'Design Lead',
    email: 'luca@wander.example',
    slack: '@luca',
  },
];
