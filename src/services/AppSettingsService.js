import { mondayRequest, changeMondayColumnValue, createMondayItem } from "./MondayService";
import { APP_SETTINGS, SETTING_KEYS } from "../constants/boards/appSettings";
import { SETTING_DEFINITIONS } from "../constants/settingDefinitions";
import { formatListSetting, resolveListSetting } from "../utils/listSetting";

export { SETTING_KEYS, SETTING_DEFINITIONS };
export { parseListSetting, formatListSetting } from "../utils/listSetting";

function mapSetting(item) {
  const columns = Object.fromEntries(item.column_values.map((column) => [column.id, column]));

  return {
    id: item.id,
    name: item.name,
    key: columns[APP_SETTINGS.COLUMNS.SETTING_KEY]?.text || "",
    value: columns[APP_SETTINGS.COLUMNS.VALUE]?.text || "",
    description: columns[APP_SETTINGS.COLUMNS.DESCRIPTION]?.text || "",
  };
}

export async function getSettings() {
  const query = `
    query ($boardId: ID!) {
      boards(ids: [$boardId]) {
        items_page(limit: 100) {
          items {
            id
            name
            column_values {
              id
              text
            }
          }
        }
      }
    }
  `;

  const data = await mondayRequest(query, { boardId: APP_SETTINGS.BOARD_ID });

  return data.boards[0].items_page.items.map(mapSetting);
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

// Updates the row, or creates it first when the setting is a placeholder
// from withDefinedSettings.
export async function saveSetting(setting, value) {
  if (setting.id) {
    return updateSettingValue(setting.id, value);
  }

  return createSetting({
    name: setting.name,
    key: setting.key,
    value,
    description: setting.description,
  });
}

export async function updateSettingValue(settingId, value) {
  return changeMondayColumnValue(APP_SETTINGS.BOARD_ID, settingId, APP_SETTINGS.COLUMNS.VALUE, value);
}

export async function createSetting({ name, key, value, description }) {
  const columnValues = {
    [APP_SETTINGS.COLUMNS.SETTING_KEY]: key,
    [APP_SETTINGS.COLUMNS.VALUE]: value,
    [APP_SETTINGS.COLUMNS.DESCRIPTION]: { text: description },
  };

  return createMondayItem(APP_SETTINGS.BOARD_ID, name, columnValues);
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
