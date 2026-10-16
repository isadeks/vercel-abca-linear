/**
 * dashboard-shell.js — Shared auth-guard and nav-hydration module.
 *
 * Usage (on a protected dashboard page):
 *
 *   <script type="module" src="/js/dashboard-shell.js"></script>
 *
 * The script must be included in <head> or at the top of <body> (deferred).
 *
 * Responsibilities:
 *   1. Call GET /api/auth to check session.
 *   2. On 401 (no session), redirect to /login.html?next=<current-path>.
 *   3. On success, store the user and hydrate the nav:
 *        - Show display name / email in the .nav__user element.
 *        - Wire up the .nav__signout button to POST /api/auth signout.
 *   4. Export getAuthUser() for other inline scripts that need the user object
 *      (e.g. analytics event enrichment).
 *
 * If the page has a `.nav__links a` whose href matches the current pathname it
 * gets the class `active` automatically.
 */

// ── Internals ────────────────────────────────────────────────────────────────

/** @type {{ email: string, displayName: string, createdAt: string } | null} */
let _user = null;

/** @type {Array<(user: object) => void>} */
const _listeners = [];

/**
 * Notify all listeners that the user has been resolved.
 * @param {object} user
 */
function _notifyReady(user) {
  _user = user;
  for (const fn of _listeners) {
    try { fn(user); } catch { /* ignore */ }
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Return the resolved user object, or null if auth has not yet completed or
 * the page was not protected.
 * @returns {{ email: string, displayName: string, createdAt: string } | null}
 */
export function getAuthUser() {
  return _user;
}

/**
 * Register a callback to be called once the user identity is resolved.
 * If auth is already complete when this is called, the callback fires immediately.
 *
 * @param {(user: object) => void} fn
 */
export function onAuthReady(fn) {
  if (_user) {
    fn(_user);
  } else {
    _listeners.push(fn);
  }
}

// ── Nav hydration helpers ─────────────────────────────────────────────────────

/**
 * Highlight the active nav link based on the current pathname.
 */
function _markActiveLink() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav__links a').forEach((a) => {
    const href = a.getAttribute('href') ?? '';
    // Match on the filename portion for relative hrefs.
    const linkPath = href.startsWith('/') ? href : '/' + href;
    if (linkPath === path || (path.endsWith('/') && linkPath === path + 'index.html')) {
      a.classList.add('active');
    }
  });
}

/**
 * Populate .nav__user with the display name and set up the sign-out button.
 * @param {{ displayName: string, email: string }} user
 */
function _hydrateNav(user) {
  const userEl = document.querySelector('.nav__user');
  if (userEl) {
    userEl.textContent = user.displayName || user.email;
    userEl.title = user.email;
    userEl.removeAttribute('hidden');
    userEl.setAttribute('aria-label', `Signed in as ${user.email}`);
  }

  const signoutBtn = document.querySelector('.nav__signout');
  if (signoutBtn) {
    signoutBtn.removeAttribute('hidden');
    signoutBtn.addEventListener('click', async () => {
      signoutBtn.disabled = true;
      try {
        await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ action: 'signout' }),
        });
      } finally {
        window.location.href = '/index.html';
      }
    });
  }
}

// ── Auth check ────────────────────────────────────────────────────────────────

/**
 * Check the session and redirect to login if unauthenticated.
 * Called automatically when the module is imported on a protected page.
 *
 * @param {object} [opts]
 * @param {boolean} [opts.requireAuth=true]  Set false to skip the redirect (index.html).
 */
export async function initDashboard({ requireAuth = true } = {}) {
  _markActiveLink();

  let user = null;
  try {
    const res = await fetch('/api/auth', { credentials: 'same-origin' });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.user) {
        user = data.user;
      }
    } else if (requireAuth && res.status === 401) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login.html?next=${next}`;
      return;
    }
  } catch {
    // Network error — if auth is required and we can't reach the server, redirect.
    if (requireAuth) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login.html?next=${next}`;
      return;
    }
  }

  if (user) {
    _notifyReady(user);
    _hydrateNav(user);
  }

  // Hydrate the public nav (index.html): show/hide sign-in vs account links.
  _hydratePublicNav(user);
}

/**
 * Show/hide the sign-in vs account action in the main marketing nav.
 * Works on pages that include the .nav__auth-action element.
 * @param {object|null} user
 */
function _hydratePublicNav(user) {
  const signInLink  = document.querySelector('.nav__signin');
  const accountLink = document.querySelector('.nav__account');

  if (user) {
    if (signInLink)  signInLink.style.display = 'none';
    if (accountLink) accountLink.style.display = '';
  } else {
    if (signInLink)  signInLink.style.display = '';
    if (accountLink) accountLink.style.display = 'none';
  }
}
