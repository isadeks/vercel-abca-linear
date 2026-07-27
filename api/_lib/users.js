// User accounts — create + look up, backed by the pluggable store.
//
// Keys:
//   user:email:<normalized-email>  -> userId          (email → id index)
//   user:id:<userId>               -> user record     (the account itself)
//
// A "user record" is a plain object: { id, email, passwordHash, createdAt }.
// The passwordHash is a scrypt "salt:hash" string — plaintext is never stored.
import { getStore } from './store.js';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  normalizeEmail,
  isValidEmail,
} from './crypto.js';

const MIN_PASSWORD_LENGTH = 8;

function emailKey(email) {
  return `user:email:${normalizeEmail(email)}`;
}
function idKey(id) {
  return `user:id:${id}`;
}

// Strip secrets before returning a user to callers/clients.
export function publicUser(user) {
  if (!user) return null;
  return { id: user.id, email: user.email, createdAt: user.createdAt };
}

export async function findUserByEmail(email) {
  const store = getStore();
  const id = await store.get(emailKey(email));
  if (!id) return null;
  return store.get(idKey(id));
}

export async function findUserById(id) {
  if (!id) return null;
  return getStore().get(idKey(id));
}

// Register a new account. Throws an Error with a `.code` for the endpoint layer
// to translate into an HTTP status.
export async function createUser(email, password) {
  if (!isValidEmail(email)) {
    throw Object.assign(new Error('A valid email is required.'), { code: 'INVALID_EMAIL' });
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw Object.assign(
      new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`),
      { code: 'WEAK_PASSWORD' },
    );
  }

  const store = getStore();
  const normalized = normalizeEmail(email);
  const existing = await store.get(emailKey(normalized));
  if (existing) {
    throw Object.assign(new Error('An account with that email already exists.'), {
      code: 'EMAIL_TAKEN',
    });
  }

  const user = {
    id: generateToken(16),
    email: normalized,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  await store.set(idKey(user.id), user);
  await store.set(emailKey(normalized), user.id);
  return user;
}

// Verify credentials. Returns the user record on success, or null on failure.
// Same null result for "no such user" and "wrong password" — avoids leaking
// which emails are registered.
export async function authenticate(email, password) {
  const user = await findUserByEmail(email);
  if (!user) return null;
  return verifyPassword(password, user.passwordHash) ? user : null;
}

export { MIN_PASSWORD_LENGTH };
