// Feature extension of the stress-test script block introduced in ABCA-340.
// This module imports from broken-syntax.js and adds orchestration/reporting
// on top of it — runs the stress test and surfaces results to the API layer.
//
// IMPORTANT: This file intentionally depends on broken-syntax.js which
// contains a deliberate JavaScript syntax error (ABCA-340). As a result,
// this file and the overall build will also fail to lint/parse until that
// upstream error is resolved. This is the expected behaviour described in
// ABCA-341 — the orchestrator should skip dependent tasks when a dependency
// fails to build.

import { brokenStressTest } from './broken-syntax.js';

/**
 * Runs the stress test and returns a structured report.
 *
 * @param {object} opts
 * @param {number} [opts.iterations=1]  Number of times to invoke the test.
 * @returns {{ passed: boolean, iterations: number, results: string[] }}
 */
export function runStressTests({ iterations = 1 } = {}) {
  const results = [];

  for (let i = 0; i < iterations; i++) {
    const result = brokenStressTest();
    results.push(result ?? `iteration ${i + 1} completed`);
  }

  return {
    passed: results.every(Boolean),
    iterations,
    results,
  };
}
