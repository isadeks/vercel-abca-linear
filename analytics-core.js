/**
 * analytics-core.js
 * Minimal analytics module that tracks events in memory.
 */

const events = [];

/**
 * Track an analytics event.
 * @param {string} event - The event name.
 * @param {Object} [props={}] - Additional properties for the event.
 */
function track(event, props) {
  events.push({
    event: event,
    props: props || {},
    timestamp: Date.now(),
  });
}

/**
 * Returns a copy of all tracked events.
 * @returns {Array}
 */
function getEvents() {
  return events.slice();
}

module.exports = { track, getEvents };
