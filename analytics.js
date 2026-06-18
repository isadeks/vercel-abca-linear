/**
 * analytics.js — Shared client-side event tracker (Analytics SDK)
 *
 * Dependency-free. No network requests are made.
 * All events are stored in an in-memory queue for the current page session.
 *
 * =============================================================================
 * EVENT SCHEMA
 * =============================================================================
 *
 * Each event pushed to the queue has the following shape:
 *
 *   {
 *     eventName : string       — Identifier for the event (e.g. "page_view")
 *     props     : Object       — Arbitrary key/value metadata for the event
 *     timestamp : string       — ISO-8601 UTC timestamp (set automatically)
 *   }
 *
 * Common `props` keys (by convention):
 *
 *   page        : string  — The pathname/URL of the current page
 *   referrer    : string  — document.referrer at time of event
 *   title       : string  — document.title at time of event
 *   userId      : string  — Opaque user/session identifier (optional)
 *   [custom]    : *       — Any additional properties relevant to the event
 *
 * Example events:
 *
 *   track("page_view",   { page: "/destinations.html", title: "Destinations" })
 *   track("cta_click",   { page: "/index.html", label: "Explore Now" })
 *   track("quiz_start",  { page: "/quiz.html" })
 *   track("quiz_finish", { page: "/quiz.html", score: 4, total: 5 })
 *   track("link_click",  { page: "/kyoto-guide.html", href: "/destinations.html" })
 *
 * =============================================================================
 * USAGE
 * =============================================================================
 *
 *   <script src="/analytics.js"></script>
 *   <script>
 *     Analytics.track("page_view", { page: location.pathname });
 *   </script>
 *
 * Or, if loaded as an ES module:
 *
 *   import { track, getQueue } from "/analytics.js";
 *   track("page_view", { page: location.pathname });
 *
 * =============================================================================
 */

(function (root, factory) {
  /* UMD wrapper — works as a plain <script>, AMD module, or CommonJS module */
  if (typeof define === "function" && define.amd) {
    define([], factory);
  } else if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.Analytics = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /** @type {Array<{eventName: string, props: Object, timestamp: string}>} */
  var _queue = [];

  /**
   * Track an analytics event.
   *
   * @param {string} eventName - Name of the event to record.
   * @param {Object} [props={}] - Arbitrary key/value properties for the event.
   * @returns {void}
   */
  function track(eventName, props) {
    if (typeof eventName !== "string" || eventName.trim() === "") {
      console.warn("[Analytics] track() requires a non-empty eventName string.");
      return;
    }

    var event = {
      eventName: eventName,
      props: props && typeof props === "object" ? props : {},
      timestamp: new Date().toISOString(),
    };

    _queue.push(event);

    // eslint-disable-next-line no-console
    console.debug("[Analytics] event tracked:", event);
  }

  /**
   * Return a shallow copy of the current event queue.
   * Useful for testing or flushing events to a backend later.
   *
   * @returns {Array<{eventName: string, props: Object, timestamp: string}>}
   */
  function getQueue() {
    return _queue.slice();
  }

  /**
   * Clear all events from the in-memory queue.
   * Primarily intended for testing scenarios.
   *
   * @returns {void}
   */
  function clearQueue() {
    _queue = [];
  }

  return {
    track: track,
    getQueue: getQueue,
    clearQueue: clearQueue,
  };
});
