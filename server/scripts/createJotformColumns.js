// One-off: adds the Jotform form / submission id text columns to the
// Applications board (which Jotform submission each part of an
// application came from; filled by server/jotform/). Missing columns are
// created in ONE Monday request. Prints the ids for
// src/constants/boards/activeApplications.js; then run
// `node scripts/databaseSchema.js --refresh`.
//
//   node scripts/createJotformColumns.js
//
// Safe to re-run: existing text columns with these titles are reused.
import "dotenv/config";
import { ACTIVE_APPLICATIONS } from "../../src/constants/boards/activeApplications.js";
import { mondayDirectRequest as monday } from "../mondayClient.js";

const COLUMNS = [
  { key: "JOTFORM_APPLICATION_FORM_ID", title: "Jotform Application Form ID" },
  { key: "JOTFORM_APPLICATION_SUBMISSION_ID", title: "Jotform Application Submission ID" },
  { key: "JOTFORM_ADOPTION_FORM_FORM_ID", title: "Jotform Adoption Form Form ID" },
  { key: "JOTFORM_ADOPTION_FORM_SUBMISSION_ID", title: "Jotform Adoption Form Submission ID" },
  { key: "JOTFORM_REFERENCE_FORM_ID", title: "Jotform Reference Form ID" },
  { key: "JOTFORM_REFERENCE_1_SUBMISSION_ID", title: "Jotform Reference 1 Submission ID" },
  { key: "JOTFORM_REFERENCE_2_SUBMISSION_ID", title: "Jotform Reference 2 Submission ID" },
  { key: "JOTFORM_REFERENCE_3_SUBMISSION_ID", title: "Jotform Reference 3 Submission ID" },
  { key: "JOTFORM_CONTRACT_FORM_ID", title: "Jotform Contract Form ID" },
  { key: "JOTFORM_CONTRACT_SUBMISSION_ID", title: "Jotform Contract Submission ID" },
];
const DESCRIPTION = "Set by the IBKT app from Jotform. Don't edit.";

const { boards } = await monday(`query ($id: [ID!]) { boards(ids: $id) { columns { id title type } } }`, {
  id: [ACTIVE_APPLICATIONS.BOARD_ID],
});
const existing = boards[0].columns;
const ids = {};
const missing = [];

for (const { key, title } of COLUMNS) {
  const column = existing.find((candidate) => candidate.title === title);

  if (column && column.type !== "text") {
    console.error(`"${title}" exists but is a ${column.type} column, not text. Rename it on Monday first.`);
    process.exit(1);
  }

  if (column) {
    ids[key] = column.id;
    console.log(`Already exists: ${title} (${column.id})`);
  } else {
    missing.push({ key, title });
  }
}

if (missing.length) {
  const mutation = `mutation ($boardId: ID!, $description: String) {
    ${missing.map((_, index) => `c${index}: create_column(board_id: $boardId, title: ${JSON.stringify(missing[index].title)}, column_type: text, description: $description) { id }`).join("\n    ")}
  }`;
  const created = await monday(mutation, { boardId: ACTIVE_APPLICATIONS.BOARD_ID, description: DESCRIPTION });

  missing.forEach(({ key, title }, index) => {
    ids[key] = created[`c${index}`].id;
    console.log(`Created: ${title} (${ids[key]})`);
  });
}

const lines = COLUMNS.map(({ key, title }) => `    ${key}: "${ids[key]}", // ${title} | text`);

console.log(`\nIn src/constants/boards/activeApplications.js:\n${lines.join("\n")}`);
