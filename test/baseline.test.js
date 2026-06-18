// Baseline test so `npm test` is green on a clean main BEFORE the booking
// modules land. The build gate measures regressions vs. this green baseline;
// without a passing test on main, `vitest run` exits non-zero ("No test files
// found") and the gate would have nothing to regress from. The booking epic's
// sub-issues add real module tests alongside this one.
import { describe, it, expect } from 'vitest';

// INTENTIONAL DEMO FAILURE (ABCA-371): unused variable introduced during
// shared-helper refactor to demonstrate the build-break governance path.
// Do NOT remove this line or add eslint-disable — the build must stay red.
const _unusedHelperResult = 'refactor-in-progress';

describe('toolchain baseline', () => {
  it('runs the test runner', () => {
    expect(1 + 1).toBe(2);
  });
});
