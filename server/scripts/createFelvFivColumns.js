// One-off: splits the combined "FeLV/FIV Status" column on the Cats board
// into two separate status columns, "FeLV Status" and "FIV Status" (agreed
// 2026-10-05 - the combined column couldn't record a cat that was positive
// for one virus and negative for the other). Same labels as the old column
// (Pending/Positive/Negative/Unknown). The old column is kept, renamed
// "FeLV/FIV Status (old)", not deleted. Prints the new ids for
// src/constants/boards/cats.js; then run `node scripts/databaseSchema.js
// --refresh` so the database gets them, then
// `node scripts/backfillFelvFivStatus.js` to copy the old value into both.
//
//   node scripts/createFelvFivColumns.js
//
// Safe to re-run: existing status columns with these titles are reused and
// the rename is skipped once done.
import "dotenv/config";
import { CATS } from "../../src/constants/boards/cats.js";
import { mondayDirectRequest as monday } from "../mondayClient.js";

const OLD_TITLE = "FeLV/FIV Status";
const OLD_TITLE_RENAMED = "FeLV/FIV Status (old)";
const OLD_COLUMN = CATS.COLUMNS.FELV_FIV_STATUS_OLD;

const LABELS = { "0": "Pending", "1": "Positive", "2": "Negative", "3": "Unknown" };
const NEW_COLUMNS = [
  { key: "FELV_STATUS", title: "FeLV Status" },
  { key: "FIV_STATUS", title: "FIV Status" },
];

async function columns() {
  const { boards } = await monday(`query ($id: [ID!]) { boards(ids: $id) { columns { id title type } } }`, { id: [CATS.BOARD_ID] });

  return boards[0].columns;
}

let current = await columns();
const oldColumn = current.find((column) => column.id === OLD_COLUMN);

if (!oldColumn) {
  console.log(`Old column ${OLD_COLUMN} not found - nothing to rename.`);
} else if (oldColumn.title === OLD_TITLE_RENAMED) {
  console.log(`Old column already renamed to "${OLD_TITLE_RENAMED}".`);
} else if (oldColumn.title !== OLD_TITLE) {
  console.log(`Old column ${OLD_COLUMN} is titled "${oldColumn.title}", not "${OLD_TITLE}" - left alone.`);
} else {
  await monday(
    `mutation ($boardId: ID!, $columnId: String!, $title: String!) { change_column_title(board_id: $boardId, column_id: $columnId, title: $title) { id } }`,
    { boardId: CATS.BOARD_ID, columnId: OLD_COLUMN, title: OLD_TITLE_RENAMED },
  );
  console.log(`Renamed ${OLD_COLUMN} "${OLD_TITLE}" -> "${OLD_TITLE_RENAMED}".`);
}

const lines = [];

for (const { key, title } of NEW_COLUMNS) {
  let column = current.find((candidate) => candidate.title === title);

  if (column && column.type !== "status") {
    console.error(`"${title}" exists but is a ${column.type} column, not status. Rename it on Monday first.`);
    process.exit(1);
  }

  if (column) {
    console.log(`Already exists: ${title} (${column.id})`);
  } else {
    const { create_column: created } = await monday(
      `mutation ($boardId: ID!, $title: String!, $defaults: JSON, $description: String) {
        create_column(board_id: $boardId, title: $title, column_type: status, defaults: $defaults, description: $description) { id }
      }`,
      {
        boardId: CATS.BOARD_ID,
        title,
        defaults: JSON.stringify({ labels: LABELS }),
        description: "Split out of the combined FeLV/FIV Status column, 2026-10-05.",
      },
    );

    column = { id: created.id };
    console.log(`Created: ${title} (${column.id})`);
    current = await columns();
  }

  lines.push(`    ${key}: "${column.id}", // ${title} | status`);
}

console.log(`\nIn src/constants/boards/cats.js (replacing FELV_FIV_STATUS):\n${lines.join("\n")}`);
