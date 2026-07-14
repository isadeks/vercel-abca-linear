// Health status domain logic — framework-free, unit-tested with Vitest and
// consumed by the `GET /health` serverless function under `api/`.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Resolve the package version once, at module load, from package.json so the
// health payload always reports the deployed app version.
function readVersion() {
  const pkgUrl = new URL('../../package.json', import.meta.url);
  const pkg = JSON.parse(readFileSync(fileURLToPath(pkgUrl), 'utf8'));
  return pkg.version;
}

const VERSION = readVersion();

// Returns the health status payload: { status: 'ok', version }.
export function getHealth() {
  return { status: 'ok', version: VERSION };
}
