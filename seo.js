/**
 * seo.js — Shared meta-tag injector for Wander travel guides
 *
 * Usage
 * -----
 * 1. Include this script in your HTML page (ideally before </body>):
 *
 *      <script src="/seo.js"></script>
 *
 * 2. Call applyMeta() with the values for the current page:
 *
 *      <script>
 *        applyMeta({
 *          title:       'Amalfi Coast Travel Guide — Wander',
 *          description: 'Everything you need to plan a trip to the Amalfi Coast: best times to visit, where to stay, and what to see.',
 *          canonical:   'https://wander.travel/amalfi-guide.html',
 *        });
 *      </script>
 *
 * Parameters (all optional — omit any you don't want to set)
 * ----------------------------------------------------------
 * @param {Object}  options
 * @param {string} [options.title]       - Page title; written to document.title.
 * @param {string} [options.description] - Content for <meta name="description">.
 *                                         Tag is created if absent; updated if present.
 * @param {string} [options.canonical]   - Absolute URL for <link rel="canonical">.
 *                                         Tag is created if absent; updated if present.
 *
 * Notes
 * -----
 * - The function is idempotent: calling it more than once on the same page
 *   updates the existing tags rather than adding duplicates.
 * - It operates purely on the live DOM and has no external dependencies.
 */

/**
 * Injects or updates the core SEO meta tags for a page.
 *
 * @param {Object}  options
 * @param {string} [options.title]
 * @param {string} [options.description]
 * @param {string} [options.canonical]
 */
function applyMeta({ title, description, canonical } = {}) {
  // ── document.title ────────────────────────────────────────────────────────
  if (title !== undefined) {
    document.title = title;
  }

  // ── <meta name="description"> ─────────────────────────────────────────────
  if (description !== undefined) {
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);
  }

  // ── <link rel="canonical"> ────────────────────────────────────────────────
  if (canonical !== undefined) {
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', canonical);
  }
}
