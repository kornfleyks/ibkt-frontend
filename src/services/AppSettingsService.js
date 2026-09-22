import { mondayRequest, changeMondayColumnValue, createMondayItem } from "./MondayService";
import { APP_SETTINGS, SETTING_KEYS } from "../constants/boards/appSettings";

export { SETTING_KEYS };

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

export function getMaxBondedCats() {
  return getNumericSetting(SETTING_KEYS.MAX_BONDED_CATS, 5);
}

export function getActivityLogPageSize() {
  return getNumericSetting(SETTING_KEYS.ACTIVITY_LOG_PAGE_SIZE, 500);
}
