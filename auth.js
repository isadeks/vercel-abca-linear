/*!
 * auth.js — Wander client-side session helpers
 *
 * Session schema (stored in localStorage under key "wander_session"):
 * <!--
 *   Session {
 *     email       : string  — the user's email address
 *     displayName : string  — human-readable name shown in the UI
 *     signedInAt  : string  — ISO 8601 timestamp of when the session was created
 *   }
 *
 *   Storage key : "wander_session"
 *   Encoding    : JSON.stringify / JSON.parse
 * -->
 *
 * Public API:
 *   getSession()          → Session | null
 *   setSession(session)   → void
 *   clearSession()        → void
 */

(function (root) {
  'use strict';

  var STORAGE_KEY = 'wander_session';

  /**
   * Retrieve the current session from localStorage.
   * @returns {Object|null} Session object or null if none exists.
   */
  function getSession() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  /**
   * Persist a session to localStorage.
   * @param {{ email: string, displayName: string, signedInAt: string }} session
   */
  function setSession(session) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      // Storage may be unavailable (private-browsing quota, etc.) — fail silently.
    }
  }

  /**
   * Remove the current session from localStorage.
   */
  function clearSession() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // Fail silently.
    }
  }

  // Export via CommonJS (Node / bundlers) or attach to window in browsers.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getSession: getSession, setSession: setSession, clearSession: clearSession };
  } else {
    root.WanderAuth = { getSession: getSession, setSession: setSession, clearSession: clearSession };
  }
}(typeof window !== 'undefined' ? window : this));
