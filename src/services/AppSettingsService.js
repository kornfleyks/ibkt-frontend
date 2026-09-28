import { serverGet, serverPost } from "./MondayService";
import { SETTING_KEYS } from "../constants/boards/appSettings";
import { SETTING_DEFINITIONS } from "../constants/settingDefinitions";
import { formatListSetting, resolveListSetting } from "../utils/listSetting";

export { SETTING_KEYS, SETTING_DEFINITIONS };
export { parseListSetting, formatListSetting } from "../utils/listSetting";

// [{ id, name, key, value, description }] - served by the server from
// memory (database or Monday, see server/appSettings.js).
export async function getSettings() {
  return serverGet("/api/settings");
}

// Appends a placeholder (id: null, isDefault: true) for every defined
// setting whose row is missing from the board, so it's visible and
// editable on App Settings instead of silently using its default.
export function withDefinedSettings(settings) {
  const presentKeys = new Set(settings.map((setting) => setting.key));

  const missing = Object.entries(SETTING_DEFINITIONS)
    .filter(([key]) => !presentKeys.has(key))
    .map(([key, definition]) => ({
      id: null,
      key,
      name: definition.name,
      value:
        definition.type === "number" || definition.type === "text"
          ? String(definition.defaultValue)
          : formatListSetting(definition.defaultList),
      description: definition.description,
      isDefault: true,
    }));

  return [...settings, ...missing];
}

// Saves by key: changes the value, or adds the row when the setting is a
// placeholder from withDefinedSettings. Admins only (checked by the server).
export async function saveSetting(setting, value) {
  return serverPost("/api/admin/settings", {
    key: setting.key,
    value,
    name: setting.name,
    description: setting.description,
  });
}

export async function createSetting({ name, key, value, description }) {
  return serverPost("/api/admin/settings", { key, value, name, description });
}

// Shared by every numeric-setting getter below - a settings-board hiccup
// (row missing, board unreachable, bad value) always degrades to the given
// default rather than breaking whatever feature depends on it.
async function getNumericSetting(key, defaultValue) {
  try {
    const settings = await getSettings();
    const setting = settings.find((item) => item.key === key);
    const parsed = Number(setting?.value);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
  } catch (err) {
    console.error(`Failed to load the ${key} setting:`, err);
    return defaultValue;
  }
}

// Same degrade-to-default contract as getNumericSetting, for the list
// settings in SETTING_DEFINITIONS.
export async function getListSetting(key) {
  const definition = SETTING_DEFINITIONS[key];

  try {
    const settings = await getSettings();
    const setting = settings.find((item) => item.key === key);

    return resolveListSetting(setting?.value, definition);
  } catch (err) {
    console.error(`Failed to load the ${key} setting:`, err);
    return definition.defaultList;
  }
}

export function getMaxBondedCats() {
  return getNumericSetting(SETTING_KEYS.MAX_BONDED_CATS, 5);
}

export function getActivityLogPageSize() {
  return getNumericSetting(SETTING_KEYS.ACTIVITY_LOG_PAGE_SIZE, 500);
}

export function getMatchingStages() {
  return getListSetting(SETTING_KEYS.MATCHING_STAGES);
}

export function getCaseOwnerAssignerRoles() {
  return getListSetting(SETTING_KEYS.CASE_OWNER_ASSIGNER_ROLES);
}

export function getMyCasesOpenStages() {
  return getListSetting(SETTING_KEYS.MY_CASES_OPEN_STAGES);
}

export function getUpcomingTasksDays() {
  return getNumericSetting(
    SETTING_KEYS.UPCOMING_TASKS_DAYS,
    SETTING_DEFINITIONS[SETTING_KEYS.UPCOMING_TASKS_DAYS].defaultValue,
  );
}
