import { ACTIVITY_LOG } from "../../src/constants/boards/activityLog.js";
import { query, ident } from "./db.js";
import { boardFields, createLocalItem } from "./boardStore.js";
import { MIRRORED_BOARDS } from "./mondaySchema.js";
import { namesOf, textOf } from "./columnText.js";

// The Activity Log in the database ("activity_log" in DATABASE_BOARDS):
// entries are saved at once with no Monday call (the nightly sync copies
// them to the board), and read here for the Activity Log page, the item
// Activity tabs and the dashboard. Also reads item names and field values
// from the database copy of the other boards, for log descriptions.

const TABLE = "activity_log";
const COLUMNS = ACTIVITY_LOG.COLUMNS;

// Log entry fields -> Activity Log board columns.
const ENTRY_COLUMNS = {
  actorName: COLUMNS.ACTOR_NAME,
  actorId: COLUMNS.ACTOR_ID,
  board: COLUMNS.BOARD,
  boardId: COLUMNS.TARGET_BOARD_ID,
  itemName: COLUMNS.ITEM_NAME,
  itemId: COLUMNS.TARGET_ITEM_ID,
  actionType: COLUMNS.ACTION_TYPE,
  description: COLUMNS.DESCRIPTION,
  fieldChanged: COLUMNS.FIELD_CHANGED,
  oldValue: COLUMNS.OLD_VALUE,
  newValue: COLUMNS.NEW_VALUE,
  rawDetails: COLUMNS.RAW_DETAILS,
};

// { name, occurredAt: Date, actorName, ..., rawDetails } -> one row.
export async function insertEntry({ name, occurredAt, ...entry }) {
  const { field, extra } = await boardFields(TABLE);
  const iso = occurredAt.toISOString();
  const fields = {
    [field(COLUMNS.TIMESTAMP)]: iso.slice(0, 10),
    [extra(COLUMNS.TIMESTAMP)]: iso.slice(11, 19),
  };

  for (const [key, columnId] of Object.entries(ENTRY_COLUMNS)) {
    fields[field(columnId)] = entry[key] === undefined || entry[key] === null ? "" : String(entry[key]);
  }

  await createLocalItem(TABLE, { name, fields });
}

// Newest first, in the shape the pages use (see ActivityLogMapper.js).
// Optionally only one item's entries.
export async function listEntries({ limit, boardId, itemId }) {
  const { field, extra, table } = await boardFields(TABLE);
  const date = ident(field(COLUMNS.TIMESTAMP));
  const time = ident(extra(COLUMNS.TIMESTAMP));
  const selected = Object.entries(ENTRY_COLUMNS)
    .filter(([key]) => key !== "rawDetails")
    .map(([key, columnId]) => `${ident(field(columnId))} as "${key}"`);
  const filters = [];
  const params = [];

  if (boardId !== undefined && itemId !== undefined) {
    params.push(String(boardId), String(itemId));
    filters.push(`${ident(field(COLUMNS.TARGET_BOARD_ID))} = $1 and ${ident(field(COLUMNS.TARGET_ITEM_ID))} = $2`);
  }

  params.push(limit);

  const { rows } = await query(
    `select monday_item_id, record_uid, ${date} as date, ${time} as time, ${selected.join(", ")}
     from ${ident(table)} ${filters.length ? `where ${filters.join(" and ")}` : ""}
     order by ${date} desc nulls last, ${time} desc nulls last, monday_item_id desc
     limit $${params.length}`,
    params,
  );

  return rows.map(({ monday_item_id: id, record_uid: key, date: day, time: clock, ...entry }) => {
    const occurredAt = day ? `${day}T${clock || "00:00:00"}Z` : null;

    return {
      ...Object.fromEntries(Object.entries(entry).map(([name, value]) => [name, value ?? ""])),
      id: key ?? String(id),
      timestamp: day ? `${day}${clock ? ` ${clock.slice(0, 5)}` : ""}` : "",
      occurredAt,
    };
  });
}

// --- Reads from the database copy of the other boards ---

function tableOf(boardId) {
  return MIRRORED_BOARDS.find((board) => board.boardId === String(boardId))?.table ?? null;
}

// { itemName, columnText, linkedIds } for an item's column, or null when the
// copy doesn't have the item (the caller then asks Monday).
export async function itemSnapshot(boardId, itemId, columnId) {
  const table = tableOf(boardId);

  if (!table || !/^\d+$/.test(String(itemId))) return null;

  const { field, extra, type } = await boardFields(table);
  const columnType = columnId === "name" ? "name" : type(columnId);
  const main = columnId === "name" ? "name" : columnType ? field(columnId) : null;
  const companion = columnType ? extra(columnId) : null;

  const { rows } = await query(
    `select name${main ? `, ${ident(main)} as main` : ""}${companion ? `, ${ident(companion)} as companion` : ""}
     from ${ident(table)} where monday_item_id = $1`,
    [Number(itemId)],
  );

  if (!rows[0]) return null;

  return {
    itemName: rows[0].name ?? "",
    // A column the copy doesn't keep (e.g. files) reads as empty.
    columnText: main
      ? textOf(columnType, rows[0].main, rows[0].companion, columnType === "board_relation" ? await namesOf(rows[0].main) : undefined)
      : "",
    linkedIds: columnType === "board_relation" ? (rows[0].main ?? []).map(String) : [],
  };
}

// An item's name from the copy (any board), or null when it isn't there.
export async function itemName(itemId) {
  if (!/^\d+$/.test(String(itemId))) return null;

  return (await namesOf([itemId])).get(String(itemId)) ?? null;
}
