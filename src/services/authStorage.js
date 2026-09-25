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
  window.dispatchEvent(new CustomEvent(AUTH_ROLE_CHANGED_EVENT, { detail: next }));
}
