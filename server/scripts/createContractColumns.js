// One-off: adds the Active Applications column the contract import needs
// (docs/jotform-step3.md): "Adoption Fee" (text: the fee as typed on the
// Pet Adoption Contract). Prints the id for
// src/constants/boards/activeApplications.js; then run
// `node scripts/databaseSchema.js --refresh`.
//
//   node scripts/createContractColumns.js
//
// Safe to re-run: an existing "Adoption Fee" text column is reused.
import "dotenv/config";
import { ACTIVE_APPLICATIONS } from "../../src/constants/boards/activeApplications.js";
import { mondayDirectRequest as monday } from "../mondayClient.js";

const TITLE = "Adoption Fee";

const { boards } = await monday(`query ($id: [ID!]) { boards(ids: $id) { columns { id title type } } }`, { id: [ACTIVE_APPLICATIONS.BOARD_ID] });
let column = boards[0].columns.find((candidate) => candidate.title === TITLE);

if (column && column.type !== "text") {
  console.error(`"${TITLE}" exists but is a ${column.type} column. Rename it on Monday first.`);
  process.exit(1);
}

if (column) {
  console.log(`Already exists: ${column.id}`);
} else {
  const { create_column: created } = await monday(
    `mutation ($boardId: ID!, $title: String!, $description: String) {
      create_column(board_id: $boardId, title: $title, column_type: text, description: $description) { id }
    }`,
    { boardId: ACTIVE_APPLICATIONS.BOARD_ID, title: TITLE, description: "Adoption fee from the Pet Adoption Contract (Jotform, IBKT app)." },
  );
  column = created;
  console.log(`Created: ${column.id}`);
}

console.log(`\nIn src/constants/boards/activeApplications.js:\n    ADOPTION_FEE: "${column.id}", // Adoption Fee | text`);
