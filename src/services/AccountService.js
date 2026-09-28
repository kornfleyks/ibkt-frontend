import { serverGet, serverPost } from "./MondayService";

// The signed-in user's own account (Account page). These go through the
// server's /api/account endpoints, not the Monday proxy - the proxy only
// lets Admins write to the Users board, and passwords must be checked and
// hashed server-side.

function toAccount(account) {
  return {
    ...account,
    lastLogin: account.lastLogin ? new Date(account.lastLogin) : null,
  };
}

export async function getAccount() {
  const { account } = await serverGet("/api/account");

  return toAccount(account);
}

// phone: { number (national, without the country code), country (ISO code) }.
// Resolves { token, user, phone } - the re-issued session and the saved phone.
export function updateProfile({ firstName, lastName, phone }) {
  return serverPost("/api/account/profile", { firstName, lastName, phone });
}

// Resolves { token, user, account }.
export async function changeEmail({ newEmail, currentPassword }) {
  const result = await serverPost("/api/account/email", { newEmail, currentPassword });

  return { ...result, account: toAccount(result.account) };
}

export function changePassword({ currentPassword, newPassword }) {
  return serverPost("/api/account/password", { currentPassword, newPassword });
}

// Sends the full preferences object; resolves the saved (sanitized) one.
export async function savePreferences(preferences) {
  const result = await serverPost("/api/account/preferences", { preferences });

  return result.preferences;
}
