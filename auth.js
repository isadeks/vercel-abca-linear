/*
 * Wander — client-side accounts
 * ------------------------------
 * This static site has no server or database, so accounts and sessions live
 * entirely in the browser via localStorage — the same approach the rest of the
 * site uses for client-only state. This file is the shared foundation the
 * account pages (login.html / account.html) and the top navigation build on.
 *
 * Storage model
 *   wander:accounts  → JSON map keyed by lowercased email → account record
 *   wander:session   → email of the currently signed-in account (or absent)
 *
 * Passwords are lightly hashed before storage. This is NOT real security — it
 * only avoids keeping plain-text passwords lying around in localStorage. Never
 * treat a purely client-side account system as protecting anything sensitive.
 */
(function (global) {
  'use strict';

  var ACCOUNTS_KEY = 'wander:accounts';
  var SESSION_KEY = 'wander:session';

  // ── Storage helpers ──────────────────────────────────────────
  function readAccounts() {
    try {
      var raw = localStorage.getItem(ACCOUNTS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function writeAccounts(accounts) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  // A tiny non-cryptographic hash (djb2). Enough to avoid storing the raw
  // password; explicitly NOT a substitute for real server-side auth.
  function hashPassword(password) {
    var hash = 5381;
    var str = String(password);
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
    }
    return 'h' + (hash >>> 0).toString(16);
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ── Public API ───────────────────────────────────────────────

  // Register a new account. Returns { ok: true } or { ok: false, error }.
  function signUp(name, email, password) {
    name = String(name || '').trim();
    var normEmail = normalizeEmail(email);

    if (!name) return { ok: false, error: 'Please enter your name.' };
    if (!isValidEmail(normEmail)) return { ok: false, error: 'Please enter a valid email address.' };
    if (String(password || '').length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters.' };
    }

    var accounts = readAccounts();
    if (accounts[normEmail]) {
      return { ok: false, error: 'An account with that email already exists.' };
    }

    accounts[normEmail] = {
      name: name,
      email: normEmail,
      passwordHash: hashPassword(password),
      bio: '',
      favorites: [],
      createdAt: new Date().toISOString()
    };
    writeAccounts(accounts);
    localStorage.setItem(SESSION_KEY, normEmail);
    return { ok: true };
  }

  // Sign in an existing account. Returns { ok: true } or { ok: false, error }.
  function signIn(email, password) {
    var normEmail = normalizeEmail(email);
    var accounts = readAccounts();
    var account = accounts[normEmail];

    if (!account || account.passwordHash !== hashPassword(password)) {
      return { ok: false, error: 'Email or password is incorrect.' };
    }

    localStorage.setItem(SESSION_KEY, normEmail);
    return { ok: true };
  }

  function signOut() {
    localStorage.removeItem(SESSION_KEY);
  }

  // The signed-in account record, or null. Never exposes the password hash.
  function currentUser() {
    var email = localStorage.getItem(SESSION_KEY);
    if (!email) return null;
    var account = readAccounts()[email];
    if (!account) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return { name: account.name, email: account.email, bio: account.bio || '', createdAt: account.createdAt };
  }

  function isSignedIn() {
    return currentUser() !== null;
  }

  // Update the signed-in account's editable profile fields.
  function updateProfile(fields) {
    var email = localStorage.getItem(SESSION_KEY);
    if (!email) return { ok: false, error: 'You are not signed in.' };

    var accounts = readAccounts();
    var account = accounts[email];
    if (!account) return { ok: false, error: 'Account not found.' };

    var name = String(fields.name != null ? fields.name : account.name).trim();
    if (!name) return { ok: false, error: 'Please enter your name.' };

    account.name = name;
    if (fields.bio != null) account.bio = String(fields.bio).trim();
    accounts[email] = account;
    writeAccounts(accounts);
    return { ok: true };
  }

  // ── Favorite places ──────────────────────────────────────────
  // Favorites are tied to the signed-in account and persist in localStorage
  // (inside the account record) between visits. Each favorite is a small
  // record: { id, title, url } where `id` is the guide URL used as a stable
  // key so the same place can't be saved twice.

  // Return the signed-in account's saved favorites (newest first), or [].
  function getFavorites() {
    var email = localStorage.getItem(SESSION_KEY);
    if (!email) return [];
    var account = readAccounts()[email];
    if (!account || !Array.isArray(account.favorites)) return [];
    // Return copies so callers can't mutate stored state directly.
    return account.favorites.map(function (f) {
      return { id: f.id, title: f.title, url: f.url };
    });
  }

  // Is a given place (by id) in the signed-in account's favorites?
  function isFavorite(id) {
    id = String(id || '');
    return getFavorites().some(function (f) { return f.id === id; });
  }

  // Add or update a favorite. Returns { ok, error }. Requires sign-in.
  function addFavorite(place) {
    var email = localStorage.getItem(SESSION_KEY);
    if (!email) return { ok: false, error: 'You are not signed in.' };
    place = place || {};
    var id = String(place.id || '').trim();
    if (!id) return { ok: false, error: 'A favorite needs an id.' };

    var accounts = readAccounts();
    var account = accounts[email];
    if (!account) return { ok: false, error: 'Account not found.' };
    if (!Array.isArray(account.favorites)) account.favorites = [];

    var record = {
      id: id,
      title: String(place.title || id).trim(),
      url: String(place.url || id).trim()
    };
    var existing = account.favorites.filter(function (f) { return f.id !== id; });
    existing.unshift(record);
    account.favorites = existing;
    accounts[email] = account;
    writeAccounts(accounts);
    return { ok: true };
  }

  // Remove a favorite by id. Returns { ok, error }. Requires sign-in.
  function removeFavorite(id) {
    var email = localStorage.getItem(SESSION_KEY);
    if (!email) return { ok: false, error: 'You are not signed in.' };
    id = String(id || '');

    var accounts = readAccounts();
    var account = accounts[email];
    if (!account) return { ok: false, error: 'Account not found.' };
    if (!Array.isArray(account.favorites)) account.favorites = [];

    account.favorites = account.favorites.filter(function (f) { return f.id !== id; });
    accounts[email] = account;
    writeAccounts(accounts);
    return { ok: true };
  }

  // Toggle a favorite on or off. Returns { ok, favorited, error }.
  function toggleFavorite(place) {
    place = place || {};
    var id = String(place.id || '').trim();
    if (isFavorite(id)) {
      var removed = removeFavorite(id);
      return { ok: removed.ok, favorited: false, error: removed.error };
    }
    var added = addFavorite(place);
    return { ok: added.ok, favorited: added.ok ? true : isFavorite(id), error: added.error };
  }

  // ── Shared nav entry point ───────────────────────────────────
  // Injects an account link into the page's top nav, matching whichever nav
  // markup the page uses:
  //   • home page   → <ul class="nav__links"> ... </ul>  (adds an <li>)
  //   • inner pages → logo + single <a class="nav__back"> (adds a sibling link)
  // Shows "Sign in" when logged out, or the person's name when logged in.
  function renderNav() {
    var nav = document.querySelector('.nav');
    if (!nav) return;

    var user = currentUser();
    var label = user ? user.name : 'Sign in';
    var href = 'account.html';

    var links = nav.querySelector('.nav__links');
    if (links) {
      // Home-style nav: append a list item styled like the other links.
      var existing = links.querySelector('.nav__account');
      var li = existing ? existing.closest('li') : document.createElement('li');
      li.className = 'nav__account-item';
      li.innerHTML = '';
      var a = document.createElement('a');
      a.className = 'nav__account';
      a.href = href;
      a.textContent = label;
      li.appendChild(a);
      links.appendChild(li);
    } else {
      // Inner-page nav: logo on the left, then the existing "back" link and a
      // new account link grouped together on the right. We wrap them in a flex
      // container so the nav's `justify-content: space-between` keeps the logo
      // pinned left and the link group pinned right (rather than spreading
      // three separate items across the bar).
      var group = nav.querySelector('.nav__group');
      if (!group) {
        group = document.createElement('div');
        group.className = 'nav__group';
        group.style.display = 'flex';
        group.style.alignItems = 'center';
        group.style.gap = '24px';
        var back = nav.querySelector('.nav__back');
        if (back) group.appendChild(back);
        nav.appendChild(group);
      }
      var current = group.querySelector('.nav__account');
      if (current) current.remove();
      var link = document.createElement('a');
      link.className = 'nav__back nav__account';
      link.href = href;
      link.textContent = label;
      group.appendChild(link);
    }
  }

  // Redirect to login when a page requires authentication (used by account.html).
  function requireAuth(redirectTo) {
    if (!isSignedIn()) {
      window.location.replace(redirectTo || 'login.html');
      return false;
    }
    return true;
  }

  global.WanderAuth = {
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    currentUser: currentUser,
    isSignedIn: isSignedIn,
    updateProfile: updateProfile,
    getFavorites: getFavorites,
    isFavorite: isFavorite,
    addFavorite: addFavorite,
    removeFavorite: removeFavorite,
    toggleFavorite: toggleFavorite,
    renderNav: renderNav,
    requireAuth: requireAuth
  };

  // Auto-wire the nav on every page that includes this script.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderNav);
  } else {
    renderNav();
  }
})(window);
