// Per-user quiz results — save + list, backed by the pluggable store.
//
// The "Where Should I Go?" personality quiz produces a destination match and a
// numeric score. For signed-in visitors we persist each completed result so
// they can review their history later, instead of it being lost on refresh.
// Anonymous visitors are handled entirely at the endpoint layer (nothing is
// saved), so this module always operates on a known userId.
//
// Key:
//   quiz-results:<userId>  -> array of result records (newest first)
//
// A result record is a plain object:
//   { id, destinationId, destinationName, destinationRegion,
//     destinationCountry, score, answers, createdAt }
import { getStore } from './store.js';
import { generateToken } from './crypto.js';

// Cap history so a single account can't grow unbounded in the store. Newest
// results are kept; older ones fall off the end.
export const MAX_RESULTS = 50;

function resultsKey(userId) {
  return `quiz-results:${userId}`;
}

function invalid(message) {
  return Object.assign(new Error(message), { code: 'INVALID_RESULT' });
}

// Validate + shape a raw result payload (from the client) into a stored record.
// Throws an Error with code 'INVALID_RESULT' on bad input.
export function normalizeResult(input) {
  if (!input || typeof input !== 'object') {
    throw invalid('A quiz result object is required.');
  }

  const destinationId = typeof input.destinationId === 'string' ? input.destinationId.trim() : '';
  if (!destinationId) {
    throw invalid('destinationId is required.');
  }

  const score = Number(input.score);
  if (!Number.isFinite(score)) {
    throw invalid('score must be a number.');
  }

  const destinationName =
    typeof input.destinationName === 'string' && input.destinationName.trim()
      ? input.destinationName.trim()
      : destinationId;

  const destinationRegion =
    typeof input.destinationRegion === 'string' ? input.destinationRegion.trim() : '';
  const destinationCountry =
    typeof input.destinationCountry === 'string' ? input.destinationCountry.trim() : '';

  // answers is optional; when present it must be an array of finite numbers.
  let answers = [];
  if (input.answers !== undefined) {
    if (!Array.isArray(input.answers)) {
      throw invalid('answers must be an array.');
    }
    answers = input.answers.map((a) => {
      const n = Number(a);
      if (!Number.isFinite(n)) {
        throw invalid('answers must contain only numbers.');
      }
      return n;
    });
  }

  return {
    destinationId,
    destinationName,
    destinationRegion,
    destinationCountry,
    score,
    answers,
  };
}

// Return a user's saved results, newest first. Always returns an array.
export async function listQuizResults(userId) {
  if (!userId) return [];
  const stored = await getStore().get(resultsKey(userId));
  return Array.isArray(stored) ? stored : [];
}

// Persist a completed quiz result for a signed-in user. Returns the stored
// record (with its generated id + timestamp). Newest results are kept first
// and the history is capped at MAX_RESULTS.
export async function saveQuizResult(userId, input) {
  if (!userId) {
    throw invalid('A userId is required to save a quiz result.');
  }
  const record = {
    id: generateToken(12),
    ...normalizeResult(input),
    createdAt: new Date().toISOString(),
  };
  const store = getStore();
  const existing = await listQuizResults(userId);
  const next = [record, ...existing].slice(0, MAX_RESULTS);
  await store.set(resultsKey(userId), next);
  return record;
}
