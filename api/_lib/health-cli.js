// CLI health check — runnable via `npm run health`.
// Invokes the same domain logic the `GET /health` endpoint serves, validates
// the payload shape, prints it, and exits 0 on success / 1 on failure so it can
// be wired into CI or a deploy smoke check.
import { getHealth } from './health.js';

export function runHealthCheck() {
  const payload = getHealth();
  const ok =
    payload &&
    payload.status === 'ok' &&
    typeof payload.version === 'string' &&
    payload.version.length > 0;

  if (!ok) {
    console.error('health check FAILED:', JSON.stringify(payload));
    return 1;
  }
  console.log('health check OK:', JSON.stringify(payload));
  return 0;
}

// Only run when invoked directly (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(runHealthCheck());
}
