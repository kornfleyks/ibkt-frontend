import { USERS } from "../../src/constants/boards/users.js";
import { RESCUERS } from "../../src/constants/boards/rescuers.js";
import { CATS } from "../../src/constants/boards/cats.js";
import { ACTIVE_APPLICATIONS } from "../../src/constants/boards/activeApplications.js";
import { TRAVEL } from "../../src/constants/boards/travel.js";
import { POST_ADOPTION } from "../../src/constants/boards/postAdoption.js";
import { TASKS } from "../../src/constants/boards/tasks.js";
import { ACTIVITY_LOG } from "../../src/constants/boards/activityLog.js";
import { APP_SETTINGS } from "../../src/constants/boards/appSettings.js";
import { NOTIFICATIONS } from "../../src/constants/boards/notifications.js";
import { COMMUNICATION_BOARDS } from "../../src/constants/communicationBoards.js";

// How Monday's structure maps onto the database: one table per board, one
// column per Monday column (named after its title, snake_case), holding
// everything needed to write the value back to Monday exactly. A few types
// need a second, companion column (see TYPE_SPECS). Shared by the schema
// script, the backfill, the live mirror and the data layer.

export const MIRRORED_BOARDS = [
  { boardId: USERS.BOARD_ID, table: "users" },
  { boardId: RESCUERS.BOARD_ID, table: "rescuers" },
  { boardId: CATS.BOARD_ID, table: "cats" },
  { boardId: ACTIVE_APPLICATIONS.BOARD_ID, table: "applications" },
  { boardId: TRAVEL.BOARD_ID, table: "travel" },
  { boardId: POST_ADOPTION.BOARD_ID, table: "post_adoption" },
  { boardId: TASKS.BOARD_ID, table: "tasks" },
  { boardId: ACTIVITY_LOG.BOARD_ID, table: "activity_log" },
  { boardId: APP_SETTINGS.BOARD_ID, table: "app_settings" },
  { boardId: NOTIFICATIONS.BOARD_ID, table: "notifications" },
];

// Item updates (the Communications threads) on these boards go to the
// `communications` table.
export const COMMUNICATION_BOARD_IDS = Object.keys(COMMUNICATION_BOARDS);

// Secrets are not copied: a second copy only adds risk.
export const EXCLUDED_COLUMN_IDS = new Set([
  USERS.COLUMNS.PASSWORD_HASH,
  USERS.COLUMNS.LOGIN_TOKEN,
  USERS.COLUMNS.PASSWORD_RESET_TOKEN,
]);

// Monday column type -> how it's stored. `sql: null` = not copied (files
// stay in Monday; mirrors only repeat another board's data; subitems are
// unused). `extra` = a companion column (<name>_<suffix>) for detail
// Monday needs back: a date's time, a country's code, a phone's country, an
// email's display text. `writable: false` = Monday sets it, never written.
export const TYPE_SPECS = {
  name: { sql: "text" },
  text: { sql: "text" },
  long_text: { sql: "text" },
  status: { sql: "text" },
  email: { sql: "text", extra: { suffix: "text", sql: "text" } },
  phone: { sql: "text", extra: { suffix: "country", sql: "text" } },
  country: { sql: "text", extra: { suffix: "code", sql: "text" } },
  date: { sql: "date", extra: { suffix: "time", sql: "time" } },
  dropdown: { sql: "text[]" },
  numbers: { sql: "numeric" },
  numeric: { sql: "numeric" },
  checkbox: { sql: "boolean" },
  board_relation: { sql: "bigint[]" },
  item_id: { sql: "bigint", writable: false },
  creation_log: { sql: "timestamptz", writable: false },
  file: { sql: null },
  mirror: { sql: null },
  lookup: { sql: null },
  subtasks: { sql: null },
};

// Title of the Monday column that holds each app-created record's key (see
// database/sync.js). Not data: never copied into the tables.
export const DB_ID_COLUMN_TITLE = "DB ID";

// Types with options (labels) kept in the column_options table.
export const OPTION_TYPES = new Set(["status", "dropdown"]);

export function specFor(mondayType) {
  return TYPE_SPECS[mondayType] ?? { sql: "text" };
}

export function sqlTypeFor(mondayType) {
  return specFor(mondayType).sql;
}

// Columns every table has besides the Monday ones.
export const SYSTEM_COLUMNS = ["monday_item_id", "name", "monday_created_at", "updated_at", "mirrored_at", "record_uid"];

export function columnNameFor(title) {
  const base = String(title)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 55);

  return /^[a-z]/.test(base) ? base : `col_${base || "unnamed"}`;
}

// A column's options from Monday's settings_str: [{ key, label, color,
// position }]. Status labels are keyed by index, dropdown labels by id.
export function parseColumnOptions(mondayType, settingsStr) {
  let settings;

  try {
    settings = typeof settingsStr === "string" ? JSON.parse(settingsStr) : settingsStr ?? {};
  } catch {
    return [];
  }

  if (mondayType === "status") {
    const labels = settings.labels ?? {};
    const colors = settings.labels_colors ?? {};
    const positions = settings.labels_positions_v2 ?? {};

    return Object.entries(labels)
      .filter(([, label]) => label !== null && label !== "")
      .map(([key, label]) => ({
        key: String(key),
        label: String(label),
        color: colors[key]?.color ?? null,
        position: Number.isFinite(Number(positions[key])) ? Number(positions[key]) : Number(key),
      }));
  }

  if (mondayType === "dropdown") {
    const labels = Array.isArray(settings.labels) ? settings.labels : settings.settings?.labels ?? [];

    return labels.map((option, index) => ({
      key: String(option.id),
      label: String(option.name ?? option.label ?? ""),
      color: null,
      position: index,
    }));
  }

  return [];
}

function parseJson(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}(:\d{2})?$/;

function dateParts(date, time) {
  const day = DATE_PATTERN.test(String(date ?? "")) ? date : null;
  const clock = day && TIME_PATTERN.test(String(time ?? "")) ? (time.length === 5 ? `${time}:00` : time) : null;

  return { main: day, extra: clock };
}

// { main, extra } for "no value".
function empty(type) {
  if (type === "checkbox") return { main: false, extra: null };
  if (type === "board_relation") return { main: [], extra: null };

  return { main: null, extra: null };
}

// `options`: Map(optionKey -> label) for status/dropdown columns.
function labelsFromIds(ids, options) {
  return (ids ?? []).map((id) => options?.get(String(id))).filter((label) => label !== undefined);
}

// A column value as Monday READS it ({ id, type, text, value,
// linked_item_ids }) -> { main, extra } database values. Used by the
// backfill.
export function readToDb(type, column, item, options) {
  const value = parseJson(column?.value);

  switch (type) {
    case "board_relation":
      return { main: (column?.linked_item_ids ?? []).map(Number), extra: null };
    case "dropdown": {
      const labels = Array.isArray(value?.ids) ? labelsFromIds(value.ids, options) : [];

      // Fall back to the display text if the options aren't known.
      return { main: labels.length ? labels : column?.text ? column.text.split(", ").filter(Boolean) : null, extra: null };
    }
    case "date":
      return value ? dateParts(value.date, value.time) : empty(type);
    case "email":
      return value ? { main: value.email ?? null, extra: value.text ?? null } : empty(type);
    case "phone":
      return value ? { main: value.phone ?? null, extra: value.countryShortName ?? null } : empty(type);
    case "country":
      return value ? { main: value.countryName ?? null, extra: value.countryCode ?? null } : empty(type);
    case "numbers":
    case "numeric":
      return { main: toNumber(column?.text), extra: null };
    case "checkbox":
      return { main: value ? value.checked === true || value.checked === "true" : false, extra: null };
    case "item_id":
      return { main: toNumber(column?.text ?? item?.id), extra: null };
    case "creation_log":
      return { main: item?.created_at ?? null, extra: null };
    default:
      return { main: column?.text || null, extra: null };
  }
}

// A column value as Monday WRITES it (change_column_value / create_item
// column_values input) -> { main, extra }, or undefined when it can't be
// told (leave the stored value alone). Used by the live mirror.
export function inputToDb(type, raw, options) {
  const value = parseJson(raw);

  if (value === null || (typeof value === "object" && Object.keys(value).length === 0)) {
    return empty(type);
  }

  switch (type) {
    case "text":
    case "name":
      return { main: typeof value === "string" ? value : String(value), extra: null };
    case "long_text":
      return { main: typeof value === "string" ? value : value.text ?? null, extra: null };
    case "email":
      return typeof value === "string" ? { main: value, extra: value } : { main: value.email ?? null, extra: value.text ?? value.email ?? null };
    case "phone":
      return typeof value === "string" ? { main: value, extra: null } : { main: value.phone ?? null, extra: value.countryShortName ?? null };
    case "country":
      return typeof value === "string" ? undefined : { main: value.countryName ?? null, extra: value.countryCode ?? null };
    case "status": {
      if (typeof value === "string") return { main: value, extra: null };
      if (value.label !== undefined) return { main: value.label, extra: null };

      const label = value.index !== undefined ? options?.get(String(value.index)) : undefined;

      return label === undefined ? undefined : { main: label, extra: null };
    }
    case "dropdown":
      if (Array.isArray(value.labels)) return { main: value.labels, extra: null };
      if (Array.isArray(value.ids)) return { main: labelsFromIds(value.ids, options), extra: null };
      if (typeof value === "string") return { main: value.split(",").map((part) => part.trim()).filter(Boolean), extra: null };
      return undefined;
    case "date":
      return typeof value === "string" ? dateParts(value.slice(0, 10), value.slice(11, 19) || null) : dateParts(value.date, value.time);
    case "numbers":
    case "numeric":
      return { main: toNumber(value), extra: null };
    case "checkbox":
      return { main: value.checked === true || value.checked === "true", extra: null };
    case "board_relation":
      if (Array.isArray(value.item_ids)) return { main: value.item_ids.map(Number), extra: null };
      if (Array.isArray(value.linkedPulseIds)) return { main: value.linkedPulseIds.map((entry) => Number(entry.linkedPulseId)), extra: null };
      return undefined;
    case "item_id":
    case "creation_log":
      return undefined;
    default:
      return { main: typeof value === "string" ? value : JSON.stringify(value), extra: null };
  }
}

// Database values -> the value to send Monday (change_column_value /
// create_item column_values). `null` clears the column; `undefined` = not
// writable (Monday sets it). Used by the nightly sync.
export function dbToInput(type, main, extra) {
  if (specFor(type).writable === false || specFor(type).sql === null) {
    return undefined;
  }

  const isEmpty = main === null || main === undefined || main === "" || (Array.isArray(main) && main.length === 0);

  switch (type) {
    case "checkbox":
      return main ? { checked: "true" } : null;
    case "board_relation":
      return { item_ids: (main ?? []).map(Number) };
    case "dropdown":
      return isEmpty ? null : { labels: main };
    default:
      break;
  }

  if (isEmpty) {
    return null;
  }

  switch (type) {
    case "text":
    case "name":
      return String(main);
    case "long_text":
      return { text: String(main) };
    case "status":
      return { label: String(main) };
    case "email":
      return { email: String(main), text: String(extra ?? main) };
    case "phone":
      return extra ? { phone: String(main), countryShortName: String(extra) } : { phone: String(main) };
    case "country":
      return { countryCode: String(extra ?? ""), countryName: String(main) };
    case "date":
      return extra ? { date: String(main), time: String(extra).slice(0, 8) } : { date: String(main) };
    case "numbers":
    case "numeric":
      return String(main);
    default:
      return String(main);
  }
}
