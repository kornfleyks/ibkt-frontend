// One-off: adds the Active Applications columns for the Jotform "Adoption
// Form and References" (one column per answer;
// docs/jotform-adoption-form-import.md). The list lives in
// jotform/adoptionReferences/questions.js. Missing columns are created in
// ONE Monday request; status columns get the form's options as labels.
// Prints the ids for src/constants/boards/activeApplications.js; then run
// `node scripts/databaseSchema.js --refresh`.
//
//   node scripts/createAdoptionFormColumns.js           # dry run: what's missing (1 Monday call)
//   node scripts/createAdoptionFormColumns.js --apply   # create them (+1 call)
//
// Safe to re-run: existing columns with these titles (and the same type)
// are reused.
import "dotenv/config";
import { ACTIVE_APPLICATIONS } from "../../src/constants/boards/activeApplications.js";
import { ADOPTION_FORM_COLUMNS } from "../jotform/adoptionReferences/questions.js";
import { mondayDirectRequest as monday } from "../mondayClient.js";

const APPLY = process.argv.includes("--apply");
const DESCRIPTION = "Adoption Form and References answer (Jotform, IBKT app).";

// Status label indexes: 5 is Monday's grey "no status", so it's skipped.
function statusDefaults(labels) {
  const indexes = [0, 1, 2, 3, 4, 6, 7, 8, 9, 10];

  return JSON.stringify({ labels: Object.fromEntries(labels.map((label, position) => [String(indexes[position]), label])) });
}

const { boards } = await monday(`query ($id: [ID!]) { boards(ids: $id) { columns { id title type } } }`, {
  id: [ACTIVE_APPLICATIONS.BOARD_ID],
});
const existing = boards[0].columns;
const ids = {};
const missing = [];

for (const column of ADOPTION_FORM_COLUMNS) {
  const found = existing.find((candidate) => candidate.title === column.title);

  if (found && found.type !== column.type) {
    console.error(`"${column.title}" exists but is a ${found.type} column, not ${column.type}. Rename it on Monday first.`);
    process.exit(1);
  }

  if (found) {
    ids[column.key] = found.id;
    console.log(`Already exists: ${column.title} (${found.id})`);
  } else {
    missing.push(column);
  }
}

console.log(`${existing.length} columns on the board; ${missing.length} of ${ADOPTION_FORM_COLUMNS.length} to create.`);

if (missing.length && !APPLY) {
  for (const column of missing) console.log(`  would create: ${column.title} (${column.type})`);
  console.log("\nDry run. Run again with --apply to create them.");
  process.exit(0);
}

if (missing.length) {
  const fields = missing.map((column, index) => {
    const defaults = column.labels ? `, defaults: ${JSON.stringify(statusDefaults(column.labels))}` : "";

    return `c${index}: create_column(board_id: $boardId, title: ${JSON.stringify(column.title)}, column_type: ${column.type}, description: $description${defaults}) { id }`;
  });
  const created = await monday(`mutation ($boardId: ID!, $description: String) {\n    ${fields.join("\n    ")}\n  }`, {
    boardId: ACTIVE_APPLICATIONS.BOARD_ID,
    description: DESCRIPTION,
  });

  missing.forEach((column, index) => {
    ids[column.key] = created[`c${index}`].id;
    console.log(`Created: ${column.title} (${ids[column.key]})`);
  });
}

const lines = ADOPTION_FORM_COLUMNS.map(({ key, title, type }) => `    ${key}: "${ids[key]}", // ${title} | ${type}`);

console.log(`\nIn src/constants/boards/activeApplications.js:\n${lines.join("\n")}`);
