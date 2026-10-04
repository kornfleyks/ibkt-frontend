import { USERS } from "../src/constants/boards/users.js";
import { SECRET_COLUMN_IDS } from "./database/mondaySchema.js";
import { query as dbQuery, ident, isDatabaseEnabled } from "./database/db.js";
import { databaseBoards } from "./database/switches.js";

// Extra rules for /api/monday (index.js). Boards kept in the database are
// read through their own endpoints; the proxy refuses any request naming
// them by board id, but a request can also reach an item by its own id
// (items(ids: ...)) or through another item's links - which would hand any
// signed-in user, e.g., a Users item's password hash. So:
//
//   1. a request naming the id of an item kept in the database is refused
//      (a file change is let through when it asks for nothing back but ids);
//   2. a request naming a password / token column is refused;
//   3. those columns are blanked in every answer, whatever the request.

const U = USERS.COLUMNS;

// The database's secret columns (never returned by any endpoint), plus the
// tokens' expiry dates.
export const SENSITIVE_COLUMN_IDS = new Set([...SECRET_COLUMN_IDS, U.LOGIN_TOKEN_EXPIRY, U.PASSWORD_RESET_EXPIRY].filter(Boolean));

// Monday item ids are 9-12 digit numbers.
const ITEM_ID = /\b\d{9,12}\b/g;
// A file change may only ask for ids back, not an item's values.
const READS_VALUES = /column_values|linked_items|items_page|\bitems\s*\(|updates\s*[({]/;

function textOf(query, variables) {
  return `${query} ${JSON.stringify(variables ?? {})}`;
}

// The database table holding any of the ids in the request, or null.
async function databaseItemIn(text) {
  if (!isDatabaseEnabled()) return null;

  const ids = [...new Set(text.match(ITEM_ID) ?? [])].map(Number);
  const tables = databaseBoards();

  if (ids.length === 0 || tables.length === 0) return null;

  const sql = tables.map((table) => `select '${table}' as board from ${ident(table)} where monday_item_id = any($1)`).join(" union all ");
  const { rows } = await dbQuery(`select board from (${sql}) found limit 1`, [ids]);

  return rows[0]?.board ?? null;
}

// { status, error } when the request must be refused, else null.
export async function proxyRefusal({ query, variables, isFileChange }) {
  const text = textOf(query, variables);

  if ([...SENSITIVE_COLUMN_IDS].some((columnId) => text.includes(columnId))) {
    return { status: 403, error: "Those account columns can't be read or changed through the Monday proxy." };
  }

  if (isFileChange) {
    return READS_VALUES.test(query) ? { status: 403, error: "A file change through the Monday proxy can only ask for ids back." } : null;
  }

  if (await databaseItemIn(text)) {
    return { status: 409, error: "This item is kept in the database now; reload the page to use the new version." };
  }

  return null;
}

// Blanks the sensitive columns anywhere in a Monday answer (column_values
// entries carry their column id). Changes the object in place and returns it.
export function stripSensitive(data) {
  const seen = new Set();

  (function walk(value) {
    if (!value || typeof value !== "object" || seen.has(value)) return;

    seen.add(value);

    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }

    if (typeof value.id === "string" && SENSITIVE_COLUMN_IDS.has(value.id)) {
      for (const key of ["text", "value", "display_value"]) if (key in value) value[key] = null;
    }

    Object.values(value).forEach(walk);
  })(data);

  return data;
}
