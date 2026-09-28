import { query, ident } from "./db.js";
import { boardFields, createItem, updateItem, StoreError } from "./boardStore.js";
import { MIRRORED_BOARDS } from "./mondaySchema.js";
import { namesOf, linkedIdsIn, linkedItems, textOf, fileValues } from "./columnText.js";
import { logActivity, resolveColumnLabel } from "../activityLog.js";

// Shared by the board modules (server/cats.js, applications.js, ...): each
// declares its app fields - which Monday column, how it reads and how it's
// changed - and this turns database rows into those records, checks and
// saves changes, and logs them with old and new values.
//
// A field spec: { column, read?, write?, empty?, label?, shownBy? }
//   read:  "text" (default: Monday's text) | "names" (linked item names) |
//          "firstId" | "ids" | "items" ([{ id, name }]) | "firstName" |
//          "checked" | "files" | "equals" (text === spec.value) | "utc"
//          (date + time as an ISO string)
//   empty: the value when the text is empty (e.g. "N/A"; default "")
//   write: "text" | "longText" | "status" | "dropdown" (one label, new ones
//          allowed) | "number" | "links" (ids) | "date" | "name" (the item name)
//   label: the Activity Log's field name (default: the column's)
//   shownBy: another field whose value the log shows (e.g. an id field shown by name)

export class InputError extends Error {}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ID_PATTERN = /^\d+$/;

function boardIdOf(table) {
  return MIRRORED_BOARDS.find((board) => board.table === table).boardId;
}

function readValue(spec, type, main, extraValue, names) {
  switch (spec.read) {
    case "names":
      return textOf("board_relation", main ?? [], null, names) || (spec.empty ?? "");
    case "firstId":
      return main?.[0] === undefined ? null : String(main[0]);
    case "ids":
      return (main ?? []).map(String);
    case "items":
      return linkedItems(main, names);
    case "firstName":
      return main?.[0] === undefined ? "" : names.get(String(main[0])) ?? "";
    case "checked":
      return main === true;
    case "files":
      return fileValues(main);
    case "equals":
      return textOf(type, main, extraValue, names) === spec.value;
    case "utc":
      return main ? `${main}T${extraValue || "00:00:00"}Z` : null;
    default: {
      const text = textOf(type, main, extraValue, names);

      return text === "" ? spec.empty ?? "" : text;
    }
  }
}

// Rows of `table` -> records ({ id, name, ...fields }).
export async function readRecords(table, fields, { where = "", params = [], order = "monday_item_id" } = {}) {
  const board = await boardFields(table);
  const { rows } = await query(`select * from ${ident(table)} ${where ? `where ${where}` : ""} order by ${order}`, params);
  const linkFields = Object.values(fields)
    .filter((spec) => spec.column !== "name" && board.type(spec.column) === "board_relation")
    .map((spec) => board.field(spec.column));
  const names = await namesOf(linkedIdsIn(rows, [...new Set(linkFields)]));

  return rows.map((row) => {
    const record = { id: String(row.monday_item_id), name: row.name ?? "" };

    for (const [key, spec] of Object.entries(fields)) {
      if (spec.column === "name") {
        record[key] = row.name ?? "";
        continue;
      }

      const field = board.field(spec.column);
      const extraField = board.extra(spec.column);

      record[key] = readValue(spec, board.type(spec.column), row[field], extraField ? row[extraField] : null, names);
    }

    return record;
  });
}

export async function readRecord(table, fields, id) {
  if (!ID_PATTERN.test(String(id))) return null;

  return (await readRecords(table, fields, { where: "monday_item_id = $1", params: [Number(id)] }))[0] ?? null;
}

export async function exists(table, id) {
  if (!ID_PATTERN.test(String(id ?? ""))) return false;

  const { rows } = await query(`select 1 from ${ident(table)} where monday_item_id = $1`, [Number(id)]);

  return rows.length > 0;
}

// A status / dropdown column's labels.
export async function optionLabels(table, columnId) {
  const { rows } = await query("select label from column_options where board_id = $1 and column_id = $2 order by position nulls last, label", [
    boardIdOf(table),
    columnId,
  ]);

  return rows.map((row) => row.label);
}

// A dropdown label typed for the first time joins the list at once
// (Monday adds it at the nightly sync; re-reading Monday's columns
// replaces these).
async function rememberLabel(table, columnId, label) {
  await query(
    `insert into column_options (board_id, column_id, option_key, label, position)
     select $1, $2, 'app:' || $3, $3, coalesce(max(position), 0) + 1 from column_options where board_id = $1 and column_id = $2
       and not exists (select 1 from column_options where board_id = $1 and column_id = $2 and label = $3)
     on conflict do nothing`,
    [boardIdOf(table), columnId, label],
  );
}

// App values -> { name?, fields } for the store, checked. Only the fields
// in `changes` that `writable` lists.
async function toStoreValues(table, fields, changes) {
  const board = await boardFields(table);
  const out = { fields: {} };

  for (const [key, value] of Object.entries(changes)) {
    const spec = fields[key];

    if (!spec?.write) throw new InputError(`"${key}" can't be changed.`);

    if (spec.write === "name") {
      if (typeof value !== "string" || !value.trim()) throw new InputError("A name is required.");
      out.name = value.trim().slice(0, 255);
      continue;
    }

    const field = board.field(spec.column);

    switch (spec.write) {
      case "text":
      case "longText":
        if (value !== null && typeof value !== "string") throw new InputError(`${key} must be text.`);
        out.fields[field] = value === null ? null : value;
        break;
      case "status":
        if (value === null || value === "") {
          out.fields[field] = null;
        } else {
          if (!(await optionLabels(table, spec.column)).includes(value)) throw new InputError(`Unknown ${key} "${value}".`);
          out.fields[field] = value;
        }
        break;
      case "dropdown":
        if (value === null || value === "") {
          out.fields[field] = null;
        } else {
          if (typeof value !== "string") throw new InputError(`${key} must be text.`);
          await rememberLabel(table, spec.column, value.trim());
          out.fields[field] = [value.trim()];
        }
        break;
      case "number":
        if (value !== null && value !== "" && !Number.isFinite(Number(value))) throw new InputError(`${key} must be a number.`);
        out.fields[field] = value === null || value === "" ? null : Number(value);
        break;
      case "date":
        if (value !== null && !(typeof value === "string" && DATE_PATTERN.test(value))) throw new InputError(`${key} must be YYYY-MM-DD.`);
        out.fields[field] = value;
        break;
      case "links": {
        const ids = value === null ? [] : Array.isArray(value) ? value : [value];

        if (!ids.every((id) => ID_PATTERN.test(String(id)))) throw new InputError(`${key} must be item ids.`);
        out.fields[field] = [...new Set(ids.map(Number))];
        break;
      }
      default:
        throw new InputError(`"${key}" can't be changed.`);
    }
  }

  return out;
}

// Creates the record (its Monday item at once - 1 call) and returns it.
export async function createRecord(table, fields, { name, values }) {
  const { fields: stored } = await toStoreValues(table, fields, values);
  const record = await createItem(table, { name, fields: stored });

  return readRecord(table, fields, record.id);
}

// Saves `changes` and returns { before, after } records.
export async function changeRecord(table, fields, id, changes) {
  const before = await readRecord(table, fields, id);

  if (!before) return null;

  if (!Object.keys(changes).length) throw new InputError("Nothing to change.");

  const values = await toStoreValues(table, fields, changes);

  await updateItem(table, id, values);

  return { before, after: await readRecord(table, fields, id) };
}

function shown(record, key, fields) {
  const shownKey = fields[key]?.shownBy ?? key;
  const value = record[shownKey];

  if (value === null || value === undefined || value === "" || value === "N/A") return "(empty)";

  return Array.isArray(value) ? value.map((entry) => entry?.name ?? entry).join(", ") || "(empty)" : String(value);
}

// Activity Log entries for the changed fields, as the Monday route wrote them.
export function logChanges({ actor, table, boardName, fields, before, after, keys }) {
  const boardId = boardIdOf(table);

  for (const key of keys) {
    const from = shown(before, key, fields);
    const to = shown(after, key, fields);

    if (from === to) continue;

    const spec = fields[key];
    const fieldChanged = spec.label ?? (spec.column === "name" ? "Name" : resolveColumnLabel(boardId, spec.column));
    const itemName = after.name || before.name || `item ${after.id}`;

    logActivity({
      actorId: actor.id,
      actorName: actor.name,
      boardId,
      boardName,
      itemId: after.id,
      itemName,
      actionType: "Updated",
      description: `${actor.name} changed ${fieldChanged} from "${from}" to "${to}" on ${itemName}`,
      fieldChanged,
      oldValue: from,
      newValue: to,
      raw: { [key]: after[key] },
    });
  }
}

export function logCreated({ actor, table, boardName, record, raw }) {
  logActivity({
    actorId: actor.id,
    actorName: actor.name,
    boardId: boardIdOf(table),
    boardName,
    itemId: record.id,
    itemName: record.name,
    actionType: "Created",
    description: `${actor.name} created "${record.name}" on ${boardName}`,
    raw,
  });
}

export function actorOf(req) {
  return { id: req.user.sub, name: `${req.user.firstName} ${req.user.lastName}`.trim() };
}

// Runs a route's work and answers: 404 for null, 400/StoreError status,
// 429 for Monday's rate limit, else 500.
export function send(res, work, what = "request") {
  work
    .then((result) => (result === null ? res.status(404).json({ error: "Not found." }) : res.json(result)))
    .catch((err) => {
      if (err instanceof InputError) return res.status(400).json({ error: err.message });
      if (err instanceof StoreError) return res.status(err.status).json({ error: err.message });
      if (err.rateLimited) return res.status(429).json({ error: err.message, retryAfterSeconds: err.retryAfterSeconds });

      console.error(`${what}:`, err);
      res.status(500).json({ error: `The ${what} failed.` });
    });
}
