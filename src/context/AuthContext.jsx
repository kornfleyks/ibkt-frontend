import { useCallback, useEffect, useState } from "react";
import * as AuthService from "../services/AuthService";
import { serverPost } from "../services/MondayService";
import { connectSessionEvents } from "../services/sessionEvents";
import {
  readAuth,
  writeAuth,
  clearAuth,
  updateStoredRole,
  setSignOutReason,
  inactiveAccountReason,
  AUTH_ROLE_CHANGED_EVENT,
} from "../services/authStorage";
import { AuthContext } from "./authContextInstance";

function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readAuth);
  // { from, to } after a live role change, until the notice is dismissed.
  // ProtectedRoute also uses it to send someone to the Dashboard (rather
  // than Forbidden) when the change removed access to the current page.
  const [roleChange, setRoleChange] = useState(null);

  // A role change arrives via updateStoredRole - from the live session
  // stream below or from any server response (see MondayService); adopt it
  // so menus and route guards update in place.
  useEffect(() => {
    function handleRoleChanged(event) {
      const { auth: nextAuth, previousRole } = event.detail;

      setAuth(nextAuth);
      setRoleChange({ from: previousRole, to: nextAuth.user.role });
    }

    window.addEventListener(AUTH_ROLE_CHANGED_EVENT, handleRoleChanged);

    return () => window.removeEventListener(AUTH_ROLE_CHANGED_EVENT, handleRoleChanged);
  }, []);

  const token = auth?.token ?? null;

  // While signed in, keep the server's session stream open so a role change
  // or suspension made by an Admin (in the app or directly on Monday)
  // applies immediately, without the person clicking anything.
  useEffect(() => {
    if (!token) {
      return undefined;
    }

    function signOutInactive(accountStatus) {
      setSignOutReason(inactiveAccountReason(accountStatus));
      clearAuth();
      // ProtectedRoute sends a signed-out user to /login.
      setAuth(null);
    }

    return connectSessionEvents({
      onAccount: ({ role, accountStatus }) => {
        if (accountStatus !== "Active") {
          signOutInactive(accountStatus);
          return;
        }

        updateStoredRole(role);
      },
      onUnauthorized: () => signOutInactive(null),
    });
  }, [token]);

  async function login(email, password) {
    const { token: nextToken, user, preferences } = await AuthService.login(email, password);
    const nextAuth = { token: nextToken, user, preferences: preferences ?? {} };

    setAuth(nextAuth);
    setRoleChange(null);
    writeAuth(nextAuth);
  }

  // Merges { token?, user?, preferences? } into the current session - after
  // a profile/email change (the server re-issues the token) or a
  // preferences change - so the header, sidebar and route guards update in
  // place. Reads storage rather than state so back-to-back calls compose.
  const updateSession = useCallback((changes) => {
    const current = readAuth();

    if (!current) {
      return;
    }

    const nextAuth = {
      ...current,
      ...changes,
      user: changes.user ? { ...current.user, ...changes.user } : current.user,
    };

    writeAuth(nextAuth);
    setAuth(nextAuth);
  }, []);

  function logout() {
    // Fire-and-forget: this has to go out while the token is still valid
    // (before clearAuth), but logout shouldn't wait on the network - it's
    // purely so the Activity Log gets a Logout entry.
    serverPost("/api/logout", {}).catch((err) => console.error("Failed to log logout:", err));

    setAuth(null);
    setRoleChange(null);
    clearAuth();
  }

  const value = {
    user: auth?.user ?? null,
    // The session token itself, for reading its issue/expiry times.
    token,
    // Saved per-user preferences; undefined for a session that started
    // before they were sent with the login (PreferencesProvider loads them).
    preferences: auth?.preferences,

    login,
    logout,
    updateSession,

    isAuthenticated: !!auth,

    hasRole: (role) => auth?.user?.role === role,

    roleChange,
    clearRoleChange: () => setRoleChange(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthProvider };
