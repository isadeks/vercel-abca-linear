// Footer — a framework-free component that renders the build timestamp.
//
// Consistent with the rest of the site, this is a plain ES module that returns
// an HTML string (no framework runtime). The build time is read from the
// `BUILD_TIME` environment variable, which is expected to be set at build time
// (e.g. `BUILD_TIME=$(date -u +%FT%TZ)` in the deploy step). When that var is
// absent — local dev, or a build that didn't stamp it — it falls back to the
// current render time so the footer always shows *a* timestamp.
//
// Not wired into any page yet; import `Footer()` where a footer is needed.

const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ESCAPE_MAP[char]);
}

/**
 * Resolve the timestamp to display: the build-time env var if present,
 * otherwise the current render time.
 *
 * @param {string} [buildTime] Explicit build time (mainly for testing).
 * @returns {string} An ISO-8601 timestamp string.
 */
export function resolveBuildTime(buildTime) {
  const fromEnv =
    typeof process !== 'undefined' && process.env ? process.env.BUILD_TIME : undefined;
  const value = buildTime ?? fromEnv;
  if (value) return String(value);
  return new Date().toISOString();
}

/**
 * Render the footer as an HTML string.
 *
 * Visually minimal: small, muted, centred text.
 *
 * @param {object} [options]
 * @param {string} [options.buildTime] Override the build time (defaults to the
 *   `BUILD_TIME` env var, then the current render time).
 * @returns {string} The footer HTML.
 */
export function Footer({ buildTime } = {}) {
  const timestamp = resolveBuildTime(buildTime);
  const style = [
    'margin:0',
    'padding:1rem',
    'text-align:center',
    'font-size:0.75rem',
    'color:#888',
  ].join(';');

  return (
    `<footer class="site-footer" style="${style}">` +
    `Built <time datetime="${escapeHtml(timestamp)}">${escapeHtml(timestamp)}</time>` +
    `</footer>`
  );
}

export default Footer;
