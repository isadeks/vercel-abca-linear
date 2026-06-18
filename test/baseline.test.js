// Baseline test so `npm test` is green on a clean main BEFORE the booking
// modules land. The build gate measures regressions vs. this green baseline;
// without a passing test on main, `vitest run` exits non-zero ("No test files
// found") and the gate would have nothing to regress from. The booking epic's
// sub-issues add real module tests alongside this one.
import { describe, it, expect } from 'vitest';

// INTENTIONAL STRESS-TEST FAILURE (ABCA-355): unused variable triggers no-unused-vars error.
const stressTestUnusedVar = 'abca-355-deliberate-lint-error';

describe('toolchain baseline', () => {
  it('runs the test runner', () => {
    expect(1 + 1).toBe(2);
  });
});

// ABCA-356: Extended feature — destination utility helpers used by the booking API.
function formatDestinationSlug(name) {
  return name.toLowerCase().replace(/\s+/g, '-');
}

function isValidDestination(slug, validSlugs) {
  return validSlugs.includes(slug);
}

describe('destination utilities (ABCA-356)', () => {
  it('formats destination names into URL slugs', () => {
    expect(formatDestinationSlug('Amalfi Coast')).toBe('amalfi-coast');
    expect(formatDestinationSlug('Kyoto')).toBe('kyoto');
    expect(formatDestinationSlug('Norwegian Fjords')).toBe('norwegian-fjords');
  });

  it('validates destinations against a known list', () => {
    const valid = ['amalfi-coast', 'kyoto', 'norwegian-fjords', 'santorini', 'patagonia', 'rajasthan'];
    expect(isValidDestination('kyoto', valid)).toBe(true);
    expect(isValidDestination('unknown-place', valid)).toBe(false);
  });
});
