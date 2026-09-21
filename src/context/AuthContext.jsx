import { useState } from "react";
import * as AuthService from "../services/AuthService";
import { readAuth, writeAuth, clearAuth } from "../services/authStorage";
import { AuthContext } from "./authContextInstance";

function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readAuth);

  async function login(email, password) {
    const { token, user } = await AuthService.login(email, password);
    const nextAuth = { token, user };

    setAuth(nextAuth);
    writeAuth(nextAuth);
  }

  function logout() {
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
