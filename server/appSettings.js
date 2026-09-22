import { APP_SETTINGS, SETTING_KEYS } from "../src/constants/boards/appSettings.js";

const MONDAY_API_URL = process.env.MONDAY_API_URL;
const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN;

// Refreshed at most this often - frequently-checked settings (cache TTL,
// rate-limit thresholds) would otherwise cost a live Monday call on every
// request. Not itself configurable, to avoid infinite regress.
const REFRESH_INTERVAL_MS = 60_000;

let cachedSettings = null;
let cachedAt = 0;

// Same direct-to-Monday approach as activityLog.js's mondayDirectRequest -
// bypasses the public /api/monday proxy, which this module has no request
// context to authenticate against anyway.
async function mondayDirectRequest(query, variables = {}) {
  const response = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      Authorization: MONDAY_API_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  return result.data;
}

async function loadSettings() {
  const query = `
    query ($boardId: ID!) {
      boards(ids: [$boardId]) {
        items_page(limit: 100) {
          items {
            column_values {
              id
              text
            }
          }
        }
      }
    }
  `;

  const data = await mondayDirectRequest(query, { boardId: APP_SETTINGS.BOARD_ID });

  const settingsByKey = {};

  for (const item of data.boards[0].items_page.items) {
    const columns = Object.fromEntries(item.column_values.map((column) => [column.id, column]));
    const key = columns[APP_SETTINGS.COLUMNS.SETTING_KEY]?.text;

    if (key) {
      settingsByKey[key] = columns[APP_SETTINGS.COLUMNS.VALUE]?.text || "";
    }
  }

  return settingsByKey;
}

// Refreshes from Monday at most once per REFRESH_INTERVAL_MS; keeps serving
// the last-known values (rather than throwing) if a refresh attempt fails,
// so a transient Monday hiccup doesn't break login/caching for everyone.
async function getSettingsByKey() {
  if (cachedSettings && Date.now() - cachedAt < REFRESH_INTERVAL_MS) {
    return cachedSettings;
  }

  try {
    cachedSettings = await loadSettings();
    cachedAt = Date.now();
  } catch (err) {
    console.error("App Settings: failed to refresh from Monday.", err);
    cachedSettings = cachedSettings ?? {};
  }

  return cachedSettings;
}

async function getNumericSetting(key, defaultValue) {
  const settings = await getSettingsByKey();
  const parsed = Number(settings[key]);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

export async function getSessionExpiryHours() {
  return getNumericSetting(SETTING_KEYS.SESSION_EXPIRY_HOURS, 12);
}

export async function getMondayCacheTtlMs() {
  const seconds = await getNumericSetting(SETTING_KEYS.MONDAY_CACHE_TTL_SECONDS, 60);

  return seconds * 1000;
}

export async function getLoginMaxAttempts() {
  return getNumericSetting(SETTING_KEYS.LOGIN_MAX_ATTEMPTS, 5);
}

export async function getLoginLockoutMinutes() {
  return getNumericSetting(SETTING_KEYS.LOGIN_LOCKOUT_MINUTES, 15);
}
