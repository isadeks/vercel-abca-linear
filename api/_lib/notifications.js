/**
 * notifications.js — guest notification builder
 *
 * Builds on helpers.js to compose structured notification objects that can be
 * dispatched to guests (email, SMS, push) after booking lifecycle events.
 *
 * Depends on: helpers.js
 */

import {
  formatConfirmation,
  formatCancellation,
  formatModification,
} from './helpers.js';

/** @typedef {'confirmation' | 'cancellation' | 'modification'} NotificationType */

/**
 * Build a notification object for a booking confirmation.
 *
 * @param {string} guestName    - Guest's display name
 * @param {string} destination  - Travel destination
 * @param {string} date         - ISO date string for the booking
 * @returns {{ type: NotificationType, recipient: string, subject: string, body: string }}
 */
export function buildConfirmationNotification(guestName, destination, date) {
  if (!guestName) throw new TypeError('guestName is required');
  if (!destination) throw new TypeError('destination is required');
  if (!date) throw new TypeError('date is required');

  const body = formatConfirmation(destination, date);
  return {
    type: 'confirmation',
    recipient: guestName,
    subject: `Your booking for ${destination} is confirmed`,
    body,
  };
}

/**
 * Build a notification object for a booking cancellation.
 *
 * @param {string} guestName    - Guest's display name
 * @param {string} destination  - Travel destination
 * @param {string} date         - ISO date string for the original booking
 * @returns {{ type: NotificationType, recipient: string, subject: string, body: string }}
 */
export function buildCancellationNotification(guestName, destination, date) {
  if (!guestName) throw new TypeError('guestName is required');
  if (!destination) throw new TypeError('destination is required');
  if (!date) throw new TypeError('date is required');

  const body = formatCancellation(destination, date);
  return {
    type: 'cancellation',
    recipient: guestName,
    subject: `Your booking for ${destination} has been cancelled`,
    body,
  };
}

/**
 * Build a notification object for a booking modification.
 *
 * @param {string} guestName    - Guest's display name
 * @param {string} destination  - Travel destination
 * @param {string} oldDate      - ISO date string for the original booking
 * @param {string} newDate      - ISO date string for the new booking
 * @returns {{ type: NotificationType, recipient: string, subject: string, body: string }}
 */
export function buildModificationNotification(
  guestName,
  destination,
  oldDate,
  newDate,
) {
  if (!guestName) throw new TypeError('guestName is required');
  if (!destination) throw new TypeError('destination is required');
  if (!oldDate) throw new TypeError('oldDate is required');
  if (!newDate) throw new TypeError('newDate is required');

  const body = formatModification(destination, oldDate, newDate);
  return {
    type: 'modification',
    recipient: guestName,
    subject: `Your booking for ${destination} has been updated`,
    body,
  };
}
