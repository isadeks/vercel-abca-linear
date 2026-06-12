/*!
 * guard.js — Wander route guard and nav auth-state helpers
 *
 * Depends on auth.js (WanderAuth.getSession / clearSession must be loaded first).
 *
 * Public API:
 *   WanderGuard.requireAuth(redirectUrl?)  → void
 *     Redirects to login.html (or redirectUrl) if there is no active session.
 *
 *   WanderGuard.initNav(linkSelector?)     → void
 *     Finds the sign-in/sign-out anchor (default: '#nav-auth-link') and sets
 *     its label and href based on the current session:
 *       • No session  → "Sign in"   linking to login.html
 *       • Has session → "Sign out (Name)" linking to # (clears session on click)
 */

(function (root) {
  'use strict';

  var DEFAULT_LOGIN_URL    = 'login.html';
  var DEFAULT_LINK_SELECTOR = '#nav-auth-link';

  /**
   * Redirect to login if there is no active session.
   * @param {string} [redirectUrl='login.html'] – page to redirect to
   */
  function requireAuth(redirectUrl) {
    var session = root.WanderAuth && root.WanderAuth.getSession
      ? root.WanderAuth.getSession()
      : null;

    if (!session) {
      root.location.href = redirectUrl || DEFAULT_LOGIN_URL;
    }
  }

  /**
   * Toggle the nav auth link between "Sign in" and "Sign out (Name)".
   * @param {string} [linkSelector='#nav-auth-link'] – CSS selector for the <a> element
   */
  function initNav(linkSelector) {
    var selector = linkSelector || DEFAULT_LINK_SELECTOR;
    var el = document.querySelector(selector);
    if (!el) return;

    var session = root.WanderAuth && root.WanderAuth.getSession
      ? root.WanderAuth.getSession()
      : null;

    if (session) {
      var name = (session.displayName || session.email || '').trim();
      el.textContent = 'Sign out' + (name ? ' (' + name + ')' : '');
      el.href = '#';
      el.addEventListener('click', function (e) {
        e.preventDefault();
        if (root.WanderAuth && root.WanderAuth.clearSession) {
          root.WanderAuth.clearSession();
        }
        root.location.href = DEFAULT_LOGIN_URL;
      });
    } else {
      el.textContent = 'Sign in';
      el.href = DEFAULT_LOGIN_URL;
    }
  }

  // Export via CommonJS (Node / bundlers) or attach to window in browsers.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { requireAuth: requireAuth, initNav: initNav };
  } else {
    root.WanderGuard = { requireAuth: requireAuth, initNav: initNav };
  }
}(typeof window !== 'undefined' ? window : this));
