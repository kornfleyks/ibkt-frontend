// Shared by AuthContext (a component) and MondayService (a plain module
// that can't use context) so both read/write the session the same way.
const AUTH_STORAGE_KEY = "auth";

export function readAuth() {
  const stored = localStorage.getItem(AUTH_STORAGE_KEY);

  return stored ? JSON.parse(stored) : null;
}

export function writeAuth(auth) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

export function clearAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

// Fired on window when the server reports a different role than the stored
// session has (see MondayService's syncRoleFromResponse); AuthProvider
// listens so menus/pages update without a new login.
export const AUTH_ROLE_CHANGED_EVENT = "ibkt:auth-role-changed";

export function updateStoredRole(role) {
  const auth = readAuth();

  if (!auth?.user || !role || auth.user.role === role) {
    return;
  }

  const next = { ...auth, user: { ...auth.user, role } };

  writeAuth(next);
  window.dispatchEvent(
    new CustomEvent(AUTH_ROLE_CHANGED_EVENT, { detail: { auth: next, previousRole: auth.user.role } }),
  );
}

// Why the last session ended, shown once on the login page. sessionStorage
// (this tab only); unavailable storage just means no message is shown.
const SIGN_OUT_REASON_KEY = "ibkt.signOutReason";

export function setSignOutReason(reason) {
  try {
    sessionStorage.setItem(SIGN_OUT_REASON_KEY, reason);
  } catch {
    // No message on the login page - the sign-out itself still happens.
  }
}

// Read and clear are separate so the login page can read during render
// (safe to repeat) and clear afterwards in an effect.
export function readSignOutReason() {
  try {
    return sessionStorage.getItem(SIGN_OUT_REASON_KEY);
  } catch {
    return null;
  }
}

export function clearSignOutReason() {
  try {
    sessionStorage.removeItem(SIGN_OUT_REASON_KEY);
  } catch {
    // Nothing stored or storage unavailable.
  }
}

export function inactiveAccountReason(accountStatus) {
  switch (accountStatus) {
    case "Suspended":
      return "Your account was suspended, so you've been signed out. Contact an Admin if you think this is a mistake.";
    case "Archived":
      return "Your account was archived, so you've been signed out. Contact an Admin if you need access again.";
    default:
      return "Your account is no longer active, so you've been signed out. Contact an Admin if you think this is a mistake.";
  }
}
