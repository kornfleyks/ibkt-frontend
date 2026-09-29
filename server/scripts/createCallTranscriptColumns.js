// One-off: adds the "Call 1 Transcript" and "Call 2 Transcript" file
// columns to the Applications board (call transcripts uploaded on the
// application's Screening tab; pasted transcripts are kept in the
// database instead). Prints the ids for
// src/constants/boards/activeApplications.js; then run
// `node scripts/databaseSchema.js --refresh`.
//
//   node scripts/createCallTranscriptColumns.js
//
// Safe to re-run: existing file columns with these titles are reused.
import "dotenv/config";
import { ACTIVE_APPLICATIONS } from "../../src/constants/boards/activeApplications.js";
import { mondayDirectRequest as monday } from "../mondayClient.js";

const COLUMNS = [
  { key: "CALL_1_TRANSCRIPT", title: "Call 1 Transcript" },
  { key: "CALL_2_TRANSCRIPT", title: "Call 2 Transcript" },
];

const { boards } = await monday(`query ($id: [ID!]) { boards(ids: $id) { columns { id title type } } }`, {
  id: [ACTIVE_APPLICATIONS.BOARD_ID],
});
const existing = boards[0].columns;
const lines = [];

for (const { key, title } of COLUMNS) {
  let column = existing.find((candidate) => candidate.title === title);

  if (column && column.type !== "file") {
    console.error(`"${title}" exists but is a ${column.type} column, not file. Rename it on Monday first.`);
    process.exit(1);
  }

  if (column) {
    console.log(`Already exists: ${title} (${column.id})`);
  } else {
    const { create_column: created } = await monday(
      `mutation ($boardId: ID!, $title: String!, $description: String) {
        create_column(board_id: $boardId, title: $title, column_type: file, description: $description) { id }
      }`,
      { boardId: ACTIVE_APPLICATIONS.BOARD_ID, title, description: "Uploaded from the IBKT app's Screening tab." },
    );

    column = { id: created.id };
    console.log(`Created: ${title} (${column.id})`);
  }

  lines.push(`    ${key}: "${column.id}", // ${title} | file`);
}

console.log(`\nIn src/constants/boards/activeApplications.js:\n${lines.join("\n")}`);
