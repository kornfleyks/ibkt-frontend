import { parse, Kind, valueFromASTUntyped } from "graphql";
import { isDatabaseEnabled, query } from "./db.js";
import { loadColumnMap, upsertItems, deleteItem, upsertCommunication, columnValues } from "./rows.js";
import { MIRRORED_BOARDS, COMMUNICATION_BOARD_IDS, inputToDb } from "./mondaySchema.js";

// Live mirror: every mutation Monday accepted is replayed onto the database
// (tables from scripts/databaseSchema.js), straight from the request that
// was sent - no extra Monday call. Hooked into mondayFetch, so it covers
// every write the server makes: proxied app saves, activity-log batches,
// notifications, logins, case owners, communications. Files aren't copied.
//
// Never throws and never delays the real request: work is queued, done in
// order, and failures are only logged (see getMirrorStatus).

// Marks the app's own writes to Monday (sync.js), which aren't mirrored back.
export const SYNC_MARKER = "# ibkt-sync";

const MAP_REFRESH_MS = 10 * 60_000;
const MAP_RETRY_MS = 60_000;

let columnMap = null;
let mapLoadedAt = 0;
let mapFailedAt = 0;
let queue = Promise.resolve();
let status = { day: null, mirrored: 0, failed: 0, lastAt: null, lastError: null };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function track(ok, error) {
  if (status.day !== today()) {
    status = { day: today(), mirrored: 0, failed: 0, lastAt: status.lastAt, lastError: status.lastError };
  }

  if (ok) {
    status.mirrored += 1;
    status.lastAt = new Date().toISOString();
  } else {
    status.failed += 1;
    status.lastError = { at: new Date().toISOString(), message: error };
  }
}

// { mirrored, failed (today), lastAt, lastError } for the Database card.
export function getMirrorStatus() {
  const current = status.day === today() ? status : { ...status, mirrored: 0, failed: 0 };

  return { enabled: isDatabaseEnabled(), mirroredToday: current.mirrored, failedToday: current.failed, lastAt: current.lastAt, lastError: current.lastError };
}

async function getColumnMap() {
  const now = Date.now();

  if (columnMap && now - mapLoadedAt < MAP_REFRESH_MS) {
    return columnMap;
  }

  if (!columnMap && now - mapFailedAt < MAP_RETRY_MS) {
    return null;
  }

  try {
    columnMap = await loadColumnMap();
    mapLoadedAt = now;
  } catch (err) {
    mapFailedAt = now;
    console.error("Database mirror: couldn't load the column map (run scripts/databaseSchema.js?).", err.message);
  }

  return columnMap;
}

function parseJson(value) {
  if (value && typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// { column_id: raw input } -> { name?, values } for one board's table.
function toRow(mapping, input) {
  const values = {};
  let name;

  for (const [columnId, raw] of Object.entries(input ?? {})) {
    if (columnId === "name") {
      // Arrives JSON-encoded ('"New name"') like every other column value.
      name = inputToDb("name", raw)?.main ?? "";
      continue;
    }

    const target = mapping.columns.get(columnId);

    if (target) {
      Object.assign(values, columnValues(target, inputToDb(target.type, raw, target.options)));
    }
  }

  return { name, values };
}

// Which communications board an item belongs to (create_update carries no
// board id).
async function communicationBoardOf(itemId) {
  if (COMMUNICATION_BOARD_IDS.length === 1) {
    return COMMUNICATION_BOARD_IDS[0];
  }

  for (const boardId of COMMUNICATION_BOARD_IDS) {
    const table = MIRRORED_BOARDS.find((board) => board.boardId === boardId)?.table;
    const { rowCount } = await query(`select 1 from "${table}" where monday_item_id = $1`, [Number(itemId)]);

    if (rowCount) return boardId;
  }

  return null;
}

async function applyField(map, field, args, result) {
  const mappingFor = (boardId) => map.get(String(boardId));

  switch (field) {
    case "create_item": {
      const mapping = mappingFor(args.board_id);

      if (!mapping || !result?.id) return false;

      const { values } = toRow(mapping, parseJson(args.column_values));
      await upsertItems(mapping.table, [{ mondayItemId: result.id, name: args.item_name, createdAt: new Date().toISOString(), values }]);
      return true;
    }

    case "change_column_value":
    case "change_simple_column_value": {
      const mapping = mappingFor(args.board_id);

      if (!mapping || !result) return false;

      const { name, values } = toRow(mapping, { [args.column_id]: args.value });

      if (name === undefined && Object.keys(values).length === 0) return false;

      await upsertItems(mapping.table, [{ mondayItemId: args.item_id, ...(name !== undefined && { name }), values }]);
      return true;
    }

    case "change_multiple_column_values": {
      const mapping = mappingFor(args.board_id);

      if (!mapping || !result) return false;

      const { name, values } = toRow(mapping, parseJson(args.column_values));
      await upsertItems(mapping.table, [{ mondayItemId: args.item_id, ...(name !== undefined && { name }), values }]);
      return true;
    }

    case "create_update": {
      if (!result?.id) return false;

      const boardId = await communicationBoardOf(args.item_id);

      if (!boardId) return false;

      await upsertCommunication({
        updateId: result.id,
        boardId,
        itemId: args.item_id,
        body: result.text_body ?? args.body,
        createdAt: result.created_at ?? new Date().toISOString(),
      });
      return true;
    }

    case "delete_item":
    case "archive_item": {
      if (!result) return false;

      for (const board of MIRRORED_BOARDS) {
        await deleteItem(board.table, args.item_id);
      }
      return true;
    }

    default:
      // e.g. file uploads/removals (update_assets_on_item) - not mirrored.
      return false;
  }
}

async function apply(queryText, variables, data) {
  const map = await getColumnMap();

  if (!map) return;

  const operation = parse(queryText).definitions.find((definition) => definition.kind === Kind.OPERATION_DEFINITION);

  if (operation?.operation !== "mutation") return;

  for (const selection of operation.selectionSet.selections) {
    if (selection.kind !== Kind.FIELD) continue;

    const field = selection.name.value;
    const key = selection.alias?.value ?? field;
    const args = Object.fromEntries(
      (selection.arguments ?? []).map((argument) => [argument.name.value, valueFromASTUntyped(argument.value, variables ?? {})]),
    );

    try {
      if (await applyField(map, field, args, data?.[key])) {
        track(true);
      }
    } catch (err) {
      track(false, `${field}: ${err.message}`);
      console.error(`Database mirror: ${field} failed.`, err.message);
    }
  }
}

// Called by mondayFetch for every answered Monday request. Only mutations
// are mirrored; everything happens after the caller already has its answer.
export function mirrorMondayRequest(requestBody, response) {
  // Multipart bodies (file uploads) aren't strings - and files aren't copied.
  if (!isDatabaseEnabled() || typeof requestBody !== "string") {
    return;
  }

  let request;

  try {
    request = JSON.parse(requestBody);
  } catch {
    return;
  }

  if (typeof request?.query !== "string" || !/^\s*mutation\b/.test(request.query)) {
    return;
  }

  // The nightly sync and record creation (sync.js) send the database's own
  // data to Monday, marked "# ibkt-sync" - nothing to copy back. (The
  // marker comes first, so the mutation check above already skips them;
  // this makes it explicit.)
  if (request.query.includes(SYNC_MARKER)) {
    return;
  }

  const answer = response.clone().json().catch(() => null);

  queue = queue
    .then(async () => {
      const result = await answer;

      if (result?.data) {
        await apply(request.query, request.variables, result.data);
      }
    })
    .catch((err) => {
      track(false, err.message);
      console.error("Database mirror: failed.", err.message);
    });
}
