/**
 * countries.js — In-memory Country model (admin-managed).
 *
 * Schema:
 *   { id: string, name: string, description: string, createdBy: string }
 *
 * Only admins can create countries; all authenticated users can browse them.
 */

/** @type {Array<{id: string, name: string, description: string, createdBy: string}>} */
const _countries = [];

let _nextId = 1;

/**
 * Seed a handful of countries so the UI has something to show immediately.
 */
function _seed() {
  _countries.push(
    { id: String(_nextId++), name: 'France',  description: 'Wine, art, and the Eiffel Tower.', createdBy: '1' },
    { id: String(_nextId++), name: 'Japan',   description: 'Bullet trains, sushi, and cherry blossoms.', createdBy: '1' },
    { id: String(_nextId++), name: 'Brazil',  description: 'Carnival, the Amazon, and Copacabana.', createdBy: '1' },
  );
}

_seed();

/**
 * Return all countries.
 * @returns {Array<{id: string, name: string, description: string, createdBy: string}>}
 */
export function listCountries() {
  return [..._countries];
}

/**
 * Find a country by id.
 * @param {string} id
 * @returns {{id: string, name: string, description: string, createdBy: string}|undefined}
 */
export function findCountryById(id) {
  return _countries.find(c => c.id === id);
}

/**
 * Create a new country (admin only — caller is responsible for enforcing this).
 * @param {{ name: string, description?: string, createdBy: string }} params
 * @returns {{id: string, name: string, description: string, createdBy: string}}
 * @throws {Error} if name is missing or already taken
 */
export function createCountry({ name, description = '', createdBy }) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new Error('name is required');
  }
  const normalised = name.trim();
  if (_countries.some(c => c.name.toLowerCase() === normalised.toLowerCase())) {
    throw new Error(`Country already exists: ${normalised}`);
  }
  const country = {
    id: String(_nextId++),
    name: normalised,
    description: description.trim(),
    createdBy,
  };
  _countries.push(country);
  return { ...country };
}

/**
 * Reset to seed state — for tests only.
 */
export function _resetForTests() {
  _countries.length = 0;
  _nextId = 1;
  _seed();
}
