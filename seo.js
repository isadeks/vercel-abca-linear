/**
 * seo.js — Shared meta-tag injector for Wander travel site
 *
 * Usage:
 *   <script src="/seo.js"></script>
 *   <script>
 *     applyMeta({
 *       title:       'Amalfi Coast Travel Guide — Wander',
 *       description: 'Everything you need to plan your Amalfi Coast trip.',
 *       canonical:   'https://www.wander.travel/amalfi-guide.html'
 *     });
 *   </script>
 *
 * Parameters (all optional):
 *   title       {string}  Sets document.title and <meta property="og:title">
 *   description {string}  Sets/creates <meta name="description">
 *   canonical   {string}  Sets/creates <link rel="canonical">
 *
 * The function is idempotent — calling it multiple times updates the existing
 * tags rather than creating duplicates.
 */

/**
 * Apply SEO meta tags to the current document.
 *
 * @param {Object}  options
 * @param {string}  [options.title]       - Page title (sets document.title)
 * @param {string}  [options.description] - Meta description content
 * @param {string}  [options.canonical]   - Canonical URL (absolute href)
 */
function applyMeta({ title, description, canonical } = {}) {
  // ── Title ──────────────────────────────────────────────────────────────
  if (title !== undefined && title !== null) {
    document.title = title;
  }

  // ── Meta description ───────────────────────────────────────────────────
  if (description !== undefined && description !== null) {
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);
  }

  // ── Canonical link ─────────────────────────────────────────────────────
  if (canonical !== undefined && canonical !== null) {
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', canonical);
  }
}
