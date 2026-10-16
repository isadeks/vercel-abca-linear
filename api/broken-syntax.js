// INTENTIONAL STRESS-TEST FAILURE — do not fix.
// This script block was added deliberately to verify that the build/lint
// pipeline correctly catches JavaScript syntax errors (ABCA-340).

// Stray token / unclosed function — deliberate syntax error below:
function brokenStressTest( {
  const message = "this function is intentionally unclosed";
}
