// One-off: adds a "DB ID" text column to every mirrored Monday board, in
// ONE Monday request, and records the column ids in monday_sync_columns.
// Records created through the app store their key there (database/sync.js),
// so a crash mid-creation can find the Monday item instead of duplicating
// it. Boards that already have the column (per the saved column list or
// monday_sync_columns) are skipped, so re-running costs nothing extra.
//
//   node scripts/createDbIdColumns.js
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mondayDirectRequest } from "../mondayClient.js";
import { query, closeDatabase } from "../database/db.js";
import { MIRRORED_BOARDS, DB_ID_COLUMN_TITLE } from "../database/mondaySchema.js";

const CACHE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".cache", "monday-columns.json");
const cached = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) : [];
const recorded = new Set((await query("select board_id from monday_sync_columns")).rows.map((row) => row.board_id));

const missing = [];

for (const { boardId, table } of MIRRORED_BOARDS) {
  if (recorded.has(boardId)) continue;

  const existing = cached.find((board) => String(board.id) === boardId)?.columns.find((column) => column.title === DB_ID_COLUMN_TITLE);

  if (existing) {
    await query("insert into monday_sync_columns (board_id, db_id_column) values ($1, $2) on conflict do nothing", [boardId, existing.id]);
    console.log(`${table}: already has "${DB_ID_COLUMN_TITLE}" (${existing.id})`);
  } else {
    missing.push({ boardId, table });
  }
}

if (missing.length) {
  const mutation = `mutation { ${missing
    .map(({ boardId }, index) => `c${index}: create_column(board_id: ${boardId}, title: "${DB_ID_COLUMN_TITLE}", column_type: text, description: "Set by the IBKT app - do not edit.") { id }`)
    .join("\n")} }`;

  // "# ibkt-sync": the database mirror ignores the app's own bookkeeping writes.
  const data = await mondayDirectRequest(`# ibkt-sync\n${mutation}`);

  for (const [index, { boardId, table }] of missing.entries()) {
    const id = data[`c${index}`]?.id;

    if (id) {
      await query("insert into monday_sync_columns (board_id, db_id_column) values ($1, $2) on conflict do nothing", [boardId, id]);
      console.log(`${table}: added "${DB_ID_COLUMN_TITLE}" (${id})`);
    } else {
      console.error(`${table}: column not created.`);
    }
  }

  console.log(`Monday calls used: 1 (${missing.length} boards)`);
} else {
  console.log("Nothing to add (no Monday call).");
}

await closeDatabase();
