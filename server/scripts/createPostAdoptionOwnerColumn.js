// One-off: makes Post-Adoption Owner a link to the Users board. Monday can't
// change a column's type, so the old text column is renamed
// "Post-Adoption Owner (old)" (kept, not deleted - agreed 2026-09-28) and a
// new board_relation column "Post-Adoption Owner" is created, linking to
// Users with no reflection column (same as Case Owner). Prints the new id
// for src/constants/boards/postAdoption.js; then run
// `node scripts/databaseSchema.js --refresh` so the database gets it.
//
//   node scripts/createPostAdoptionOwnerColumn.js
//
// Safe to re-run: an existing link column with that title is reused and the
// rename is skipped once done.
import "dotenv/config";
import { POST_ADOPTION } from "../../src/constants/boards/postAdoption.js";
import { USERS } from "../../src/constants/boards/users.js";
import { mondayDirectRequest as monday } from "../mondayClient.js";

const TITLE = "Post-Adoption Owner";
const OLD_TITLE = "Post-Adoption Owner (old)";
const OLD_TEXT_COLUMN = POST_ADOPTION.COLUMNS.POST_ADOPTION_OWNER_OLD;

async function columns() {
  const { boards } = await monday(`query ($id: [ID!]) { boards(ids: $id) { columns { id title type settings_str } } }`, {
    id: [POST_ADOPTION.BOARD_ID],
  });

  return boards[0].columns;
}

let current = await columns();
const oldColumn = current.find((column) => column.id === OLD_TEXT_COLUMN);

if (!oldColumn) {
  console.log(`Old text column ${OLD_TEXT_COLUMN} not found - nothing to rename.`);
} else if (oldColumn.title === OLD_TITLE) {
  console.log(`Old text column already renamed to "${OLD_TITLE}".`);
} else {
  await monday(
    `mutation ($boardId: ID!, $columnId: String!, $title: String!) {
      change_column_title(board_id: $boardId, column_id: $columnId, title: $title) { id }
    }`,
    { boardId: POST_ADOPTION.BOARD_ID, columnId: OLD_TEXT_COLUMN, title: OLD_TITLE },
  );
  console.log(`Renamed ${OLD_TEXT_COLUMN} "${oldColumn.title}" -> "${OLD_TITLE}".`);
}

let link = current.find((column) => column.title === TITLE && column.type === "board_relation");

if (link) {
  console.log(`Link column already exists: ${link.id} - not creating another.`);
} else {
  const { create_column: created } = await monday(
    `mutation ($boardId: ID!, $title: String!, $defaults: JSON, $description: String) {
      create_column(board_id: $boardId, title: $title, column_type: board_relation, defaults: $defaults, description: $description) { id }
    }`,
    {
      boardId: POST_ADOPTION.BOARD_ID,
      title: TITLE,
      defaults: JSON.stringify({ boardIds: [Number(USERS.BOARD_ID)], allowMultipleItems: false, allowCreateReflectionColumn: false }),
      description: "The user following up this adoption. Set from the IBKT app.",
    },
  );

  console.log(`Created link column: ${created.id}`);
}

current = await columns();
link = current.find((column) => column.title === TITLE && column.type === "board_relation");

console.log("Link column settings:", link?.settings_str);
console.log(`\nIn src/constants/boards/postAdoption.js:\n    POST_ADOPTION_OWNER: "${link?.id}", // Post-Adoption Owner | board_relation`);
