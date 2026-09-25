import { useEffect, useState } from "react";
import * as AuthService from "../services/AuthService";
import { serverPost } from "../services/MondayService";
import { readAuth, writeAuth, clearAuth, AUTH_ROLE_CHANGED_EVENT } from "../services/authStorage";
import { AuthContext } from "./authContextInstance";

function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readAuth);

  // A role change made by an Admin arrives on any server response (see
  // MondayService); adopt it so menus and route guards update in place.
  useEffect(() => {
    function handleRoleChanged(event) {
      setAuth(event.detail);
    }

    window.addEventListener(AUTH_ROLE_CHANGED_EVENT, handleRoleChanged);

    return () => window.removeEventListener(AUTH_ROLE_CHANGED_EVENT, handleRoleChanged);
  }, []);

  async function login(email, password) {
    const { token, user } = await AuthService.login(email, password);
    const nextAuth = { token, user };

    setAuth(nextAuth);
    writeAuth(nextAuth);
  }

  function logout() {
    // Fire-and-forget: this has to go out while the token is still valid
    // (before clearAuth), but logout shouldn't wait on the network - it's
    // purely so the Activity Log gets a Logout entry.
    serverPost("/api/logout", {}).catch((err) => console.error("Failed to log logout:", err));

    setAuth(null);
    clearAuth();
  }

  const value = {
    user: auth?.user ?? null,

    login,
    logout,

    isAuthenticated: !!auth,

    hasRole: (role) => auth?.user?.role === role,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthProvider };
