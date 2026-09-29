import { query, ident } from "./db.js";
import { MIRRORED_BOARDS } from "./mondaySchema.js";
import { namesOf } from "./columnText.js";
import { resolveBoardName, resolveColumnLabel } from "../activityLog.js";

// Every change the nightly sync gave up on (monday_outbox rows with status
// "failed"), explained for the App Settings Sync card: which board and
// item, what it tried to change (field names and readable values), how
// many tries, and Monday's answer.

const LIMIT = 500;

const ACTION_TEXT = {
  create: "Create item",
  update: "Update item",
  delete: "Archive item",
  create_update: "Post message",
};

function tableOf(boardId) {
  return MIRRORED_BOARDS.find((board) => board.boardId === String(boardId))?.table ?? null;
}

function titleOf(columnName) {
  return columnName.replace(/_/g, " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

// A queued Monday value as people read it.
function readable(type, value, names) {
  if (value === null || value === undefined || value === "" || (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0)) {
    return "Empty (clears the field)";
  }

  if (typeof value !== "object") return String(value);

  switch (type) {
    case "date":
      return value.date ? `${value.date}${value.time ? ` ${value.time.slice(0, 5)}` : ""}` : JSON.stringify(value);
    case "checkbox":
      return value.checked === "true" || value.checked === true ? "Checked" : "Unchecked";
    case "board_relation":
      return (value.item_ids ?? []).map((id) => names.get(String(id)) || `item ${id}`).join(", ") || "(no links)";
    case "status":
      return value.label ?? JSON.stringify(value);
    case "dropdown":
      return (value.labels ?? []).join(", ") || JSON.stringify(value);
    case "long_text":
      return value.text ?? JSON.stringify(value);
    case "country":
      return value.countryName ?? value.countryCode ?? JSON.stringify(value);
    case "phone":
      return value.phone ?? JSON.stringify(value);
    case "email":
      return value.email ?? JSON.stringify(value);
    default:
      return value.label ?? value.text ?? JSON.stringify(value);
  }
}

export async function getSyncFailures() {
  const { rows } = await query(
    `select id, board_id, monday_item_id, action, changes, attempts, last_error, created_at
     from monday_outbox where status = 'failed' order by id desc limit $1`,
    [LIMIT],
  );

  if (!rows.length) return [];

  const boardIds = [...new Set(rows.map((row) => String(row.board_id)))];
  const { rows: columns } = await query("select board_id, column_id, column_name, monday_type from monday_columns where board_id = any($1)", [boardIds]);
  const columnInfo = new Map(columns.map((column) => [`${column.board_id}:${column.column_id}`, column]));

  // Item names, per board table.
  const itemNames = new Map();

  for (const boardId of boardIds) {
    const table = tableOf(boardId);
    const ids = rows.filter((row) => String(row.board_id) === boardId && row.monday_item_id !== null).map((row) => Number(row.monday_item_id));

    if (!table || !ids.length) continue;

    const { rows: items } = await query(`select monday_item_id, name from ${ident(table)} where monday_item_id = any($1)`, [ids]);

    for (const item of items) itemNames.set(`${boardId}:${item.monday_item_id}`, item.name ?? "");
  }

  // Names of linked items anywhere in the failed changes.
  const linkedIds = rows.flatMap((row) =>
    Object.values(row.changes?.columns ?? {}).flatMap((value) => (value && Array.isArray(value.item_ids) ? value.item_ids : [])),
  );
  const names = await namesOf(linkedIds);

  return rows.map((row) => {
    const boardId = String(row.board_id);
    const itemId = row.monday_item_id === null ? null : String(row.monday_item_id);
    const changes = [];

    if (row.changes?.name !== undefined) changes.push({ field: "Name", columnId: "name", value: String(row.changes.name) });
    if (row.changes?.body !== undefined) changes.push({ field: "Message", columnId: null, value: String(row.changes.body) });

    for (const [columnId, value] of Object.entries(row.changes?.columns ?? {})) {
      const info = columnInfo.get(`${boardId}:${columnId}`);
      const label = resolveColumnLabel(boardId, columnId);

      changes.push({
        field: label !== columnId ? label : info ? titleOf(info.column_name) : columnId,
        columnId,
        type: info?.monday_type ?? null,
        value: readable(info?.monday_type, value, names),
        raw: value,
      });
    }

    return {
      id: String(row.id),
      board: resolveBoardName(boardId) === "Unknown board" ? tableOf(boardId) ?? boardId : resolveBoardName(boardId),
      boardId,
      itemId,
      itemName: itemId ? itemNames.get(`${boardId}:${itemId}`) ?? "" : "",
      // A negative id: the item only exists in the database so far.
      onMonday: itemId !== null && Number(itemId) > 0,
      action: row.action,
      actionText: ACTION_TEXT[row.action] ?? row.action,
      changes,
      attempts: Number(row.attempts),
      error: row.last_error ?? "",
      queuedAt: new Date(row.created_at).toISOString(),
    };
  });
}
