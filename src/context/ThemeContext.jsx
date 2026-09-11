import { createContext, useContext, useState } from "react";

const ThemeContext = createContext();

function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    const storedMode = localStorage.getItem("darkMode");

    return storedMode === "true";
  });

  function toggleDarkMode() {
    setDarkMode((previousMode) => {
      const newMode = !previousMode;

      localStorage.setItem("darkMode", newMode);

      return newMode;
    });
  }

  const value = {
    darkMode,
    toggleDarkMode,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

function useThemeMode() {
  return useContext(ThemeContext);
}

export { ThemeProvider, useThemeMode };
