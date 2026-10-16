/**
 * profile.js — Profile-update logic for the account module.
 *
 * Provides `updateProfile()`, a thin, validated wrapper around `updateUser()`
 * that restricts callers to the three user-editable profile fields:
 *   • displayName
 *   • email
 *   • avatarUrl
 *
 * Non-profile fields (passwordHash, 2FA settings, notification prefs, etc.)
 * cannot be changed via this helper; use the dedicated account helpers for those.
 *
 * Validation rules
 * ────────────────
 *   displayName  — string, 1–100 chars (trimmed), must not be blank
 *   email        — string, basic RFC-5322-like format check, max 254 chars
 *   avatarUrl    — string, must start with http:// or https://, max 2048 chars
 *                  (empty string '' is allowed to clear the avatar)
 *
 * At least one field must be provided in every call.
 */

import { updateUser } from './account.js';

// ── Validation helpers ───────────────────────────────────────────────────────

/**
 * Validate a displayName value.
 * @param {unknown} value
 * @returns {string}  Trimmed name.
 * @throws {Error}  If invalid.
 */
function validateDisplayName(value) {
  if (typeof value !== 'string') {
    throw new Error('displayName must be a string');
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error('displayName must not be blank');
  }
  if (trimmed.length > 100) {
    throw new Error('displayName must be 100 characters or fewer');
  }
  return trimmed;
}

/**
 * Validate an email address (basic structural check — not full RFC 5322).
 * @param {unknown} value
 * @returns {string}  Normalised (trimmed, lower-cased) email.
 * @throws {Error}  If invalid.
 */
function validateEmail(value) {
  if (typeof value !== 'string') {
    throw new Error('email must be a string');
  }
  const normalised = value.trim().toLowerCase();
  if (normalised.length === 0) {
    throw new Error('email must not be blank');
  }
  if (normalised.length > 254) {
    throw new Error('email must be 254 characters or fewer');
  }
  // Require at least one character before @, at least one character between @ and .,
  // and at least two characters after the last dot.
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRe.test(normalised)) {
    throw new Error('email is not a valid email address');
  }
  return normalised;
}

/**
 * Validate an avatarUrl value.
 * An empty string is permitted (clears the avatar).
 * @param {unknown} value
 * @returns {string}  The URL as-is (after trimming).
 * @throws {Error}  If invalid.
 */
function validateAvatarUrl(value) {
  if (typeof value !== 'string') {
    throw new Error('avatarUrl must be a string');
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    return trimmed; // clearing the avatar is allowed
  }
  if (trimmed.length > 2048) {
    throw new Error('avatarUrl must be 2048 characters or fewer');
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error('avatarUrl must start with http:// or https://');
  }
  return trimmed;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Update a user's editable profile fields with validation.
 *
 * Only the fields present in `fields` are updated; omitted fields are left
 * unchanged.  At least one field must be supplied.
 *
 * @param {string} userId  - ID of the user to update.
 * @param {object} fields  - Partial profile: { displayName?, email?, avatarUrl? }
 * @returns {{ userId: string, displayName: string, email: string, avatarUrl: string, updatedAt: string }}
 *   The updated profile subset.
 * @throws {Error}  If validation fails, no fields are supplied, or the user
 *   does not exist / is deleted (propagated from updateUser).
 */
export function updateProfile(userId, fields = {}) {
  const { displayName, email, avatarUrl } = fields;

  const hasDisplayName = displayName !== undefined;
  const hasEmail       = email       !== undefined;
  const hasAvatarUrl   = avatarUrl   !== undefined;

  if (!hasDisplayName && !hasEmail && !hasAvatarUrl) {
    throw new Error('updateProfile: at least one of displayName, email, or avatarUrl must be provided');
  }

  const changes = {};

  if (hasDisplayName) {
    changes.displayName = validateDisplayName(displayName);
  }
  if (hasEmail) {
    changes.email = validateEmail(email);
  }
  if (hasAvatarUrl) {
    changes.avatarUrl = validateAvatarUrl(avatarUrl);
  }

  const updated = updateUser(userId, changes);

  // Return only the profile-relevant subset so the route never leaks
  // passwordHash or other sensitive fields.
  return {
    userId:      updated.userId,
    displayName: updated.displayName,
    email:       updated.email,
    avatarUrl:   updated.avatarUrl,
    updatedAt:   updated.updatedAt,
  };
}
