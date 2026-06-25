// OAuth account-linking module.
//
// Handles the "find or create user" logic for OAuth logins:
//   1. Look up the provider account (by provider + providerAccountId).
//   2. If found → return the linked userId.
//   3. If not found but the profile has an email → look for an existing user
//      by email and link the new account to them.
//   4. Otherwise → create a brand-new user + account row.
//
// Dependencies:
//   · userAdapter  — { createUser, findUserById, findUserByEmail, createAccount, findAccountByProvider }
//   · sessionAdapter — passed through to createSession()

let _userAdapter = null;

/**
 * Register a user / account adapter.
 * @param {{ createUser, findUserById, findUserByEmail, createAccount, findAccountByProvider }} adapter
 */
export function setUserAdapter(adapter) {
  _userAdapter = adapter;
}

/** Returns the active adapter or throws if none has been registered. */
function userAdapter() {
  if (!_userAdapter) {
    throw new Error(
      'No user adapter configured. Call setUserAdapter() before using OAuth helpers.',
    );
  }
  return _userAdapter;
}

/**
 * Find-or-create a user for an incoming OAuth profile.
 *
 * @param {string}  provider          "google" | "github"
 * @param {string}  providerAccountId Unique account ID from the provider
 * @param {{ email: string|null, name: string }} profile
 * @returns {Promise<{ userId: string, isNewUser: boolean }>}
 */
export async function findOrCreateOAuthUser(provider, providerAccountId, profile) {
  const adapter = userAdapter();

  // 1. Check for an existing linked account.
  const existingAccount = await adapter.findAccountByProvider(
    provider,
    providerAccountId,
  );

  if (existingAccount) {
    return { userId: existingAccount.userId, isNewUser: false };
  }

  // 2. Try to find an existing user by email (account-linking).
  let user = null;
  if (profile.email) {
    user = await adapter.findUserByEmail(profile.email);
  }

  // 3. Create a new user if none found.
  if (!user) {
    user = await adapter.createUser({
      email: profile.email,
      name:  profile.name,
    });
  }

  // 4. Create the OAuth account row.
  await adapter.createAccount({
    userId:            user.id,
    provider,
    providerAccountId,
  });

  return { userId: user.id, isNewUser: !existingAccount };
}
