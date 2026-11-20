// One-off: creates the Fosters board (docs/foster-onboarding.md) in the same
// workspace as the app's other boards, with its columns, and the Linked Foster
// relation columns on the Cats and Users boards. Prints the ids for
// src/constants/boards/fosters.js, cats.js and users.js. Then add the board to
// src/database/mondaySchema.js, run `node scripts/createDbIdColumns.js` and
// `node scripts/databaseSchema.js --refresh`.
//
//   node scripts/createFostersBoard.js
//
// Costs about 25 Monday calls. Safe to re-run: an existing Fosters board, and
// existing columns with the same title, are reused.
import "dotenv/config";
import { CATS } from "../../src/constants/boards/cats.js";
import { USERS } from "../../src/constants/boards/users.js";
import { mondayDirectRequest as monday } from "../mondayClient.js";

const WORKSPACE_ID = "6437712"; // "Main workspace", where every app board lives.
const BOARD_NAME = "Fosters";
const REFLECTION_TITLE = "link to Cats"; // As on the Rescuers board.

// key, title, type, status labels (in order) or null.
const COLUMNS = [
  ["FOSTER_ID", "Foster ID", "item_id"],
  ["STATUS", "Status", "status", ["New", "Active", "Inactive", "Archive"]],
  ["FIRST_NAME", "First Name", "text"],
  ["LAST_NAME", "Last Name", "text"],
  ["EMAIL", "Email", "email"],
  ["PHONE", "Phone", "phone"],
  ["COUNTRY", "Country", "country"],
  ["CITY", "City", "text"],
  ["ADDRESS", "Address", "long_text"],
  ["EMERGENCY_CONTACT", "Emergency Contact", "long_text"],
  ["REFERENCES", "References", "long_text"],
  ["FOSTER_AGREEMENT_SIGNED", "Foster Agreement Signed", "status", ["Pending", "Signed", "Rejected"]],
  ["AGREEMENT_DATE", "Agreement Date", "date"],
  ["NOTES", "Notes", "long_text"],
];

async function boardColumns(boardId) {
  const { boards } = await monday(`query ($id: [ID!]) { boards(ids: $id) { columns { id title type settings_str } } }`, { id: [boardId] });

  return boards[0].columns;
}

async function createColumn(boardId, title, type, defaults, description) {
  const { create_column: created } = await monday(
    `mutation ($boardId: ID!, $title: String!, $type: ColumnType!, $defaults: JSON, $description: String) {
      create_column(board_id: $boardId, title: $title, column_type: $type, defaults: $defaults, description: $description) { id }
    }`,
    { boardId, title, type, defaults, description },
  );

  return created.id;
}

// 1. The board.
const { boards: existing } = await monday(`query { boards(limit: 200, workspace_ids: [${WORKSPACE_ID}]) { id name state } }`);
let boardId = existing.find((board) => board.name === BOARD_NAME && board.state === "active")?.id;

if (boardId) {
  console.log(`Board already exists: ${boardId}`);
} else {
  const { create_board: board } = await monday(
    `mutation ($name: String!, $workspaceId: ID!) { create_board(board_name: $name, board_kind: public, workspace_id: $workspaceId) { id } }`,
    { name: BOARD_NAME, workspaceId: WORKSPACE_ID },
  );

  boardId = board.id;
  console.log(`Board created: ${boardId}`);

  // A new board can come with starter columns (Person, Status, Date): they are
  // not wanted, and the board is empty, so they are removed.
  for (const column of await boardColumns(boardId)) {
    if (column.type === "name" || column.type === "subtasks") continue;

    await monday(`mutation ($boardId: ID!, $columnId: String!) { delete_column(board_id: $boardId, column_id: $columnId) { id } }`, { boardId, columnId: column.id });
    console.log(`Removed starter column: ${column.title} (${column.id})`);
  }
}

// 2. The columns.
let current = await boardColumns(boardId);
const ids = {};

for (const [key, title, type, labels] of COLUMNS) {
  let column = current.find((candidate) => candidate.title === title && candidate.type === type);

  if (!column) {
    const defaults = labels ? JSON.stringify({ labels: Object.fromEntries(labels.map((label, index) => [String(index), label])) }) : undefined;

    try {
      column = { id: await createColumn(boardId, title, type, defaults) };
      console.log(`Created: ${title} (${column.id})`);
    } catch (err) {
      // Only the Foster ID (an item id column) is allowed to be missing.
      if (key !== "FOSTER_ID") throw err;

      console.warn(`Skipped ${title}: ${err.message}`);
      continue;
    }
  }

  ids[key] = { id: column.id, title, type };
}

// 3. The link from the Cats board (a cat has one foster; Monday adds the
// reflection column on the Fosters board, a foster has many cats).
current = await boardColumns(CATS.BOARD_ID);
let catsLink = current.find((column) => column.title === "Linked Foster" && column.type === "board_relation");

if (catsLink) {
  console.log(`Cats link already exists: ${catsLink.id}`);
} else {
  const id = await createColumn(
    CATS.BOARD_ID,
    "Linked Foster",
    "board_relation",
    JSON.stringify({ boardIds: [Number(boardId)], allowMultipleItems: false, allowCreateReflectionColumn: true }),
    "The foster looking after this cat. Set from the IBKT app.",
  );

  catsLink = { id };
  console.log(`Created on Cats: Linked Foster (${id})`);
}

// 4. The link from the Users board (a login is linked to its foster record,
// as Linked Rescuer is), with no reflection column.
current = await boardColumns(USERS.BOARD_ID);
let usersLink = current.find((column) => column.title === "Linked Foster" && column.type === "board_relation");

if (usersLink) {
  console.log(`Users link already exists: ${usersLink.id}`);
} else {
  const id = await createColumn(
    USERS.BOARD_ID,
    "Linked Foster",
    "board_relation",
    JSON.stringify({ boardIds: [Number(boardId)], allowMultipleItems: false, allowCreateReflectionColumn: false }),
    "The foster record of this login. Set from the IBKT app.",
  );

  usersLink = { id };
  console.log(`Created on Users: Linked Foster (${id})`);
}

// 5. The reflection column on the Fosters board: keep its Monday settings, but
// title it like the Rescuers board's.
current = await boardColumns(boardId);

const reflection = current.find((column) => column.type === "board_relation" && JSON.parse(column.settings_str || "{}").boardIds?.includes(Number(CATS.BOARD_ID)));

if (!reflection) {
  console.warn("No link column to Cats was found on the Fosters board. Check the Cats link before going on.");
} else if (reflection.title !== REFLECTION_TITLE) {
  await monday(
    `mutation ($boardId: ID!, $columnId: String!, $title: String!) { change_column_title(board_id: $boardId, column_id: $columnId, title: $title) { id } }`,
    { boardId, columnId: reflection.id, title: REFLECTION_TITLE },
  );
  console.log(`Renamed the reflection column "${reflection.title}" to "${REFLECTION_TITLE}" (${reflection.id})`);
}

console.log("\nAll columns of the Fosters board:", current.map((column) => `${column.id} ${column.title} (${column.type})`).join("; "));
console.log(`\nIn src/constants/boards/fosters.js:\n  BOARD_ID: "${boardId}",`);

for (const [key, { id, title, type }] of Object.entries(ids)) console.log(`    ${key}: "${id}", // ${title} | ${type}`);

console.log(`    LINK_TO_CATS: "${reflection?.id}", // ${REFLECTION_TITLE} | board_relation`);
console.log(`\nIn src/constants/boards/cats.js:\n    LINKED_FOSTER: "${catsLink.id}", // Linked Foster | board_relation`);
console.log(`\nIn src/constants/boards/users.js:\n    LINKED_FOSTER: "${usersLink.id}", // Linked Foster | board_relation`);
