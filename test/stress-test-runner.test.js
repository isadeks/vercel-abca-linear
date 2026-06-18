// Tests for api/stress-test-runner.js (ABCA-341).
// This test file depends on the stress-test-runner module which in turn
// imports broken-syntax.js (ABCA-340, deliberate syntax error). The entire
// test suite is expected to fail until the upstream broken-syntax.js is
// repaired — exactly as the orchestration spec requires.

import { describe, it, expect } from 'vitest';
import { runStressTests } from '../api/stress-test-runner.js';

describe('stress-test-runner', () => {
  it('returns a report object with expected shape', () => {
    const report = runStressTests();
    expect(report).toHaveProperty('passed');
    expect(report).toHaveProperty('iterations');
    expect(report).toHaveProperty('results');
    expect(Array.isArray(report.results)).toBe(true);
  });

  it('runs the requested number of iterations', () => {
    const report = runStressTests({ iterations: 3 });
    expect(report.iterations).toBe(3);
    expect(report.results).toHaveLength(3);
  });

  it('defaults to a single iteration', () => {
    const report = runStressTests();
    expect(report.iterations).toBe(1);
  });
});
