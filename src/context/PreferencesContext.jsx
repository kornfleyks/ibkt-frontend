import { useCallback, useEffect, useRef, useState } from "react";
import useAuth from "../hooks/useAuth";
import { useThemeMode } from "./ThemeContext";
import { readAuth } from "../services/authStorage";
import { getAccount, savePreferences } from "../services/AccountService";
import { DEFAULT_PREFERENCES } from "../constants/preferences";
import { PreferencesContext } from "./preferencesContextInstance";

// Changes made in quick succession (e.g. clicking the dark mode button a
// few times) go to the server as one save - each save is a Monday call,
// and Monday allows 1,000 a day for the whole app.
const SAVE_DELAY_MS = 800;

// The signed-in user's saved preferences (Users board Preferences column).
// They arrive with the login and live in the stored session; a change
// applies at once and is saved in the background.
function PreferencesProvider({ children }) {
  const { user, preferences: stored, updateSession } = useAuth();
  const { applyDarkMode } = useThemeMode();
  const [saveError, setSaveError] = useState(null);
  const saveTimer = useRef(null);
  const loadedFor = useRef(null);
  const userId = user?.id ?? null;

  // A session from before preferences came with the login has none stored:
  // load them once.
  useEffect(() => {
    if (!userId || stored !== undefined || loadedFor.current === userId) {
      return;
    }

    loadedFor.current = userId;

    getAccount()
      .then((account) => updateSession({ preferences: account.preferences ?? {} }))
      .catch((err) => console.error("Failed to load preferences:", err));
  }, [userId, stored, updateSession]);

  // Only a saved choice overrides the browser's own remembered mode.
  const savedDarkMode = stored?.darkMode;

  useEffect(() => {
    if (typeof savedDarkMode === "boolean") {
      applyDarkMode(savedDarkMode);
    }
  }, [savedDarkMode, applyDarkMode]);

  // A pending save belongs to the account that made it.
  useEffect(() => () => clearTimeout(saveTimer.current), [userId]);

  const setPreference = useCallback((key, value) => {
    // From storage, not the render's value, so quick successive changes
    // build on each other.
    const next = { ...(readAuth()?.preferences ?? {}), [key]: value };

    updateSession({ preferences: next });

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      savePreferences(readAuth()?.preferences ?? next)
        .then(() => setSaveError(null))
        .catch((err) => setSaveError(err.message));
    }, SAVE_DELAY_MS);
  }, [updateSession]);

  const value = {
    preferences: { ...DEFAULT_PREFERENCES, ...stored },
    setPreference,
    // Last background save's failure (shown on the Settings tab), if any.
    saveError,
  };

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export { PreferencesProvider };
