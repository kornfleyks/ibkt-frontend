import { isDatabaseEnabled } from "./db.js";
import { MIRRORED_BOARDS } from "./mondaySchema.js";

// Which boards this server keeps in the database instead of Monday:
// DATABASE_BOARDS in its environment, e.g. "app_settings,notifications"
// (empty = every board still uses Monday). Per server, not in App Settings
// or the database, because local and Render share the same database -
// switching locally must not switch live.

export function databaseBoards() {
  if (!isDatabaseEnabled()) return [];

  const known = new Set(MIRRORED_BOARDS.map((board) => board.table));

  return (process.env.DATABASE_BOARDS ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter((name) => known.has(name));
}

export function isDatabaseBoard(table) {
  return databaseBoards().includes(table);
}

export function isDatabaseBoardId(boardId) {
  const table = MIRRORED_BOARDS.find((board) => board.boardId === String(boardId))?.table;

  return Boolean(table) && isDatabaseBoard(table);
}

// Whether the database copy of the boards still on Monday can be read
// instead of Monday (e.g. an item's name or a field's old value for the
// Activity Log). Switching the first board on comes after a fresh full copy
// (see docs/database-migration-plan.md, "Rolling out"), so from then on the
// copy is current; before that it may miss changes made on servers
// without the database.
export function isCopyTrusted() {
  return databaseBoards().length > 0;
}
