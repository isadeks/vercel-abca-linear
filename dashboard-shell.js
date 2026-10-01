/**
 * dashboard-shell.js — shared dashboard chrome module
 *
 * Responsibilities:
 *   1. Auth guard  – redirects to index.html when no session token is found.
 *   2. Nav render  – injects the shared dashboard navigation bar into a
 *                    <div id="dashboard-nav"> placeholder.
 *   3. Active link – marks the nav link whose href matches the current page.
 *
 * Usage in a dashboard page:
 *   <script type="module" src="dashboard-shell.js"></script>
 *   …
 *   <div id="dashboard-nav"></div>
 *
 * Auth convention (lightweight, demo-grade):
 *   A sessionStorage key "wander_session" with any truthy value is treated as
 *   authenticated.  A real implementation would validate a JWT / cookie here.
 */

/** Check for a live session; redirect to homepage if missing. */
function guardAuth() {
  const token = sessionStorage.getItem('wander_session');
  if (!token) {
    // In a real app you would push to a /login page.
    // For this demo we fall back to the public homepage.
    window.location.replace('index.html');
  }
}

const NAV_LINKS = [
  { href: 'team-dashboard.html', label: 'Team' },
  { href: 'index.html',          label: 'Site home' },
];

/** Render the shared nav bar into #dashboard-nav (if present). */
function renderNav() {
  const container = document.getElementById('dashboard-nav');
  if (!container) return;

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  const linksHtml = NAV_LINKS.map(({ href, label }) => {
    const active = href === currentPage ? ' aria-current="page"' : '';
    return `<li><a href="${href}"${active}>${label}</a></li>`;
  }).join('');

  container.innerHTML = `
<nav class="dash-nav" aria-label="Dashboard navigation">
  <a href="team-dashboard.html" class="dash-nav__brand">Wander <span>Dashboard</span></a>
  <ul class="dash-nav__links">${linksHtml}</ul>
</nav>`;
}

// Run immediately when the module is imported (after DOM is ready via defer/type="module")
guardAuth();
renderNav();
