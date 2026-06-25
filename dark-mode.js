/**
 * dark-mode.js — toggle handler + localStorage persistence.
 *
 * The FOUC-prevention inline script (in each page's <head>) already
 * reads localStorage and adds/removes the `dark` class on <html>
 * before the first paint.  This file wires up the button interaction.
 */

const STORAGE_KEY = 'wander-dark-mode';

/** Return true if dark mode is currently active. */
function isDark() {
  return document.documentElement.classList.contains('dark');
}

/** Apply a dark-mode state and persist it. */
function setDark(on) {
  document.documentElement.classList.toggle('dark', on);
  try {
    localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
  } catch (_) {
    // Private-browsing or storage quota — silently ignore.
  }
  updateToggleLabel();
}

/** Sync the aria-label on every toggle button on the page. */
function updateToggleLabel() {
  const dark = isDark();
  document.querySelectorAll('.dark-toggle').forEach((btn) => {
    btn.setAttribute(
      'aria-label',
      dark ? 'Switch to light mode' : 'Switch to dark mode'
    );
    btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
  });
}

/** Toggle handler — attached via event delegation on document. */
function handleToggleClick(e) {
  const btn = e.target.closest('.dark-toggle');
  if (!btn) return;
  setDark(!isDark());
}

document.addEventListener('click', handleToggleClick);

// Sync labels on initial load (class is already set by the head script).
updateToggleLabel();
