import { SETTING_KEYS } from "./boards/appSettings.js";
import { ACTIVE_APPLICATIONS_STATUS_OPTIONS } from "./statuses/activeApplicationsStatuses.js";
import { USERS_STATUS_OPTIONS } from "./statuses/usersStatuses.js";
import { DEFAULT_MONDAY_API_VERSION, isValidMondayApiVersion } from "./mondayApiVersion.js";

const STAGES = ACTIVE_APPLICATIONS_STATUS_OPTIONS.ADOPTION_STAGE;
const ROLES = USERS_STATUS_OPTIONS.ROLE;

// Settings the app itself introduced, so their App Settings board row may
// not exist yet. Shared by the frontend (App Settings shows these with
// their default until the row is created on first save) and the server
// (which enforces some of them), so both agree on options and defaults.
//
// Two kinds:
// - list (default): `options` is the fixed set of allowed labels - App
//   Settings edits these as checkboxes - and `defaultList` applies when the
//   row is missing or holds no valid entry.
// - `type: "number"`: a positive number edited as plain text, with
//   `defaultValue` applying when the row is missing or invalid.
// - `type: "text"`: free text with `defaultValue`; an optional
//   `validate(value)` returns an error message, or null when valid.
export const SETTING_DEFINITIONS = {
  [SETTING_KEYS.MATCHING_STAGES]: {
    name: "Matching Stages",
    description: "Application stages that appear on the Matching page and count towards Pending Matching.",
    options: Object.values(STAGES),
    defaultList: [STAGES.ACTIVE_APPLICATION],
  },
  [SETTING_KEYS.CASE_OWNER_ROLES]: {
    name: "Case Owner Roles",
    description: "User roles that can be picked as an application's Case Owner. Only Active accounts are ever offered.",
    options: Object.values(ROLES),
    defaultList: Object.values(ROLES),
  },
  [SETTING_KEYS.CASE_OWNER_ASSIGNER_ROLES]: {
    name: "Case Owner Assigner Roles",
    description: "User roles allowed to set or change an application's Case Owner.",
    options: Object.values(ROLES),
    defaultList: [ROLES.ADMIN],
  },
  [SETTING_KEYS.MY_CASES_OPEN_STAGES]: {
    name: "My Cases Open Stages",
    description: "Application stages counted as open on the Dashboard's My Open Cases tile.",
    options: Object.values(STAGES),
    defaultList: [STAGES.NEW_APPLICATION, STAGES.ACTIVE_APPLICATION],
  },
  [SETTING_KEYS.UPCOMING_TASKS_DAYS]: {
    type: "number",
    name: "Upcoming Tasks Days",
    description: "How many days ahead the Dashboard's Upcoming Tasks panel looks. Overdue tasks are always included.",
    defaultValue: 7,
  },
  [SETTING_KEYS.MONDAY_API_VERSION]: {
    type: "text",
    name: "Monday API Version",
    description:
      "Monday API version every request is pinned to (YYYY-MM, quarterly: -01, -04, -07, -10). Admins are alerted when Monday moves this version to maintenance; update it after checking Monday's release notes.",
    defaultValue: DEFAULT_MONDAY_API_VERSION,
    validate: (value) =>
      isValidMondayApiVersion(value) ? null : "Use a quarterly version like 2026-10 (months 01, 04, 07 or 10).",
  },
};
