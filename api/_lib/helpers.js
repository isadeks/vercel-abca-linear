/**
 * helpers.js — shared booking API helper utilities
 *
 * Provides core message-formatting functions used across the booking API.
 * This is the shared helper that ABCA-391 refactored; ABCA-392 adds a
 * notification module on top of it.
 */

/**
 * Formats a booking confirmation message.
 * @param {string} destination
 * @param {string} date
 * @returns {string}
 */
export function formatConfirmation(destination, date) {
  return `Booking confirmed for ${destination} on ${date}.`;
}

/**
 * Formats a booking cancellation message.
 * @param {string} destination
 * @param {string} date
 * @returns {string}
 */
export function formatCancellation(destination, date) {
  return `Booking cancelled for ${destination} on ${date}.`;
}

/**
 * Formats a booking modification message.
 * @param {string} destination
 * @param {string} oldDate
 * @param {string} newDate
 * @returns {string}
 */
export function formatModification(destination, oldDate, newDate) {
  return `Booking for ${destination} changed from ${oldDate} to ${newDate}.`;
}
