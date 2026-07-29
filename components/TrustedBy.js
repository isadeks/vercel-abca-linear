// TrustedBy — a framework-free component that renders a "trusted by" strip.
//
// Consistent with the rest of the site (see components/Footer.js), this is a
// plain ES module that returns an HTML string — no framework runtime. It shows
// a small heading followed by a horizontal row of placeholder logo boxes:
// simple bordered divs, each containing a company name (no images needed).
//
// Not wired into any page yet; import `TrustedBy()` where the strip is needed.

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

// Five placeholder company names. Deliberately generic — the real logos (and
// image assets) can replace these boxes later.
export const DEFAULT_LOGOS = ['Northwind', 'Globex', 'Initech', 'Umbrella', 'Soylent'];

/**
 * Render a single placeholder logo box: a bordered div with the company name.
 *
 * @param {string} name Company name to display.
 * @returns {string} The logo box HTML.
 */
function logoBox(name) {
  const style = [
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'min-width:120px',
    'height:56px',
    'padding:0 1rem',
    'border:1px solid #ddd',
    'border-radius:6px',
    'background:#fafafa',
    'color:#888',
    'font-size:0.85rem',
    'font-weight:600',
    'letter-spacing:0.02em',
  ].join(';');

  return `<div class="trusted-by-logo" style="${style}">${escapeHtml(name)}</div>`;
}

/**
 * Render the "trusted by" strip as an HTML string.
 *
 * A small muted heading followed by a horizontal row of placeholder logo
 * boxes with comfortable spacing.
 *
 * @param {object} [options]
 * @param {string[]} [options.logos] Company names to render (defaults to five
 *   placeholder names).
 * @returns {string} The strip HTML.
 */
export function TrustedBy({ logos = DEFAULT_LOGOS } = {}) {
  const sectionStyle = [
    'padding:2rem 1rem',
    'text-align:center',
  ].join(';');

  const headingStyle = [
    'margin:0 0 1rem',
    'font-size:0.75rem',
    'font-weight:600',
    'text-transform:uppercase',
    'letter-spacing:0.08em',
    'color:#888',
  ].join(';');

  const rowStyle = [
    'display:flex',
    'flex-wrap:wrap',
    'align-items:center',
    'justify-content:center',
    'gap:1.5rem',
    'margin:0',
    'padding:0',
    'list-style:none',
  ].join(';');

  const items = logos
    .map((name) => `<li style="margin:0;padding:0">${logoBox(name)}</li>`)
    .join('');

  return (
    `<section class="trusted-by" aria-label="Trusted by" style="${sectionStyle}">` +
    `<p class="trusted-by-heading" style="${headingStyle}">Trusted by</p>` +
    `<ul class="trusted-by-logos" style="${rowStyle}">${items}</ul>` +
    `</section>`
  );
}

export default TrustedBy;
