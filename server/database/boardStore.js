import { randomUUID } from "node:crypto";
import { query, transaction, ident } from "./db.js";
import { SYNC_MARKER } from "./mirror.js";
import { mondayFetch } from "../mondayRateLimit.js";
import { mondayHeaders } from "../mondayApiVersion.js";
import { loadColumnMap } from "./rows.js";
import { MIRRORED_BOARDS, specFor, dbToInput } from "./mondaySchema.js";

// The database as the app's store (database-first plan, Phase 1): read and
// write any mirrored board, and queue every change for Monday in the
// monday_outbox table - in the same transaction, so nothing can be saved
// without its Monday change being queued (the nightly sync sends them,
// Phase 2). Records use the tables' column names:
//   { id, name, createdAt, updatedAt, fields: { status: "New", due_date: "2026-10-01", ... } }

const SYSTEM = new Set(["monday_item_id", "name", "monday_created_at", "updated_at", "mirrored_at", "record_uid"]);
const MAP_REFRESH_MS = 10 * 60_000;

let cachedMap = null;
let cachedAt = 0;

export class StoreError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

async function columnMap() {
  if (!cachedMap || Date.now() - cachedAt > MAP_REFRESH_MS) {
    cachedMap = await loadColumnMap();
    cachedAt = Date.now();
  }

  return cachedMap;
}

// table name -> { boardId, table, columns: Map(columnId -> {name,type,extra,options}),
// byField: Map(field -> { columnId, column, part: "main" | "extra" }) }
async function boardFor(table) {
  const board = MIRRORED_BOARDS.find((entry) => entry.table === table);

  if (!board) {
    throw new StoreError(`Unknown board "${table}".`, 404);
  }

  const mapping = (await columnMap()).get(board.boardId);

  if (!mapping) {
    throw new StoreError(`Board "${table}" has no columns mapped (run scripts/databaseSchema.js).`, 503);
  }

  const byField = new Map();

  for (const [columnId, column] of mapping.columns) {
    byField.set(column.name, { columnId, column, part: "main" });

    if (column.extra) {
      byField.set(column.extra, { columnId, column, part: "extra" });
    }
  }

  return { ...board, columns: mapping.columns, byField };
}

const NUMERIC_TYPES = new Set(["numbers", "numeric"]);

function toRecord(board, row) {
  const fields = {};

  for (const [key, value] of Object.entries(row)) {
    if (SYSTEM.has(key)) continue;

    const entry = board.byField.get(key);
    // node-postgres returns numeric as a string; the app wants numbers.
    fields[key] = entry && entry.part === "main" && NUMERIC_TYPES.has(entry.column.type) && value !== null ? Number(value) : value;
  }

  return {
    id: String(row.monday_item_id),
    name: row.name,
    createdAt: row.monday_created_at,
    updatedAt: row.updated_at,
    fields,
  };
}

// Negative ids are records made in the database whose Monday item the sync
// hasn't created yet (createLocalItem).
function checkId(id) {
  if (!/^-?\d+$/.test(String(id ?? ""))) {
    throw new StoreError("Invalid item id.");
  }

  return Number(id);
}

// { field: value } -> validated entries, rejecting unknown or Monday-set fields.
function resolveFields(board, fields) {
  const entries = [];

  for (const [field, value] of Object.entries(fields ?? {})) {
    const entry = board.byField.get(field);

    if (!entry) {
      throw new StoreError(`Unknown field "${field}" on ${board.table}.`);
    }

    if (specFor(entry.column.type).writable === false) {
      throw new StoreError(`"${field}" is set by Monday and can't be changed.`);
    }

    entries.push({ field, value, ...entry });
  }

  return entries;
}

// What Monday must receive for the changed columns, keyed by Monday column
// id: each changed column's full value (main + companion), in Monday's input
// format. `row` is the item after the change.
function mondayChanges(board, entries, row) {
  const changes = {};

  for (const { columnId, column } of entries) {
    if (changes[columnId] !== undefined) continue;

    const input = dbToInput(column.type, row[column.name], column.extra ? row[column.extra] : null);

    if (input !== undefined) {
      changes[columnId] = input;
    }
  }

  return changes;
}

async function queueForMonday(run, { boardId, itemId, action, changes }) {
  await run(`insert into monday_outbox (board_id, monday_item_id, action, changes) values ($1, $2, $3, $4)`, [
    boardId,
    itemId,
    action,
    JSON.stringify(changes),
  ]);
}

export async function listItems(table, { limit = 500, offset = 0 } = {}) {
  const board = await boardFor(table);
  const { rows } = await query(`select * from ${ident(table)} order by monday_item_id limit $1 offset $2`, [
    Math.min(Math.max(Number(limit) || 500, 1), 1000),
    Math.max(Number(offset) || 0, 0),
  ]);

  return rows.map((row) => toRecord(board, row));
}

export async function getItem(table, id) {
  const board = await boardFor(table);
  const { rows } = await query(`select * from ${ident(table)} where monday_item_id = $1`, [checkId(id)]);

  if (!rows[0]) {
    throw new StoreError(`${table} item ${id} not found.`, 404);
  }

  return toRecord(board, rows[0]);
}

// Inserts the record and queues its fields for Monday, in one transaction.
// Normally the Monday item already exists with the name (created just
// before, or by the caller), so only the columns are queued; `local` means
// it doesn't yet - the sync creates it (name, columns and the key for its
// "DB ID" column).
async function insertRecord(board, { id, name, key, entries, pendingKey, local = false }) {
  return transaction(async (run) => {
    const names = ["monday_item_id", "name", "monday_created_at", "record_uid", ...entries.map((entry) => entry.field)];
    const values = [id, name, new Date().toISOString(), key, ...entries.map((entry) => entry.value)];
    const placeholders = values.map((_, index) => `$${index + 1}`);

    const { rows } = await run(
      `insert into ${ident(board.table)} (${names.map(ident).join(", ")}) values (${placeholders.join(", ")}) returning *`,
      values,
    ).catch((err) => {
      throw err.code === "23505" ? new StoreError(`${board.table} item ${id} already exists.`, 409) : new StoreError(err.message);
    });

    await queueForMonday(run, {
      boardId: board.boardId,
      itemId: id,
      action: "create",
      changes: { ...(local && { local: true, name, key }), columns: mondayChanges(board, entries, rows[0]) },
    });

    if (pendingKey) {
      await run("update pending_creations set status = 'done', monday_item_id = $2 where key = $1", [pendingKey, id]);
    }

    return toRecord(board, rows[0]);
  });
}

async function dbIdColumnFor(boardId) {
  const { rows } = await query("select db_id_column from monday_sync_columns where board_id = $1", [boardId]);

  if (!rows[0]) {
    throw new StoreError("This board has no DB ID column on Monday yet (run scripts/createDbIdColumns.js).", 503);
  }

  return rows[0].db_id_column;
}

// Creates the Monday item (1 call) with the record's key in "DB ID".
async function createMondayItem(boardId, name, dbIdColumn, key) {
  const response = await mondayFetch(process.env.MONDAY_API_URL, {
    method: "POST",
    headers: mondayHeaders(),
    body: JSON.stringify({
      query: `${SYNC_MARKER}\nmutation ($boardId: ID!, $name: String!, $values: JSON) { create_item(board_id: $boardId, item_name: $name, column_values: $values) { id } }`,
      variables: { boardId, name, values: JSON.stringify({ [dbIdColumn]: key }) },
    }),
  });
  const result = await response.json();
  const id = result.data?.create_item?.id;

  if (!id) {
    throw new Error(result.errors?.[0]?.message ?? "Monday didn't return the new item's id.");
  }

  return Number(id);
}

// Creates a record. Its Monday item is created first, straight away (1
// call), so the record gets its permanent Monday id (the app's ids stay
// Monday's); the rest of its fields reach Monday with the nightly sync.
// Crash-safe: the record is noted in pending_creations with a key before
// Monday is called, and the key is stored in the item's "DB ID" column, so
// the sync can find an item whose creation was interrupted instead of
// making a duplicate. `mondayItemId` may be given for an item that already
// exists in Monday (no Monday call then).
export async function createItem(table, { mondayItemId, name, fields }) {
  const board = await boardFor(table);
  const entries = resolveFields(board, fields);

  if (!name || typeof name !== "string") {
    throw new StoreError("A name is required.");
  }

  if (mondayItemId !== undefined) {
    return insertRecord(board, { id: checkId(mondayItemId), name, key: null, entries });
  }

  const dbIdColumn = await dbIdColumnFor(board.boardId);
  const key = randomUUID();

  await query("insert into pending_creations (key, board_id, table_name, name, fields) values ($1, $2, $3, $4, $5)", [
    key,
    board.boardId,
    table,
    name,
    JSON.stringify(fields ?? {}),
  ]);

  let id;

  try {
    id = await createMondayItem(board.boardId, name, dbIdColumn, key);
  } catch (err) {
    // Left pending: if Monday did create it, the next sync finds it by key.
    throw new StoreError(
      err.rateLimited ? err.message : `Couldn't confirm the item was created in Monday (${err.message}). If it was, it will appear after the next sync.`,
      err.rateLimited ? 429 : 502,
    );
  }

  await query("update pending_creations set monday_item_id = $2 where key = $1", [key, id]);

  return insertRecord(board, { id, name, key, entries, pendingKey: key });
}

// Creates a record in the database only, with no Monday call: it gets a
// temporary negative id, and the nightly sync creates its Monday item and
// swaps in the Monday id. For records nothing else links to by id
// (notifications, Activity Log entries, App Settings rows); the record's
// `key` (record_uid) never changes, so use that where an id must last.
export async function createLocalItem(table, { name, fields }) {
  const board = await boardFor(table);
  const entries = resolveFields(board, fields);

  if (!name || typeof name !== "string") {
    throw new StoreError("A name is required.");
  }

  const { rows } = await query("select -nextval('local_item_ids') as id");

  return insertRecord(board, { id: Number(rows[0].id), name, key: randomUUID(), entries, local: true });
}

// For modules that query a board themselves: the table's field (column)
// name for a Monday column id, its companion field, and rows -> records.
export async function boardFields(table) {
  const board = await boardFor(table);

  const field = (columnId) => {
    const column = board.columns.get(columnId);

    if (!column) {
      throw new StoreError(`Column ${columnId} isn't mapped on ${table} (run scripts/databaseSchema.js).`, 503);
    }

    return column.name;
  };

  return {
    table: board.table,
    field,
    extra: (columnId) => board.columns.get(columnId)?.extra ?? null,
    type: (columnId) => board.columns.get(columnId)?.type ?? null,
    toRecord: (row) => ({ ...toRecord(board, row), key: row.record_uid ?? null }),
  };
}

// Completes a creation interrupted after its Monday item was made (called by
// the sync's recovery with a pending_creations row that has monday_item_id).
export async function finishCreation(pending) {
  const board = await boardFor(pending.table_name);
  const { rows } = await query(`select 1 from ${ident(board.table)} where monday_item_id = $1`, [Number(pending.monday_item_id)]);

  if (rows.length) {
    await query("update pending_creations set status = 'done' where key = $1", [pending.key]);
    return null;
  }

  return insertRecord(board, {
    id: Number(pending.monday_item_id),
    name: pending.name,
    key: pending.key,
    entries: resolveFields(board, pending.fields),
    pendingKey: pending.key,
  });
}

export async function updateItem(table, id, { name, fields }) {
  const board = await boardFor(table);
  const itemId = checkId(id);
  const entries = resolveFields(board, fields);

  if (name !== undefined && (typeof name !== "string" || !name)) {
    throw new StoreError("The name can't be empty.");
  }

  if (entries.length === 0 && name === undefined) {
    throw new StoreError("Nothing to change.");
  }

  return transaction(async (run) => {
    const sets = [
      ...(name !== undefined ? [["name", name]] : []),
      ...entries.map((entry) => [entry.field, entry.value]),
    ];
    const values = sets.map(([, value]) => value);

    const { rows } = await run(
      `update ${ident(table)} set ${sets.map(([field], index) => `${ident(field)} = $${index + 1}`).join(", ")}, updated_at = now()
       where monday_item_id = $${values.length + 1} returning *`,
      [...values, itemId],
    ).catch((err) => {
      throw new StoreError(err.message);
    });

    if (!rows[0]) {
      throw new StoreError(`${table} item ${id} not found.`, 404);
    }

    await queueForMonday(run, {
      boardId: board.boardId,
      itemId,
      action: "update",
      changes: { ...(name !== undefined && { name }), columns: mondayChanges(board, entries, rows[0]) },
    });

    return toRecord(board, rows[0]);
  });
}

export async function deleteItem(table, id) {
  const board = await boardFor(table);
  const itemId = checkId(id);

  return transaction(async (run) => {
    const { rowCount } = await run(`delete from ${ident(table)} where monday_item_id = $1`, [itemId]);

    if (!rowCount) {
      throw new StoreError(`${table} item ${id} not found.`, 404);
    }

    await queueForMonday(run, { boardId: board.boardId, itemId, action: "delete", changes: {} });
  });
}
