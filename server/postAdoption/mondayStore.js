import { POST_ADOPTION } from "../../src/constants/boards/postAdoption.js";
import { POST_ADOPTION_STATUS_OPTIONS } from "../../src/constants/statuses/postAdoptionStatuses.js";
import { ACTIVE_APPLICATIONS } from "../../src/constants/boards/activeApplications.js";
import { mondayDirectRequest } from "../mondayClient.js";
import { clearCache } from "../mondayCache.js";
import { InputError } from "../database/boardRecords.js";
import { POST_ADOPTION_FIELDS, CREATE_ONLY_FIELDS, BOARD_ID } from "./fields.js";

// Post-adoption records straight from Monday, for when "post_adoption" is
// not in DATABASE_BOARDS. Same interface and record shape as
// databaseStore.js; changes are checked the same way (status labels from
// src/constants/statuses/postAdoptionStatuses.js).

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ID_PATTERN = /^\d+$/;
const COLUMN_IDS = [...new Set(Object.values(POST_ADOPTION_FIELDS).map((spec) => spec.column))];

// Status column id -> its labels (the status constants use the same keys
// as the board's COLUMNS).
const STATUS_LABELS = new Map(
  Object.entries(POST_ADOPTION.COLUMNS)
    .filter(([key]) => POST_ADOPTION_STATUS_OPTIONS[key])
    .map(([key, columnId]) => [columnId, Object.values(POST_ADOPTION_STATUS_OPTIONS[key])]),
);

function readValue(spec, column) {
  switch (spec.read) {
    case "firstId":
      return column?.linked_item_ids?.[0] ? String(column.linked_item_ids[0]) : null;
    case "firstName":
      return column?.display_value ?? "";
    case "checked":
      return column?.text === "v";
    default:
      return column?.text ?? "";
  }
}

function toRecord(item) {
  const columns = new Map(item.column_values.map((column) => [column.id, column]));
  const record = { id: String(item.id), name: item.name ?? "" };

  for (const [key, spec] of Object.entries(POST_ADOPTION_FIELDS)) {
    record[key] = readValue(spec, columns.get(spec.column));
  }

  return record;
}

// App values -> Monday column values, checked.
function toColumnValues(fields, values) {
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
        if (!empty && !STATUS_LABELS.get(spec.column)?.includes(value)) throw new InputError(`Unknown ${key} "${value}".`);
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

export async function getRecord(id) {
  if (!ID_PATTERN.test(String(id))) return null;

  const data = await mondayDirectRequest(
    `query ($ids: [ID!], $columnIds: [String!]) {
      items(ids: $ids) {
        id name board { id }
        column_values(ids: $columnIds) { id text ... on BoardRelationValue { linked_item_ids display_value } }
      }
    }`,
    { ids: [String(id)], columnIds: COLUMN_IDS },
  );
  const item = data.items?.[0];

  return item && String(item.board?.id) === BOARD_ID ? toRecord(item) : null;
}

// Through the application's side of the two-way link.
export async function findByApplication(applicationId) {
  const data = await mondayDirectRequest(
    `query ($ids: [ID!], $columnIds: [String!]) {
      items(ids: $ids) { column_values(ids: $columnIds) { ... on BoardRelationValue { linked_item_ids } } }
    }`,
    { ids: [String(applicationId)], columnIds: [ACTIVE_APPLICATIONS.COLUMNS.LINKED_POST_ADOPTION_MANAGEMENT] },
  );
  const ids = data.items?.[0]?.column_values?.[0]?.linked_item_ids ?? [];
  const newest = ids.map(Number).sort((a, b) => b - a)[0];

  return newest ? getRecord(newest) : null;
}

export async function createPostAdoption({ name, values, applicationId, catId }) {
  const columnValues = toColumnValues(
    { ...POST_ADOPTION_FIELDS, ...CREATE_ONLY_FIELDS },
    { ...values, linkedApplicationIds: [applicationId], linkedCatIds: catId ? [catId] : [] },
  );

  const data = await mondayDirectRequest(
    `mutation ($boardId: ID!, $name: String!, $values: JSON) {
      create_item(board_id: $boardId, item_name: $name, column_values: $values) { id }
    }`,
    { boardId: BOARD_ID, name, values: JSON.stringify(columnValues) },
  );

  clearCache([BOARD_ID]);

  return getRecord(data.create_item.id);
}

export async function updatePostAdoption(id, changes) {
  const before = await getRecord(id);

  if (!before) return null;

  if (!Object.keys(changes).length) throw new InputError("Nothing to change.");

  await mondayDirectRequest(
    `mutation ($boardId: ID!, $itemId: ID!, $values: JSON!) {
      change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $values) { id }
    }`,
    { boardId: BOARD_ID, itemId: String(id), values: JSON.stringify(toColumnValues(POST_ADOPTION_FIELDS, changes)) },
  );

  clearCache([BOARD_ID]);

  return { before, after: await getRecord(id) };
}
