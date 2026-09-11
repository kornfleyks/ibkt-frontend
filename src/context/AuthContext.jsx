import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");

    return storedUser ? JSON.parse(storedUser) : null;
  });

  function login(userData) {
    setUser(userData);

    localStorage.setItem(
      "user",

      JSON.stringify(userData),
    );
  }

  function logout() {
    setUser(null);

    localStorage.removeItem("user");
  }

  const value = {
    user,

    login,
    logout,

    isAuthenticated: !!user,

    hasRole: (role) => {
      return user?.role === role;
    },

    hasPermission: (permission) => {
      return user?.permissions?.includes(permission);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  return useContext(AuthContext);
}

export { AuthProvider, useAuth };
