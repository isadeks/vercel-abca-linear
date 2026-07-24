// Wander client-side auth helper.
//
// Thin wrapper around the /api auth endpoints, plus a nav "account indicator"
// that any page can opt into. Loaded as a classic (non-module) script so it
// works from the static HTML pages without a build step. Exposes `WanderAuth`
// on `window`.
(function () {
  'use strict';

  async function postJson(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = {};
    try { data = await res.json(); } catch { /* empty body */ }
    return { res, data };
  }

  const WanderAuth = {
    // Returns { ok: true, user } or { ok: false, error }.
    async signup(email, password) {
      const { res, data } = await postJson('/api/signup', { email, password });
      return res.ok ? { ok: true, user: data.user } : { ok: false, error: data.error };
    },

    async login(email, password) {
      const { res, data } = await postJson('/api/login', { email, password });
      return res.ok ? { ok: true, user: data.user } : { ok: false, error: data.error };
    },

    async logout() {
      await postJson('/api/logout');
      return { ok: true };
    },

    // Returns the signed-in user object, or null.
    async currentUser() {
      try {
        const res = await fetch('/api/current-session', { credentials: 'same-origin' });
        if (!res.ok) return null;
        const data = await res.json();
        return data.user || null;
      } catch {
        return null;
      }
    },

    // Persist a completed quiz result for the signed-in visitor.
    // Returns { ok: true, result } on success, or { ok: false, error }.
    // For anonymous visitors the endpoint returns 401 and nothing is saved —
    // callers should treat that as a no-op, not an error to surface.
    async saveQuizResult(result) {
      try {
        const { res, data } = await postJson('/api/quiz-results', result);
        return res.ok
          ? { ok: true, result: data.result }
          : { ok: false, error: data.error, status: res.status };
      } catch (err) {
        return { ok: false, error: (err && err.message) || 'Network error' };
      }
    },

    // Fetch the signed-in visitor's saved quiz results (newest first).
    // Returns an array; anonymous visitors (or errors) yield [].
    async quizResults() {
      try {
        const res = await fetch('/api/quiz-results', { credentials: 'same-origin' });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data.results) ? data.results : [];
      } catch {
        return [];
      }
    },

    // Wire up a nav indicator. Pass the <li>/container element; it gets filled
    // with either an "Account" link or a "Sign in" link based on session state.
    async mountNavIndicator(el) {
      if (!el) return;
      const user = await this.currentUser();
      if (user) {
        el.innerHTML =
          '<a href="account.html" title="' + user.email + '">Account</a>';
      } else {
        el.innerHTML = '<a href="account.html">Sign in</a>';
      }
    },
  };

  window.WanderAuth = WanderAuth;

  // Auto-mount: any element with [data-auth-nav] becomes an account indicator.
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-auth-nav]').forEach(function (el) {
      WanderAuth.mountNavIndicator(el);
    });
  });
})();
