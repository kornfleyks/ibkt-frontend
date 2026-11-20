// One-off: adds the "Foster Uploads (pending)" file column to the Cats board
// (docs/foster-onboarding.md). It holds the photos, videos, passport and vet
// report a foster sends with a Kitty Profile until staff review the submission;
// each file's kind (photos, videos, passport, vetReport) is kept in the app's
// file_uploads record. When staff apply the submission the files move to the
// cat's own columns. Prints the id for src/constants/boards/cats.js
// (FOSTER_UPLOADS); then run `node scripts/databaseSchema.js --refresh` so the
// database gets the column.
//
//   node scripts/createFosterUploadsColumn.js
//
// Costs 2 Monday calls. Safe to re-run: an existing file column with this title
// is reused.
import "dotenv/config";
import { CATS } from "../../src/constants/boards/cats.js";
import { mondayDirectRequest as monday } from "../mondayClient.js";

const TITLE = "Foster Uploads (pending)";

const { boards } = await monday(`query ($id: [ID!]) { boards(ids: $id) { columns { id title type } } }`, { id: [CATS.BOARD_ID] });
let column = boards[0].columns.find((candidate) => candidate.title === TITLE);

if (column && column.type !== "file") {
  console.error(`"${TITLE}" exists but is a ${column.type} column, not file. Rename it on Monday first.`);
  process.exit(1);
}

if (column) {
  console.log(`Already exists: ${TITLE} (${column.id})`);
} else {
  const { create_column: created } = await monday(
    `mutation ($boardId: ID!, $title: String!, $description: String) {
      create_column(board_id: $boardId, title: $title, column_type: file, description: $description) { id }
    }`,
    {
      boardId: CATS.BOARD_ID,
      title: TITLE,
      description: "Files a foster sent with a Kitty Profile, waiting for staff to apply them to the cat. Set from the IBKT app.",
    },
  );

  column = { id: created.id };
  console.log(`Created: ${TITLE} (${column.id})`);
}

console.log(`\nIn src/constants/boards/cats.js:\n    FOSTER_UPLOADS: "${column.id}", // ${TITLE} | file`);
