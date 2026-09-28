import { createContext, useCallback, useContext, useState } from "react";

const ThemeContext = createContext();

function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    const storedMode = localStorage.getItem("darkMode");

    return storedMode === "true";
  });

  // Set from the signed-in user's saved preference (PreferencesProvider;
  // Settings > Appearance changes that preference). Also cached in
  // localStorage, so the next load paints in the right mode before the
  // session is read.
  const applyDarkMode = useCallback((mode) => {
    localStorage.setItem("darkMode", mode);
    setDarkMode(mode);
  }, []);

  const value = {
    darkMode,
    applyDarkMode,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

function useThemeMode() {
  return useContext(ThemeContext);
}

export { ThemeProvider, useThemeMode };
