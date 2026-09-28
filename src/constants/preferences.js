// Per-user preferences, saved as JSON in the Users board's Preferences
// column. Shared by the frontend and the server (server/account.js), so
// what the Settings page offers and what the server accepts can't drift.

export const DATE_FORMATS = {
  MDY: "MM/DD/YYYY",
  DMY: "DD/MM/YYYY",
  ISO: "YYYY-MM-DD",
};

// Applied by the frontend for any key the user never saved. darkMode has no
// default here on purpose: until someone saves it, the browser's own
// remembered choice (ThemeContext) stays in charge.
export const DEFAULT_PREFERENCES = {
  dateFormat: DATE_FORMATS.MDY,
};

const VALIDATORS = {
  darkMode: (value) => typeof value === "boolean",
  dateFormat: (value) => Object.values(DATE_FORMATS).includes(value),
};

// Only known keys with valid values survive - anything else is dropped.
export function sanitizePreferences(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(input).filter(([key, value]) => VALIDATORS[key]?.(value)),
  );
}

// The column's raw text -> the stored (sanitized) preferences; {} when
// empty or unreadable.
export function parsePreferences(text) {
  try {
    return sanitizePreferences(JSON.parse(text || "{}"));
  } catch {
    return {};
  }
}
