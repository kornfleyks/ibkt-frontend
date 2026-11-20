// One-off: adds the "Additional Call Transcripts" file column to the
// Applications board. It holds the transcript files of screening Calls 3 and
// above (Calls 1 and 2 have their own columns); each file's call number is
// kept in the app's file_uploads record (docs/screening-extra-calls.md).
// Prints the id for src/constants/boards/activeApplications.js
// (ADDITIONAL_CALL_TRANSCRIPTS); then run `node scripts/databaseSchema.js
// --refresh` so the database gets the column.
//
//   node scripts/createAdditionalCallTranscriptColumn.js
//
// Costs 2 Monday calls. Safe to re-run: an existing file column with this
// title is reused.
import "dotenv/config";
import { ACTIVE_APPLICATIONS } from "../../src/constants/boards/activeApplications.js";
import { mondayDirectRequest as monday } from "../mondayClient.js";

const TITLE = "Additional Call Transcripts";

const { boards } = await monday(`query ($id: [ID!]) { boards(ids: $id) { columns { id title type } } }`, {
  id: [ACTIVE_APPLICATIONS.BOARD_ID],
});
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
    { boardId: ACTIVE_APPLICATIONS.BOARD_ID, title: TITLE, description: "Transcript files of screening Calls 3 and above, uploaded from the IBKT app's Screening tab." },
  );

  column = { id: created.id };
  console.log(`Created: ${TITLE} (${column.id})`);
}

console.log(`\nIn src/constants/boards/activeApplications.js:\n    ADDITIONAL_CALL_TRANSCRIPTS: "${column.id}", // ${TITLE} | file`);
