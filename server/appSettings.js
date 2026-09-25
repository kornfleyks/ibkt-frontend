import { APP_SETTINGS, SETTING_KEYS } from "../src/constants/boards/appSettings.js";
import { SETTING_DEFINITIONS } from "../src/constants/settingDefinitions.js";
import { resolveListSetting } from "../src/utils/listSetting.js";
import { mondayHeaders, setPinnedMondayApiVersion } from "./mondayApiVersion.js";
import { mondayFetch } from "./mondayRateLimit.js";

const MONDAY_API_URL = process.env.MONDAY_API_URL;

// Refreshed at most this often - frequently-checked settings (cache TTL,
// rate-limit thresholds) would otherwise cost a live Monday call on every
// request. Settings saved through the app apply at once anyway
// (invalidateSettingsCache), so this only delays edits made directly on
// Monday. Not itself configurable, to avoid infinite regress.
const REFRESH_INTERVAL_MS = 10 * 60_000;

let cachedSettings = null;
let cachedAt = 0;
// A refresh already on its way to Monday - concurrent callers share it.
let pendingLoad = null;

// Same direct-to-Monday approach as activityLog.js's mondayDirectRequest -
// bypasses the public /api/monday proxy, which this module has no request
// context to authenticate against anyway.
async function mondayDirectRequest(query, variables = {}) {
  const response = await mondayFetch(MONDAY_API_URL, {
    method: "POST",
    headers: mondayHeaders(),
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

  pendingLoad ??= (async () => {
    try {
      cachedSettings = await loadSettings();
      cachedAt = Date.now();
      // Every later Monday request uses the freshly loaded pin.
      setPinnedMondayApiVersion(cachedSettings[SETTING_KEYS.MONDAY_API_VERSION]);
    } catch (err) {
      console.error("App Settings: failed to refresh from Monday.", err.message);
      cachedSettings = cachedSettings ?? {};
      // Keep the last known (or default) values and try again in a minute,
      // rather than on every request.
      cachedAt = Date.now() - REFRESH_INTERVAL_MS + 60_000;
    } finally {
      pendingLoad = null;
    }
  })();

  await pendingLoad;

  return cachedSettings;
}

// Forces the next read to come from Monday - called after App Settings are
// changed through the app, so e.g. a new API version applies straight away.
export function invalidateSettingsCache() {
  cachedAt = 0;
}

// Loads the settings (or reuses the cached copy), which also refreshes the
// MONDAY_API_VERSION pin. Called at startup so the pin is in place early -
// that very first load uses the built-in default version.
export async function loadAppSettings() {
  await getSettingsByKey();
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

// Server-side twin of the frontend's getListSetting - same definitions and
// parsing (both shared from src/), so a rule the UI shows is exactly the
// rule the server enforces.
export async function getListSetting(key) {
  const settings = await getSettingsByKey();

  return resolveListSetting(settings[key], SETTING_DEFINITIONS[key]);
}
