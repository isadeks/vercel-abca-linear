/**
 * stores.js — shared in-process store instances.
 * Replace with database adapter calls in production.
 */

/** @type {Map<string, object[]>} Notification store keyed by userId */
export const notificationStore = new Map();

/** @type {Map<string, object>} Preference store keyed by userId */
export const preferenceStore = new Map();
