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
