/**
 * countries.js — In-memory Country model with seed data.
 *
 * Schema:
 *   { id: string, name: string, code: string, capital: string, continent: string }
 *
 * In a real deployment this would be backed by a database.  The structure mirrors
 * what a DB layer would expose so swapping it in later is a one-file change.
 */

/** @type {Array<{id: string, name: string, code: string, capital: string, continent: string}>} */
const _countries = [];

let _nextId = 1;

/**
 * Seed a handful of representative countries so tests and manual QA have
 * pre-existing data without needing to call createCountry first.
 */
function _seed() {
  _countries.push(
    { id: String(_nextId++), name: 'France',  code: 'FR', capital: 'Paris',    continent: 'Europe'        },
    { id: String(_nextId++), name: 'Japan',   code: 'JP', capital: 'Tokyo',    continent: 'Asia'          },
    { id: String(_nextId++), name: 'Brazil',  code: 'BR', capital: 'Brasília', continent: 'South America' },
  );
}

_seed();

// ─── Reads ────────────────────────────────────────────────────────────────────

/**
 * Return a shallow copy of all countries.
 * @returns {Array<{id: string, name: string, code: string, capital: string, continent: string}>}
 */
export function listCountries() {
  return _countries.map(c => ({ ...c }));
}

/**
 * Find a single country by its numeric string ID.
 * @param {string} id
 * @returns {{ id: string, name: string, code: string, capital: string, continent: string } | undefined}
 */
export function findCountryById(id) {
  const c = _countries.find(c => c.id === id);
  return c ? { ...c } : undefined;
}

// ─── Writes ───────────────────────────────────────────────────────────────────

/**
 * Create a new country.
 *
 * @param {{ name: string, code: string, capital?: string, continent?: string }} params
 * @returns {{ id: string, name: string, code: string, capital: string, continent: string }}
 * @throws {Error} if name/code are missing or the code is already taken
 */
export function createCountry({ name, code, capital = '', continent = '' }) {
  if (!name || typeof name !== 'string') throw new Error('name is required');
  if (!code || typeof code !== 'string') throw new Error('code is required');

  const normalCode = code.trim().toUpperCase();
  if (_countries.find(c => c.code === normalCode)) {
    throw new Error(`Country code already exists: ${normalCode}`);
  }

  const country = {
    id:        String(_nextId++),
    name:      name.trim(),
    code:      normalCode,
    capital:   (capital ?? '').trim(),
    continent: (continent ?? '').trim(),
  };
  _countries.push(country);
  return { ...country };
}

/**
 * Update fields on an existing country (partial update — only provided fields change).
 *
 * @param {string} id
 * @param {{ name?: string, code?: string, capital?: string, continent?: string }} updates
 * @returns {{ id: string, name: string, code: string, capital: string, continent: string } | null}
 *   Returns null when the id is not found.
 * @throws {Error} if the new code is already taken by a different country
 */
export function updateCountry(id, updates) {
  const idx = _countries.findIndex(c => c.id === id);
  if (idx === -1) return null;

  const { name, code, capital, continent } = updates;

  if (code !== undefined) {
    const normalCode = code.trim().toUpperCase();
    const collision = _countries.find(c => c.code === normalCode && c.id !== id);
    if (collision) throw new Error(`Country code already exists: ${normalCode}`);
    updates = { ...updates, code: normalCode };
  }

  const updated = {
    ..._countries[idx],
    ...(name      !== undefined ? { name:      name.trim()            } : {}),
    ...(updates.code !== undefined ? { code: updates.code             } : {}),
    ...(capital   !== undefined ? { capital:   capital.trim()         } : {}),
    ...(continent !== undefined ? { continent: continent.trim()       } : {}),
  };

  _countries[idx] = updated;
  return { ...updated };
}

/**
 * Delete a country by ID.
 *
 * @param {string} id
 * @returns {boolean} true if the country was found and removed, false if not found
 */
export function deleteCountry(id) {
  const idx = _countries.findIndex(c => c.id === id);
  if (idx === -1) return false;
  _countries.splice(idx, 1);
  return true;
}

// ─── Test helpers ─────────────────────────────────────────────────────────────

/**
 * Reset the store back to seed state — for use in tests only.
 */
export function _resetForTests() {
  _countries.length = 0;
  _nextId = 1;
  _seed();
}
