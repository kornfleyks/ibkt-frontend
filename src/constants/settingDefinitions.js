import { SETTING_KEYS } from "./boards/appSettings.js";
import { ACTIVE_APPLICATIONS_STATUS_OPTIONS } from "./statuses/activeApplicationsStatuses.js";
import { USERS_STATUS_OPTIONS } from "./statuses/usersStatuses.js";

const STAGES = ACTIVE_APPLICATIONS_STATUS_OPTIONS.ADOPTION_STAGE;
const ROLES = USERS_STATUS_OPTIONS.ROLE;

// Settings the app itself introduced, so their App Settings board row may
// not exist yet. Shared by the frontend (App Settings shows these with
// their default until the row is created on first save) and the server
// (which enforces some of them), so both agree on options and defaults.
//
// `options` is the fixed set of allowed labels - App Settings edits these
// as checkboxes - and `defaultList` applies when the row is missing or
// holds no valid entry.
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
};
