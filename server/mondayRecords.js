import { mondayDirectRequest } from "./mondayClient.js";
import { clearCache } from "./mondayCache.js";
import { InputError } from "./database/boardRecords.js";

// App records straight from Monday, described by the same field specs the
// database layer uses (database/boardRecords.js: { column, read?, write? }),
// for modules that work in both storage modes (postAdoption/mondayStore.js,
// aiReview/). Changes are checked the same way as in the database.

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ID_PATTERN = /^\d+$/;

// Status column id -> its labels. The status constants use the same keys
// as the board's COLUMNS (e.g. POST_ADOPTION_STATUS_OPTIONS.ESCALATION_REQUIRED
// for POST_ADOPTION.COLUMNS.ESCALATION_REQUIRED).
export function statusLabelsOf(columns, statusOptions) {
  return new Map(
    Object.entries(columns)
      .filter(([key]) => statusOptions[key])
      .map(([key, columnId]) => [columnId, Object.values(statusOptions[key])]),
  );
}

function readValue(spec, column) {
  switch (spec.read) {
    case "firstId":
      return column?.linked_item_ids?.[0] ? String(column.linked_item_ids[0]) : null;
    case "ids":
      return (column?.linked_item_ids ?? []).map(String);
    case "firstName":
    case "names":
      return column?.display_value ?? "";
    case "checked":
      return column?.text === "v";
    default:
      return column?.text ?? "";
  }
}

function toRecord(item, fields) {
  const columns = new Map(item.column_values.map((column) => [column.id, column]));
  const record = { id: String(item.id), name: item.name ?? "", createdAt: item.created_at ?? null };

  for (const [key, spec] of Object.entries(fields)) {
    record[key] = spec.column === "name" ? item.name ?? "" : readValue(spec, columns.get(spec.column));
  }

  return record;
}

// App values -> Monday column values, checked (only fields with `write`).
export function toMondayColumnValues(fields, values, statusLabels) {
  const out = {};

  for (const [key, value] of Object.entries(values)) {
    const spec = fields[key];

    if (!spec?.write) throw new InputError(`"${key}" can't be changed.`);

    const empty = value === null || value === "";

    switch (spec.write) {
      case "text":
        if (!empty && typeof value !== "string") throw new InputError(`${key} must be text.`);
        out[spec.column] = empty ? "" : value;
        break;
      case "longText":
        if (!empty && typeof value !== "string") throw new InputError(`${key} must be text.`);
        out[spec.column] = { text: empty ? "" : value };
        break;
      case "status":
        if (!empty && !statusLabels.get(spec.column)?.includes(value)) throw new InputError(`Unknown ${key} "${value}".`);
        out[spec.column] = empty ? {} : { label: value };
        break;
      case "date":
        if (!empty && !(typeof value === "string" && DATE_PATTERN.test(value))) throw new InputError(`${key} must be YYYY-MM-DD.`);
        out[spec.column] = empty ? {} : { date: value };
        break;
      case "number":
        if (!empty && !Number.isFinite(Number(value))) throw new InputError(`${key} must be a number.`);
        out[spec.column] = empty ? "" : String(Number(value));
        break;
      case "checkbox":
        if (typeof value !== "boolean") throw new InputError(`${key} must be true or false.`);
        out[spec.column] = value ? { checked: "true" } : null;
        break;
      case "links": {
        const ids = empty ? [] : Array.isArray(value) ? value : [value];

        if (!ids.every((id) => ID_PATTERN.test(String(id)))) throw new InputError(`${key} must be item ids.`);
        out[spec.column] = { item_ids: [...new Set(ids.map(Number))] };
        break;
      }
      default:
        throw new InputError(`"${key}" can't be changed.`);
    }
  }

  return out;
}

// The item as a record of `fields`, or null when it isn't on `boardId`.
export async function readMondayRecord(boardId, fields, itemId) {
  if (!ID_PATTERN.test(String(itemId))) return null;

  const columnIds = [...new Set(Object.values(fields).map((spec) => spec.column).filter((column) => column !== "name"))];
  const data = await mondayDirectRequest(
    `query ($ids: [ID!], $columnIds: [String!]) {
      items(ids: $ids) {
        id name created_at board { id }
        column_values(ids: $columnIds) { id text ... on BoardRelationValue { linked_item_ids display_value } }
      }
    }`,
    { ids: [String(itemId)], columnIds },
  );
  const item = data.items?.[0];

  return item && String(item.board?.id) === String(boardId) ? toRecord(item, fields) : null;
}

export async function createMondayItem(boardId, name, columnValues) {
  const data = await mondayDirectRequest(
    `mutation ($boardId: ID!, $name: String!, $values: JSON) {
      create_item(board_id: $boardId, item_name: $name, column_values: $values) { id }
    }`,
    { boardId: String(boardId), name, values: JSON.stringify(columnValues) },
  );

  clearCache([String(boardId)]);

  return String(data.create_item.id);
}

// Saves `changes` (checked) and answers { before, after } records, or null
// when the item isn't on the board.
export async function changeMondayRecord(boardId, fields, itemId, changes, statusLabels) {
  const before = await readMondayRecord(boardId, fields, itemId);

  if (!before) return null;

  if (!Object.keys(changes).length) throw new InputError("Nothing to change.");

  await mondayDirectRequest(
    `mutation ($boardId: ID!, $itemId: ID!, $values: JSON!) {
      change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $values) { id }
    }`,
    { boardId: String(boardId), itemId: String(itemId), values: JSON.stringify(toMondayColumnValues(fields, changes, statusLabels)) },
  );

  clearCache([String(boardId)]);

  return { before, after: await readMondayRecord(boardId, fields, itemId) };
}
