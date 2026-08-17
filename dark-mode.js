/**
 * Dark mode toggle — wires up the button in the nav and persists
 * the user's preference to localStorage under the key 'wander-theme'.
 *
 * The <html data-theme> attribute is applied *before* this script runs
 * (see the inline <script> in each page's <head>) so there is no flash
 * of unstyled content (FOUC) on page load.
 */

(function () {
  const STORAGE_KEY = 'wander-theme';
  const DARK = 'dark';
  const LIGHT = 'light';

  function getPreferred() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === DARK || stored === LIGHT) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK : LIGHT;
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    const btn = document.getElementById('dark-mode-toggle');
    if (btn) {
      btn.setAttribute('aria-label', theme === DARK ? 'Switch to light mode' : 'Switch to dark mode');
      btn.setAttribute('aria-pressed', String(theme === DARK));
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === DARK ? LIGHT : DARK);
  }

  document.addEventListener('DOMContentLoaded', function () {
    const btn = document.getElementById('dark-mode-toggle');
    if (!btn) return;
    // Apply current theme (already set by inline head script, but re-apply
    // to make sure aria attributes and label are correct after DOM is ready)
    applyTheme(getPreferred());
    btn.addEventListener('click', toggleTheme);
  });
})();
