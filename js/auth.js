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

  async function requestJson(url, options) {
    const res = await fetch(url, Object.assign({ credentials: 'same-origin' }, options));
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

    // ── Favorites ──────────────────────────────────────────────────────────
    // Thin wrappers around /api/favorites. Each resolves to
    // { ok, favorites?, error?, needsAuth? } so callers can distinguish an
    // anonymous visitor (needsAuth) from other failures.

    // List the signed-in visitor's saved favorites.
    async listFavorites() {
      try {
        const { res, data } = await requestJson('/api/favorites');
        if (res.ok) return { ok: true, favorites: data.favorites || [] };
        return { ok: false, needsAuth: res.status === 401, error: data.error };
      } catch {
        return { ok: false, error: 'Network error. Please try again.' };
      }
    },

    // Save a favorite. `item` = { id, type, title, url?, region? }.
    async addFavorite(item) {
      try {
        const { res, data } = await requestJson('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
        if (res.ok) return { ok: true, favorites: data.favorites || [] };
        return { ok: false, needsAuth: res.status === 401, error: data.error };
      } catch {
        return { ok: false, error: 'Network error. Please try again.' };
      }
    },

    // Remove a favorite by id.
    async removeFavorite(id) {
      try {
        const { res, data } = await requestJson(
          '/api/favorites?id=' + encodeURIComponent(id),
          { method: 'DELETE' },
        );
        if (res.ok) return { ok: true, favorites: data.favorites || [] };
        return { ok: false, needsAuth: res.status === 401, error: data.error };
      } catch {
        return { ok: false, error: 'Network error. Please try again.' };
      }
    },

    // Inject the small stylesheet the favorite buttons use — once per page.
    _ensureFavoriteStyles() {
      if (document.getElementById('wander-favorite-styles')) return;
      const style = document.createElement('style');
      style.id = 'wander-favorite-styles';
      style.textContent =
        '.wander-fav-btn{display:inline-flex;align-items:center;gap:8px;cursor:pointer;' +
        'font-family:inherit;font-size:0.78rem;font-weight:500;letter-spacing:0.1em;' +
        'text-transform:uppercase;padding:11px 20px;border-radius:999px;' +
        'border:1px solid #2a7a6f;color:#2a7a6f;background:transparent;' +
        'transition:background 0.2s,color 0.2s,opacity 0.2s;}' +
        '.wander-fav-btn:hover{background:#2a7a6f;color:#fff;}' +
        '.wander-fav-btn[aria-pressed="true"]{background:#2a7a6f;color:#fff;}' +
        '.wander-fav-btn:disabled{opacity:0.5;cursor:default;}' +
        '.wander-fav-btn__icon{font-size:0.95rem;line-height:1;}' +
        '.wander-fav-note{font-size:0.78rem;color:#6b6560;margin-top:8px;}' +
        '.wander-fav-note a{color:#2a7a6f;border-bottom:1px solid currentColor;}';
      document.head.appendChild(style);
    },

    // Turn an element into a save/favorite control for the destination or guide
    // it describes via data attributes:
    //   data-fav-id, data-fav-type, data-fav-title, data-fav-url?, data-fav-region?
    // Anonymous visitors are prompted to sign in (with a link) instead of being
    // blocked; signed-in visitors can toggle the favorite on/off.
    async mountFavoriteButton(el) {
      if (!el || el.dataset.favMounted === 'true') return;
      el.dataset.favMounted = 'true';
      this._ensureFavoriteStyles();

      const item = {
        id: el.dataset.favId,
        type: el.dataset.favType || 'destination',
        title: el.dataset.favTitle,
        url: el.dataset.favUrl || (location.pathname.split('/').pop() || ''),
        region: el.dataset.favRegion || '',
      };
      if (!item.id || !item.title) return;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wander-fav-btn';
      const note = document.createElement('p');
      note.className = 'wander-fav-note';
      note.hidden = true;
      el.appendChild(btn);
      el.appendChild(note);

      const label = (saved) =>
        '<span class="wander-fav-btn__icon" aria-hidden="true">' +
        (saved ? '♥' : '♡') + '</span>' +
        '<span>' + (saved ? 'Saved' : 'Save') + '</span>';

      const render = (saved) => {
        btn.setAttribute('aria-pressed', String(saved));
        btn.innerHTML = label(saved);
      };

      // Resolve initial state from the current session + saved list.
      let saved = false;
      let signedIn = false;
      const list = await this.listFavorites();
      if (list.ok) {
        signedIn = true;
        saved = list.favorites.some((f) => f.id === item.id);
      }
      render(saved);

      const promptSignIn = () => {
        note.hidden = false;
        note.innerHTML =
          'Please <a href="account.html">sign in</a> to save favorites.';
      };

      btn.addEventListener('click', async () => {
        note.hidden = true;
        if (!signedIn) { promptSignIn(); return; }
        btn.disabled = true;
        const result = saved
          ? await this.removeFavorite(item.id)
          : await this.addFavorite(item);
        if (result.ok) {
          saved = !saved;
          render(saved);
        } else if (result.needsAuth) {
          signedIn = false;
          promptSignIn();
        } else {
          note.hidden = false;
          note.textContent = result.error || 'Something went wrong.';
        }
        btn.disabled = false;
      });
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

  // Auto-mount: [data-auth-nav] → account indicator; [data-fav-button] →
  // save/favorite control for the destination or guide it describes.
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-auth-nav]').forEach(function (el) {
      WanderAuth.mountNavIndicator(el);
    });
    document.querySelectorAll('[data-fav-button]').forEach(function (el) {
      WanderAuth.mountFavoriteButton(el);
    });
  });
})();
