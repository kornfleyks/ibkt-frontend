import { CATS } from "../src/constants/boards/cats.js";
import { USERS } from "../src/constants/boards/users.js";
import { RESCUERS } from "../src/constants/boards/rescuers.js";
import { ACTIVE_APPLICATIONS } from "../src/constants/boards/activeApplications.js";
import { TRAVEL } from "../src/constants/boards/travel.js";
import { POST_ADOPTION } from "../src/constants/boards/postAdoption.js";
import { TASKS } from "../src/constants/boards/tasks.js";
import { ACTIVITY_LOG } from "../src/constants/boards/activityLog.js";

const MONDAY_API_URL = process.env.MONDAY_API_URL;
const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN;

// Every board that can appear as the *target* of a logged action, mapped to
// a friendly name and its column registry - used to decode a raw board_id
// or column_id into something readable in the log's Description. Hardcoded
// here (rather than derived from the ambiguous aggregate `boards.js`, whose
// `ADOPTIONS` key actually points at the Active Applications board id) so
// the name shown always matches what that board is called in its own file.
const BOARD_REGISTRY = {
  [CATS.BOARD_ID]: { name: "Cats", columns: CATS.COLUMNS },
  [USERS.BOARD_ID]: { name: "Users", columns: USERS.COLUMNS },
  [RESCUERS.BOARD_ID]: { name: "Rescuers", columns: RESCUERS.COLUMNS },
  [ACTIVE_APPLICATIONS.BOARD_ID]: { name: "Active Applications", columns: ACTIVE_APPLICATIONS.COLUMNS },
  [TRAVEL.BOARD_ID]: { name: "Travel", columns: TRAVEL.COLUMNS },
  [POST_ADOPTION.BOARD_ID]: { name: "Post-Adoption", columns: POST_ADOPTION.COLUMNS },
  [TASKS.BOARD_ID]: { name: "Tasks", columns: TASKS.COLUMNS },
};

// CommunicationsService's create_update mutation (Cat Communications posts)
// doesn't send a board_id - it's the only caller of that mutation today, so
// this is a safe hardcoded association rather than a guess.
export const CATS_BOARD_ID = CATS.BOARD_ID;

function titleCase(constantKey) {
  return constantKey
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function resolveBoardName(boardId) {
  return BOARD_REGISTRY[boardId]?.name ?? "Unknown board";
}

export function resolveColumnLabel(boardId, columnId) {
  const columns = BOARD_REGISTRY[boardId]?.columns;

  if (!columns) {
    return columnId;
  }

  const key = Object.entries(columns).find(([, id]) => id === columnId)?.[0];

  return key ? titleCase(key) : columnId;
}

// Decodes the JSON payload this app's own mutation helpers send for a
// column value (see src/services/MondayService.js) into a plain display
// string - e.g. {"label":"Approved"} -> "Approved", {"item_ids":[123]} ->
// "1 linked item(s)". Falls back to the raw JSON for shapes we don't
// recognize rather than hiding them.
export function describeColumnValue(rawValue) {
  let value = rawValue;

  if (typeof rawValue === "string") {
    try {
      value = JSON.parse(rawValue);
    } catch {
      return rawValue;
    }
  }

  if (value == null || value === "") {
    return "(empty)";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "object") {
    if (value.label != null) return String(value.label);
    if (Array.isArray(value.labels)) return value.labels.join(", ");
    if (value.text != null) return String(value.text);
    if (Array.isArray(value.item_ids)) return `${value.item_ids.length} linked item(s)`;
    if (value.email != null) return String(value.email);
  }

  return JSON.stringify(value);
}

// Concurrent create_item calls against the Activity Log board have been
// observed to occasionally corrupt each other on Monday's side (a status
// column value landing on the wrong row - e.g. a Login entry showing
// "Register"). logActivity is always called fire-and-forget, so without
// this queue, several log writes from near-simultaneous actions could hit
// Monday at the same time. Chaining them through one promise forces every
// write to this board to happen one at a time, in order.
let writeQueue = Promise.resolve();

function enqueueWrite(task) {
  const result = writeQueue.then(task, task);

  writeQueue = result.catch(() => {});

  return result;
}

// This module writes to Monday with the server's own API token, bypassing
// the public /api/monday proxy - logging must never route back through the
// very handler it's attached to.
async function mondayDirectRequest(query, variables = {}) {
  const response = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      Authorization: MONDAY_API_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  return result.data;
}

// Reads an item's name plus a column's current human-readable value before
// a change_column_value mutation overwrites it - the mutation payload only
// ever carries the new value, so this is the only way to log what it
// changed *from*. Never throws: a failed read degrades to blanks rather
// than blocking the real mutation it's protecting.
export async function getItemSnapshot(itemId, columnId) {
  const query = `
    query ($itemId: [ID!], $columnIds: [String!]) {
      items(ids: $itemId) {
        name
        column_values(ids: $columnIds) {
          text
          ... on BoardRelationValue {
            display_value
          }
        }
      }
    }
  `;

  try {
    const data = await mondayDirectRequest(query, { itemId: [itemId], columnIds: [columnId] });
    const item = data?.items?.[0];
    const column = item?.column_values?.[0];

    return {
      itemName: item?.name ?? "",
      // Relation columns report text as null; their names are on display_value.
      columnText: column?.text || column?.display_value || "",
    };
  } catch (err) {
    console.error("Activity log: failed to read item snapshot.", err);
    return { itemName: "", columnText: "" };
  }
}

// Same idea as getItemSnapshot, for mutations that don't touch a single
// column (file uploads, comments) but still need the item's name for a
// readable Description.
export async function getItemName(itemId) {
  const query = `
    query ($itemId: [ID!]) {
      items(ids: $itemId) {
        name
      }
    }
  `;

  try {
    const data = await mondayDirectRequest(query, { itemId: [itemId] });

    return data?.items?.[0]?.name ?? "";
  } catch (err) {
    console.error("Activity log: failed to read item name.", err);
    return "";
  }
}

// Writes one row to the Activity Log board. Never throws - a logging
// failure must never surface as a failure of the real action it's
// recording, so every error is swallowed here (and console.error'd) rather
// than propagated to the caller.
export async function logActivity({
  actorId = "",
  actorName = "",
  boardId = "",
  boardName = "",
  itemId = "",
  itemName = "",
  actionType,
  description,
  fieldChanged = "",
  oldValue = "",
  newValue = "",
  raw = {},
}) {
  try {
    const now = new Date();

    const columnValues = {
      [ACTIVITY_LOG.COLUMNS.TIMESTAMP]: {
        date: now.toISOString().slice(0, 10),
        time: now.toISOString().slice(11, 19),
      },
      [ACTIVITY_LOG.COLUMNS.ACTOR_NAME]: actorName,
      [ACTIVITY_LOG.COLUMNS.ACTOR_ID]: actorId,
      [ACTIVITY_LOG.COLUMNS.BOARD]: boardName,
      [ACTIVITY_LOG.COLUMNS.TARGET_BOARD_ID]: boardId,
      [ACTIVITY_LOG.COLUMNS.ITEM_NAME]: itemName,
      [ACTIVITY_LOG.COLUMNS.TARGET_ITEM_ID]: itemId,
      [ACTIVITY_LOG.COLUMNS.ACTION_TYPE]: { label: actionType },
      [ACTIVITY_LOG.COLUMNS.DESCRIPTION]: { text: description },
      [ACTIVITY_LOG.COLUMNS.FIELD_CHANGED]: fieldChanged,
      [ACTIVITY_LOG.COLUMNS.OLD_VALUE]: oldValue,
      [ACTIVITY_LOG.COLUMNS.NEW_VALUE]: newValue,
      [ACTIVITY_LOG.COLUMNS.RAW_DETAILS]: { text: JSON.stringify(raw).slice(0, 2000) },
    };

    const mutation = `
      mutation (
        $boardId: ID!,
        $itemName: String!,
        $columnValues: JSON,
        $createLabelsIfMissing: Boolean
      ) {
        create_item(
          board_id: $boardId,
          item_name: $itemName,
          column_values: $columnValues,
          create_labels_if_missing: $createLabelsIfMissing
        ) {
          id
        }
      }
    `;

    await enqueueWrite(() =>
      mondayDirectRequest(mutation, {
        boardId: ACTIVITY_LOG.BOARD_ID,
        itemName: (description || `${actionType} on ${boardName}`).slice(0, 255),
        columnValues: JSON.stringify(columnValues),
        createLabelsIfMissing: true,
      }),
    );
  } catch (err) {
    console.error("Activity log: failed to write log entry.", err);
  }
}
