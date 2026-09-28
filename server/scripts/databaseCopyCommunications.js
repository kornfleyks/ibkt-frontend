// One-time copy of one board's Communications threads (Monday item updates)
// into the communications table, for a board added to
// src/constants/communicationBoards.js after its items were already kept in
// the database - databaseBackfill.js skips such boards entirely, so their
// existing Monday updates would never arrive. Only the communications table
// is written; the board's own rows are not touched. Safe to re-run: messages
// are upserted by their Monday update id, and posts not yet sent to Monday
// (negative ids) are left alone.
//
//   node scripts/databaseCopyCommunications.js applications
import "dotenv/config";
import { mondayDirectRequest } from "../mondayClient.js";
import { closeDatabase } from "../database/db.js";
import { upsertCommunication } from "../database/rows.js";
import { MIRRORED_BOARDS, COMMUNICATION_BOARD_IDS } from "../database/mondaySchema.js";

const PAGE = 500;
const ITEM_FIELDS = `id updates(limit: 100) { id text_body created_at }`;

const table = process.argv[2];
const board = MIRRORED_BOARDS.find((candidate) => candidate.table === table);

if (!board || !COMMUNICATION_BOARD_IDS.includes(board.boardId)) {
  const tables = MIRRORED_BOARDS.filter((candidate) => COMMUNICATION_BOARD_IDS.includes(candidate.boardId)).map((candidate) => candidate.table);

  console.error(`Usage: node scripts/databaseCopyCommunications.js <${tables.join("|")}>`);
  process.exit(1);
}

let mondayCalls = 1;
const first = await mondayDirectRequest(
  `query ($id: [ID!]) { boards(ids: $id) { items_page(limit: ${PAGE}) { cursor items { ${ITEM_FIELDS} } } } }`,
  { id: [board.boardId] },
);
const items = [...(first.boards[0]?.items_page.items ?? [])];
let cursor = first.boards[0]?.items_page.cursor ?? null;

while (cursor) {
  mondayCalls += 1;

  const data = await mondayDirectRequest(
    `query ($cursor: String!) { next_items_page(limit: ${PAGE}, cursor: $cursor) { cursor items { ${ITEM_FIELDS} } } }`,
    { cursor },
  );

  items.push(...data.next_items_page.items);
  cursor = data.next_items_page.cursor;
}

let messages = 0;
let threads = 0;

for (const item of items) {
  if (item.updates.length) threads += 1;

  for (const update of item.updates) {
    await upsertCommunication({
      updateId: update.id,
      boardId: board.boardId,
      itemId: item.id,
      body: update.text_body,
      createdAt: update.created_at,
    });
    messages += 1;
  }
}

console.log(`${table}: ${items.length} items, ${messages} messages on ${threads} of them`);
console.log(`Monday calls used: ${mondayCalls}`);
await closeDatabase();
