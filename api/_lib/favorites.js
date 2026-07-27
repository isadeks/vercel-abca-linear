// Per-user favorites — the list of destinations and travel guides a signed-in
// visitor has saved. Backed by the same pluggable store as the auth layer, so
// it inherits durable KV persistence in production and the in-memory fallback
// for local dev / tests (see store.js).
//
// Key:
//   favorites:<userId>  -> array of favorite records
//
// A favorite record is a plain object:
//   { id, type, title, url, region, addedAt }
// where `type` is 'destination' or 'guide', `id` is a stable slug that
// uniquely identifies the saved thing, and `addedAt` is set server-side.
import { getStore } from './store.js';

// Only these kinds of things can be favorited today. Kept as a Set so callers
// can validate cheaply and the list is easy to extend later.
export const FAVORITE_TYPES = new Set(['destination', 'guide']);

function favoritesKey(userId) {
  return `favorites:${userId}`;
}

function str(value) {
  return typeof value === 'string' ? value.trim() : '';
}

// Validate + shape a client-supplied favorite into the record we persist.
// Throws an Error with `.code = 'INVALID_FAVORITE'` for the endpoint layer to
// translate into a 400. Strips any extra fields the client sent.
export function normalizeFavorite(input) {
  const id = str(input?.id);
  const type = str(input?.type);
  const title = str(input?.title);
  const url = str(input?.url);
  const region = str(input?.region);

  if (!id) {
    throw Object.assign(new Error('A favorite id is required.'), { code: 'INVALID_FAVORITE' });
  }
  if (!FAVORITE_TYPES.has(type)) {
    throw Object.assign(new Error('A favorite must be a destination or a guide.'), {
      code: 'INVALID_FAVORITE',
    });
  }
  if (!title) {
    throw Object.assign(new Error('A favorite title is required.'), { code: 'INVALID_FAVORITE' });
  }

  const record = { id, type, title };
  if (url) record.url = url;
  if (region) record.region = region;
  return record;
}

// Return the user's saved favorites (newest last). Always an array.
export async function listFavorites(userId) {
  if (!userId) return [];
  const list = await getStore().get(favoritesKey(userId));
  return Array.isArray(list) ? list : [];
}

export async function isFavorite(userId, id) {
  if (!userId || !id) return false;
  const list = await listFavorites(userId);
  return list.some((f) => f.id === id);
}

// Save a favorite. Idempotent: saving something already saved returns the
// existing list unchanged (no duplicates). Returns the updated list.
export async function addFavorite(userId, item) {
  if (!userId) {
    throw Object.assign(new Error('A user is required.'), { code: 'INVALID_FAVORITE' });
  }
  const favorite = normalizeFavorite(item);
  const store = getStore();
  const list = await listFavorites(userId);
  if (list.some((f) => f.id === favorite.id)) {
    return list;
  }
  const next = [...list, { ...favorite, addedAt: new Date().toISOString() }];
  await store.set(favoritesKey(userId), next);
  return next;
}

// Remove a favorite by id. Idempotent: removing something not saved is a no-op.
// Returns the updated list.
export async function removeFavorite(userId, id) {
  if (!userId || !id) return listFavorites(userId);
  const store = getStore();
  const list = await listFavorites(userId);
  const next = list.filter((f) => f.id !== id);
  if (next.length !== list.length) {
    await store.set(favoritesKey(userId), next);
  }
  return next;
}
