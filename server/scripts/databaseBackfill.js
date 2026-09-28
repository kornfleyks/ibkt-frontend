// One-time copy of the current Monday data into the mirror tables (run
// scripts/databaseSchema.js first). Every board is fetched in one Monday
// request where possible (more pages only for boards over 500 items), plus
// the Communications threads. Safe to re-run: rows are upserted.
//
// Boards switched on in DATABASE_BOARDS are skipped: the database is their
// store and may hold changes Monday only gets at the nightly sync, which a
// copy from Monday would undo.
//
//   node scripts/databaseBackfill.js
import "dotenv/config";
import { mondayDirectRequest } from "../mondayClient.js";
import { closeDatabase } from "../database/db.js";
import { loadColumnMap, upsertItems, upsertCommunication, columnValues } from "../database/rows.js";
import { MIRRORED_BOARDS as ALL_BOARDS, COMMUNICATION_BOARD_IDS, readToDb } from "../database/mondaySchema.js";
import { databaseBoards } from "../database/switches.js";

const skipped = databaseBoards();
const MIRRORED_BOARDS = ALL_BOARDS.filter((board) => !skipped.includes(board.table));

const PAGE = 500;
const ITEM_FIELDS = `id name created_at column_values { id type text value ... on BoardRelationValue { linked_item_ids } }`;
const UPDATE_FIELDS = `updates(limit: 100) { id text_body created_at }`;

let mondayCalls = 0;

async function monday(query, variables) {
  mondayCalls += 1;
  return mondayDirectRequest(query, variables);
}

function itemsSelection(boardId) {
  return `${ITEM_FIELDS}${COMMUNICATION_BOARD_IDS.includes(boardId) ? ` ${UPDATE_FIELDS}` : ""}`;
}

// First page of every board, in one request; falls back to one per board.
async function firstPages() {
  const aliases = MIRRORED_BOARDS.map(
    (board, index) => `b${index}: boards(ids: [${board.boardId}]) { items_page(limit: ${PAGE}) { cursor items { ${itemsSelection(board.boardId)} } } }`,
  );

  try {
    const data = await monday(`query { ${aliases.join("\n")} }`);

    return MIRRORED_BOARDS.map((board, index) => data[`b${index}`]?.[0]?.items_page ?? { cursor: null, items: [] });
  } catch (err) {
    console.warn(`One request for all boards was refused (${err.message}); fetching board by board.`);

    const pages = [];

    for (const board of MIRRORED_BOARDS) {
      const data = await monday(
        `query ($id: [ID!]) { boards(ids: $id) { items_page(limit: ${PAGE}) { cursor items { ${itemsSelection(board.boardId)} } } } }`,
        { id: [board.boardId] },
      );
      pages.push(data.boards[0]?.items_page ?? { cursor: null, items: [] });
    }

    return pages;
  }
}

async function remainingItems(boardId, cursor) {
  const items = [];

  while (cursor) {
    const data = await monday(
      `query ($cursor: String!) { next_items_page(limit: ${PAGE}, cursor: $cursor) { cursor items { ${itemsSelection(boardId)} } } }`,
      { cursor },
    );

    items.push(...data.next_items_page.items);
    cursor = data.next_items_page.cursor;
  }

  return items;
}

const columnMap = await loadColumnMap();
const pages = await firstPages();
const report = [];

for (const [index, board] of MIRRORED_BOARDS.entries()) {
  const mapping = columnMap.get(board.boardId);

  if (!mapping) {
    report.push(`${board.table}: no columns mapped - run scripts/databaseSchema.js first`);
    continue;
  }

  const items = [...pages[index].items, ...(await remainingItems(board.boardId, pages[index].cursor))];

  const rows = items.map((item) => {
    const values = {};

    for (const column of item.column_values) {
      const target = mapping.columns.get(column.id);

      if (target) {
        Object.assign(values, columnValues(target, readToDb(target.type, column, item, target.options)));
      }
    }

    return { mondayItemId: item.id, name: item.name, createdAt: item.created_at, values };
  });

  const written = rows.length ? await upsertItems(mapping.table, rows) : 0;
  let messages = 0;

  for (const item of items) {
    for (const update of item.updates ?? []) {
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

  report.push(`${board.table.padEnd(14)} ${String(written).padStart(5)} rows${messages ? `, ${messages} messages` : ""}`);
}

console.log(report.join("\n"));

if (skipped.length) {
  console.log(`Skipped (kept in the database): ${skipped.join(", ")}`);
}
console.log(`Monday calls used: ${mondayCalls}`);
await closeDatabase();
