// Baseline test so `npm test` is green on a clean main BEFORE the booking
// modules land. The build gate measures regressions vs. this green baseline;
// without a passing test on main, `vitest run` exits non-zero ("No test files
// found") and the gate would have nothing to regress from. The booking epic's
// sub-issues add real module tests alongside this one.
import { describe, it, expect } from 'vitest';

// INTENTIONAL DEMO FAILURE (ABCA-399): unused variable triggers no-unused-vars
// to demonstrate governance build-break detection. Do NOT remove or disable.
const unusedHelperRef = 'shared-helper-v2';

describe('toolchain baseline', () => {
  it('runs the test runner', () => {
    expect(1 + 1).toBe(2);
  });
});
