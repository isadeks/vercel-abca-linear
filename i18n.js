/**
 * i18n.js — Vanilla, dependency-free i18n framework.
 *
 * API:
 *   getLocale()         → current locale code (default: 'en')
 *   setLocale(code)     → switch active locale (loads strings from locales/<code>.json)
 *   t(key)              → look up a dot-separated key in the active locale's strings
 *                         (e.g. t('nav.home'), t('hero.title'))
 *
 * Locale persistence is intentionally left to a downstream step.
 */

(function (root, factory) {
  /* UMD wrapper: supports CommonJS (Node/bundlers), AMD, and plain <script> tags */
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.i18n = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /** @type {string} */
  var _locale = 'en';

  /** @type {Object.<string, object>} In-memory cache of loaded locale data */
  var _catalog = {};

  /**
   * Retrieve a nested value from an object using a dot-separated key path.
   * Returns the key itself if no match is found (graceful fallback).
   *
   * @param {object} obj
   * @param {string} key  e.g. 'nav.home'
   * @returns {string}
   */
  function _resolve(obj, key) {
    var parts = key.split('.');
    var cursor = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cursor == null || typeof cursor !== 'object') {
        return key; // missing branch → return raw key
      }
      cursor = cursor[parts[i]];
    }
    return (cursor !== undefined && cursor !== null) ? String(cursor) : key;
  }

  /**
   * Load locale strings synchronously via XMLHttpRequest.
   * Falls back silently if the file cannot be fetched.
   *
   * @param {string} code  locale code, e.g. 'en'
   */
  function _load(code) {
    if (_catalog[code]) return; // already cached

    // XHR is only available in browser environments.
    // In non-browser environments (Node, bundlers) use register() to pre-load strings.
    if (typeof XMLHttpRequest === 'undefined') {
      _catalog[code] = {};
      return;
    }

    var url = 'locales/' + code + '.json';
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false /* synchronous */);
    try {
      xhr.send(null);
      if (xhr.status === 200 || xhr.status === 0) {
        _catalog[code] = JSON.parse(xhr.responseText);
      } else {
        _catalog[code] = {};
      }
    } catch (e) {
      // Silent fallback; t() will return the raw key
      _catalog[code] = {};
    }
  }

  /**
   * Register locale strings directly (useful for bundler environments or
   * inline pre-loading, avoiding an XHR fetch).
   *
   * @param {string} code
   * @param {object} strings
   */
  function register(code, strings) {
    _catalog[code] = strings;
  }

  /**
   * Return the active locale code.
   * @returns {string}
   */
  function getLocale() {
    return _locale;
  }

  /**
   * Switch the active locale.
   * Attempts to load strings for the new locale if they aren't already cached.
   *
   * @param {string} code  BCP-47 locale code, e.g. 'en', 'fr', 'de'
   */
  function setLocale(code) {
    _locale = code;
    if (!_catalog[code]) {
      _load(code);
    }
  }

  /**
   * Translate a dot-separated key using the active locale's strings.
   *
   * @param {string} key  e.g. 'nav.home', 'hero.title', 'hero.cta'
   * @returns {string}    Translated string, or the raw key if not found.
   */
  function t(key) {
    var strings = _catalog[_locale];
    if (!strings) {
      _load(_locale);
      strings = _catalog[_locale] || {};
    }
    return _resolve(strings, key);
  }

  return { t: t, getLocale: getLocale, setLocale: setLocale, register: register };
}));
