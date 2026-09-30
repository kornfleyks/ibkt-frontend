// One-off: makes Assigned Volunteer a link to the Users board (agreed
// 2026-09-30). Monday can't change a column's type, so the old text column
// is renamed "Assigned Volunteer (old)" (kept, not deleted; it was empty on
// every application) and a new board_relation column "Assigned Volunteer"
// is created, linking to Users with no reflection column (same as Case
// Owner). Prints the new id for src/constants/boards/activeApplications.js;
// then run `node scripts/databaseSchema.js --refresh` so the database gets it.
//
//   node scripts/createAssignedVolunteerColumn.js
//
// Safe to re-run: an existing link column with that title is reused and the
// rename is skipped once done.
import "dotenv/config";
import { ACTIVE_APPLICATIONS } from "../../src/constants/boards/activeApplications.js";
import { USERS } from "../../src/constants/boards/users.js";
import { mondayDirectRequest as monday } from "../mondayClient.js";

const TITLE = "Assigned Volunteer";
const OLD_TITLE = "Assigned Volunteer (old)";
const OLD_TEXT_COLUMN = ACTIVE_APPLICATIONS.COLUMNS.ASSIGNED_VOLUNTEER_OLD;

async function columns() {
  const { boards } = await monday(`query ($id: [ID!]) { boards(ids: $id) { columns { id title type settings_str } } }`, {
    id: [ACTIVE_APPLICATIONS.BOARD_ID],
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
    { boardId: ACTIVE_APPLICATIONS.BOARD_ID, columnId: OLD_TEXT_COLUMN, title: OLD_TITLE },
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
      boardId: ACTIVE_APPLICATIONS.BOARD_ID,
      title: TITLE,
      defaults: JSON.stringify({ boardIds: [Number(USERS.BOARD_ID)], allowMultipleItems: false, allowCreateReflectionColumn: false }),
      description: "The volunteer helping with this application (an Active Volunteer). Set from the IBKT app.",
    },
  );

  console.log(`Created link column: ${created.id}`);
}

current = await columns();
link = current.find((column) => column.title === TITLE && column.type === "board_relation");

console.log("Link column settings:", link?.settings_str);
console.log(`\nIn src/constants/boards/activeApplications.js:\n    ASSIGNED_VOLUNTEER: "${link?.id}", // Assigned Volunteer | board_relation`);
