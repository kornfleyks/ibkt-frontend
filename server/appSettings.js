import { APP_SETTINGS, SETTING_KEYS } from "../src/constants/boards/appSettings.js";
import { SETTING_DEFINITIONS } from "../src/constants/settingDefinitions.js";
import { resolveListSetting } from "../src/utils/listSetting.js";
import { setPinnedMondayApiVersion } from "./mondayApiVersion.js";
import { mondayDirectRequest } from "./mondayClient.js";
import { logActivity } from "./activityLog.js";
import { isDatabaseBoard } from "./database/switches.js";
import { query, ident } from "./database/db.js";
import { boardFields, createLocalItem, updateItem, StoreError } from "./database/boardStore.js";

// The App Settings board: read by the server (session expiry, lockout,
// caching, the Monday API version pin...) and by the app through
// GET /api/settings; changed only by Admins through POST /api/admin/settings.
// Kept in the database when "app_settings" is in DATABASE_BOARDS (the
// nightly sync copies changes to Monday), otherwise on Monday.

const TABLE = "app_settings";
const COLUMNS = APP_SETTINGS.COLUMNS;

// Refreshed at most this often - frequently-checked settings (cache TTL,
// rate-limit thresholds) would otherwise cost a read on every request.
// Settings saved through the app apply at once (invalidateSettingsCache),
// so this only delays edits made elsewhere (e.g. on the other server, or
// directly on Monday). Not itself configurable, to avoid infinite regress.
const REFRESH_INTERVAL_MS = 10 * 60_000;

// [{ id, name, key, value, description }]
let cachedRows = null;
let cachedAt = 0;
// A refresh already on its way - concurrent callers share it.
let pendingLoad = null;

async function loadFromDatabase() {
  const { field, table } = await boardFields(TABLE);
  const { rows } = await query(
    `select monday_item_id, name, ${ident(field(COLUMNS.SETTING_KEY))} as key, ${ident(field(COLUMNS.VALUE))} as value,
            ${ident(field(COLUMNS.DESCRIPTION))} as description
     from ${ident(table)} order by monday_item_id`,
  );

  return rows.map((row) => ({
    id: String(row.monday_item_id),
    name: row.name ?? "",
    key: row.key ?? "",
    value: row.value ?? "",
    description: row.description ?? "",
  }));
}

async function loadFromMonday() {
  const data = await mondayDirectRequest(
    `query ($boardId: ID!) {
      boards(ids: [$boardId]) { items_page(limit: 100) { items { id name column_values { id text } } } }
    }`,
    { boardId: APP_SETTINGS.BOARD_ID },
  );

  return data.boards[0].items_page.items.map((item) => {
    const columns = Object.fromEntries(item.column_values.map((column) => [column.id, column]));

    return {
      id: item.id,
      name: item.name,
      key: columns[COLUMNS.SETTING_KEY]?.text || "",
      value: columns[COLUMNS.VALUE]?.text || "",
      description: columns[COLUMNS.DESCRIPTION]?.text || "",
    };
  });
}

// Refreshes at most once per REFRESH_INTERVAL_MS; keeps serving the
// last-known values (rather than throwing) if a refresh fails, so a
// transient hiccup doesn't break login/caching for everyone.
async function getRows() {
  if (cachedRows && Date.now() - cachedAt < REFRESH_INTERVAL_MS) {
    return cachedRows;
  }

  pendingLoad ??= (async () => {
    try {
      cachedRows = isDatabaseBoard(TABLE) ? await loadFromDatabase() : await loadFromMonday();
      cachedAt = Date.now();
      // Every later Monday request uses the freshly loaded pin.
      setPinnedMondayApiVersion(cachedRows.find((row) => row.key === SETTING_KEYS.MONDAY_API_VERSION)?.value);
    } catch (err) {
      console.error("App Settings: failed to refresh.", err.message);
      cachedRows = cachedRows ?? [];
      // Keep the last known (or default) values and try again in a minute,
      // rather than on every request.
      cachedAt = Date.now() - REFRESH_INTERVAL_MS + 60_000;
    } finally {
      pendingLoad = null;
    }
  })();

  await pendingLoad;

  return cachedRows;
}

async function getSettingsByKey() {
  return Object.fromEntries((await getRows()).filter((row) => row.key).map((row) => [row.key, row.value]));
}

// Forces the next read to reload - called after App Settings change, so
// e.g. a new API version applies straight away.
export function invalidateSettingsCache() {
  cachedAt = 0;
}

// Loads the settings (or reuses the cached copy), which also refreshes the
// MONDAY_API_VERSION pin. Called at startup so the pin is in place early -
// that very first load uses the built-in default version.
export async function loadAppSettings() {
  await getRows();
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

export async function getActivityLogPageSize() {
  return getNumericSetting(SETTING_KEYS.ACTIVITY_LOG_PAGE_SIZE, 500);
}

// Server-side twin of the frontend's getListSetting - same definitions and
// parsing (both shared from src/), so a rule the UI shows is exactly the
// rule the server enforces.
export async function getListSetting(key) {
  const settings = await getSettingsByKey();

  return resolveListSetting(settings[key], SETTING_DEFINITIONS[key]);
}

// Saves one setting by key: changes its value, or adds the row (with name
// and description) when there's none yet. Returns { created, previous }.
async function saveSetting({ key, value, name, description }) {
  const existing = (isDatabaseBoard(TABLE) ? await loadFromDatabase() : await getRows()).find((row) => row.key === key);

  if (isDatabaseBoard(TABLE)) {
    const { field } = await boardFields(TABLE);

    if (existing) {
      await updateItem(TABLE, existing.id, { fields: { [field(COLUMNS.VALUE)]: value } });
    } else {
      await createLocalItem(TABLE, {
        name,
        fields: { [field(COLUMNS.SETTING_KEY)]: key, [field(COLUMNS.VALUE)]: value, [field(COLUMNS.DESCRIPTION)]: description ?? "" },
      });
    }
  } else if (existing) {
    await mondayDirectRequest(
      `mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: String!) {
        change_simple_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) { id }
      }`,
      { boardId: APP_SETTINGS.BOARD_ID, itemId: existing.id, columnId: COLUMNS.VALUE, value },
    );
  } else {
    await mondayDirectRequest(
      `mutation ($boardId: ID!, $name: String!, $values: JSON!) {
        create_item(board_id: $boardId, item_name: $name, column_values: $values) { id }
      }`,
      {
        boardId: APP_SETTINGS.BOARD_ID,
        name,
        values: JSON.stringify({ [COLUMNS.SETTING_KEY]: key, [COLUMNS.VALUE]: value, [COLUMNS.DESCRIPTION]: { text: description ?? "" } }),
      },
    );
  }

  invalidateSettingsCache();

  return { created: !existing, previous: existing?.value ?? "", name: existing?.name ?? name };
}

const KEY_PATTERN = /^[A-Z0-9_]{1,80}$/;

export function registerSettingsRoutes(app, { requireAuth, requireAdmin }) {
  // [{ id, name, key, value, description }] - every signed-in user (pages
  // read settings such as the bonded-cats limit). Served from memory.
  app.get("/api/settings", requireAuth, async (req, res) => {
    res.json(await getRows());
  });

  // { key, value, name?, description? } - name is needed when the setting
  // has no row yet. Admins only.
  app.post("/api/admin/settings", requireAuth, requireAdmin, async (req, res) => {
    const { key, value, name, description } = req.body ?? {};

    if (typeof key !== "string" || !KEY_PATTERN.test(key)) {
      return res.status(400).json({ error: "A setting key (capital letters, digits and _) is required." });
    }

    if (typeof value !== "string") {
      return res.status(400).json({ error: "A value is required." });
    }

    try {
      const result = await saveSetting({
        key,
        value: value.trim(),
        name: typeof name === "string" && name.trim() ? name.trim().slice(0, 255) : key,
        description: typeof description === "string" ? description : "",
      });
      const actorName = `${req.user.firstName} ${req.user.lastName}`.trim();

      logActivity({
        actorId: req.user.sub,
        actorName,
        boardId: APP_SETTINGS.BOARD_ID,
        boardName: "App Settings",
        itemName: result.name,
        actionType: result.created ? "Created" : "Updated",
        description: result.created
          ? `${actorName} added the setting "${result.name}"`
          : `${actorName} changed ${result.name} from "${result.previous || "(empty)"}" to "${value.trim() || "(empty)"}"`,
        fieldChanged: result.created ? "" : "Value",
        oldValue: result.created ? "" : result.previous,
        newValue: value.trim(),
        raw: { key },
      });

      res.json(await getRows());
    } catch (err) {
      if (err instanceof StoreError) {
        return res.status(err.status).json({ error: err.message });
      }

      if (err.rateLimited) {
        return res.status(429).json({ error: err.message, retryAfterSeconds: err.retryAfterSeconds });
      }

      console.error("App Settings: save failed.", err);
      res.status(500).json({ error: "The setting couldn't be saved." });
    }
  });
}
