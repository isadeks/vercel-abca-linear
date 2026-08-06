/**
 * dark-mode.js
 * Persists the user's dark/light preference in localStorage and applies it
 * to <html class="dark"> across every page.
 *
 * Usage: include this script in every page before </body>.
 * Each page's nav must contain a <button class="dark-toggle"> element.
 */
(function () {
  const KEY = 'wander-dark-mode';
  const DARK_CLASS = 'dark';

  // Apply saved preference immediately (before paint) to avoid flash.
  // This IIFE runs synchronously when the script tag is parsed.
  function applyPreference(dark) {
    if (dark) {
      document.documentElement.classList.add(DARK_CLASS);
    } else {
      document.documentElement.classList.remove(DARK_CLASS);
    }
  }

  const stored = localStorage.getItem(KEY);
  // If no stored preference, default to system preference.
  const prefersDark =
    stored !== null
      ? stored === 'true'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;

  applyPreference(prefersDark);

  // Wire up all toggle buttons once DOM is ready.
  document.addEventListener('DOMContentLoaded', function () {
    const buttons = document.querySelectorAll('.dark-toggle');

    function updateButtons(dark) {
      buttons.forEach(function (btn) {
        const icon = btn.querySelector('.dark-toggle__icon');
        const label = btn.querySelector('.dark-toggle__label');
        if (icon) icon.textContent = dark ? '☀' : '☽';
        if (label) label.textContent = dark ? 'Light' : 'Dark';
        btn.setAttribute('aria-pressed', String(dark));
        btn.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
      });
    }

    function toggle() {
      const isDark = document.documentElement.classList.toggle(DARK_CLASS);
      localStorage.setItem(KEY, String(isDark));
      updateButtons(isDark);
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', toggle);
    });

    // Sync initial button state.
    updateButtons(document.documentElement.classList.contains(DARK_CLASS));
  });
})();
