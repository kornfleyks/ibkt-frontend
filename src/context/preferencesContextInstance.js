import { createContext } from "react";
import { DEFAULT_PREFERENCES } from "../constants/preferences";

// The default value serves anything rendered outside PreferencesProvider
// (e.g. the login page): defaults, and nothing to save.
export const PreferencesContext = createContext({
  preferences: DEFAULT_PREFERENCES,
  setPreference: () => {},
  saveError: null,
});
