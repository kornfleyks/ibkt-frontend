// One-off: adds the Cat Passport date columns to the Cats board. They are the
// passport values that had no place on the cat (docs/cat-passport.md): the
// microchip implant date, the first and booster Tricat vaccinations, the
// rabies vaccination and the last deworming. Prints the ids for
// src/constants/boards/cats.js; then run `node scripts/databaseSchema.js
// --refresh` so the database gets the columns.
//
//   node scripts/addCatPassportColumns.js
//
// Costs 1 Monday call to read the board and 1 for each column it creates.
// Safe to re-run: an existing date column with a title is reused.
import "dotenv/config";
import { CATS } from "../../src/constants/boards/cats.js";
import { mondayDirectRequest as monday } from "../mondayClient.js";

const COLUMNS = [
  { key: "MICROCHIP_IMPLANT_DATE", title: "Microchip Implant Date" },
  { key: "FIRST_TRICAT", title: "First Tricat" },
  { key: "BOOSTER_TRICAT", title: "Booster Tricat" },
  { key: "RABIES_VACCINATION", title: "Rabies Vaccination" },
  { key: "LAST_DEWORMED", title: "Last Dewormed" },
];

const { boards } = await monday(`query ($id: [ID!]) { boards(ids: $id) { columns { id title type } } }`, { id: [CATS.BOARD_ID] });
const existing = boards[0].columns;
const lines = [];

for (const { key, title } of COLUMNS) {
  let column = existing.find((candidate) => candidate.title === title);

  if (column && column.type !== "date") {
    console.error(`"${title}" exists but is a ${column.type} column, not date. Rename it on Monday first.`);
    process.exit(1);
  }

  if (column) {
    console.log(`Already exists: ${title} (${column.id})`);
  } else {
    const { create_column: created } = await monday(
      `mutation ($boardId: ID!, $title: String!, $description: String) {
        create_column(board_id: $boardId, title: $title, column_type: date, description: $description) { id }
      }`,
      { boardId: CATS.BOARD_ID, title, description: "Cat Passport date, edited on the cat's Medical tab in the IBKT app." },
    );

    column = { id: created.id };
    console.log(`Created: ${title} (${column.id})`);
  }

  lines.push(`    ${key}: "${column.id}", // ${title} | date`);
}

console.log(`\nIn src/constants/boards/cats.js:\n${lines.join("\n")}`);
