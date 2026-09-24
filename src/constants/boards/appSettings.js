// Auto-generated from Monday.com board schema.
export const APP_SETTINGS = {
  BOARD_ID: "5104700682",
  COLUMNS: {
    NAME: "name", // Name | name
    SETTING_KEY: "text_mm7e2xw6", // Setting Key | text
    VALUE: "text_mm7er1ap", // Value | text
    DESCRIPTION: "long_text_mm7e1ynq", // Description | long_text
  },
};

// Machine keys for each row on the App Settings board - looked up by
// `Setting Key`, not by item id, so row order/id never matters. Shared
// between the frontend (src/services/AppSettingsService.js) and the
// server (server/appSettings.js) so both read the same key names.
export const SETTING_KEYS = {
  MAX_BONDED_CATS: "MAX_BONDED_CATS",
  SESSION_EXPIRY_HOURS: "SESSION_EXPIRY_HOURS",
  MONDAY_CACHE_TTL_SECONDS: "MONDAY_CACHE_TTL_SECONDS",
  ACTIVITY_LOG_PAGE_SIZE: "ACTIVITY_LOG_PAGE_SIZE",
  LOGIN_MAX_ATTEMPTS: "LOGIN_MAX_ATTEMPTS",
  LOGIN_LOCKOUT_MINUTES: "LOGIN_LOCKOUT_MINUTES",
  // Comma-separated Adoption Stage labels whose applications can be matched.
  MATCHING_STAGES: "MATCHING_STAGES",
  // Comma-separated Users roles that can be picked as a Case Owner.
  CASE_OWNER_ROLES: "CASE_OWNER_ROLES",
  // Comma-separated Users roles allowed to set/change a Case Owner.
  CASE_OWNER_ASSIGNER_ROLES: "CASE_OWNER_ASSIGNER_ROLES",
  // Comma-separated Adoption Stage labels counted as "open" for My cases.
  MY_CASES_OPEN_STAGES: "MY_CASES_OPEN_STAGES",
};
