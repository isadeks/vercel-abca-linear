// Shared helper utilities for the booking API.

// INTENTIONAL DEMO FAILURE: unused variable introduced during refactor.
// This violates the no-unused-vars rule and causes the build to exit non-zero.
// Do NOT fix or add eslint-disable — this is a governance demo of the build gate.
const _unusedRefactoredHelper = (x) => x * 2;

/**
 * Formats a booking confirmation message.
 * @param {string} destination
 * @param {string} date
 * @returns {string}
 */
export function formatConfirmation(destination, date) {
  return `Booking confirmed for ${destination} on ${date}.`;
}
