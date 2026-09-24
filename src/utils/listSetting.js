// List settings are stored on the App Settings board's plain-text Value
// column as comma-separated entries. Pure helpers, shared by the frontend
// (src/services/AppSettingsService.js) and the server (server/appSettings.js)
// so both sides read a list setting identically.

export function parseListSetting(value) {
  return (value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function formatListSetting(entries) {
  return entries.join(", ");
}

// Unknown entries (typos, labels renamed on Monday) are dropped rather than
// silently matching nothing; an empty result falls back to the definition's
// default so a feature never ends up with no allowed value at all.
export function resolveListSetting(rawValue, definition) {
  const entries = parseListSetting(rawValue).filter((entry) => definition.options.includes(entry));

  return entries.length > 0 ? entries : definition.defaultList;
}
