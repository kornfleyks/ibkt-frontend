import { mondayRequest, changeMondayColumnValue, createMondayItem } from "./MondayService";
import { APP_SETTINGS } from "../constants/boards/appSettings";

// Machine keys for each row on the App Settings board - looked up by
// `Setting Key`, not by item id, so the row order/id never matters.
export const SETTING_KEYS = {
  MAX_BONDED_CATS: "MAX_BONDED_CATS",
};

// Used whenever a setting can't be read (row missing, board unreachable) -
// callers should never be broken by an App Settings hiccup.
const DEFAULT_MAX_BONDED_CATS = 5;

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

export async function getMaxBondedCats() {
  try {
    const settings = await getSettings();
    const setting = settings.find((item) => item.key === SETTING_KEYS.MAX_BONDED_CATS);
    const parsed = Number(setting?.value);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_BONDED_CATS;
  } catch (err) {
    console.error("Failed to load Max Bonded Cats setting:", err);
    return DEFAULT_MAX_BONDED_CATS;
  }
}
