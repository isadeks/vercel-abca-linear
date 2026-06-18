// Shared helper utilities for the booking API.

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
