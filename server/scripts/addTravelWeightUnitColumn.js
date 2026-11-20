// One-off: prepares the Travel board for the crate weight with a unit.
// The board has a numbers column titled "Weight (kg)". This script renames
// its title to "Crate Weight" and adds a status column "Weight Unit" with the
// labels kg and lb. Prints the ids for src/constants/boards/travel.js; then
// run `node scripts/databaseSchema.js --refresh` so the database gets the new
// column. The renamed column keeps its database column name (weight_kg).
//
//   node scripts/addTravelWeightUnitColumn.js
//
// Costs 2 to 4 Monday calls. Safe to re-run: a column that already has the
// new title is reused.
import "dotenv/config";
import { TRAVEL } from "../../src/constants/boards/travel.js";
import { mondayDirectRequest as monday } from "../mondayClient.js";

const WEIGHT_COLUMN_ID = "numeric_mm48gcnt";
const WEIGHT_TITLE = "Crate Weight";
const UNIT_TITLE = "Weight Unit";

const { boards } = await monday(`query ($id: [ID!]) { boards(ids: $id) { columns { id title type } } }`, { id: [TRAVEL.BOARD_ID] });
const columns = boards[0].columns;
const weight = columns.find((column) => column.id === WEIGHT_COLUMN_ID);

if (!weight || weight.type !== "numbers") {
  console.error(`The numbers column ${WEIGHT_COLUMN_ID} was not found on the Travel board.`);
  process.exit(1);
}

if (weight.title === WEIGHT_TITLE) {
  console.log(`Already titled: ${WEIGHT_TITLE} (${weight.id})`);
} else {
  await monday(
    `mutation ($boardId: ID!, $columnId: String!, $value: String!) {
      change_column_metadata(board_id: $boardId, column_id: $columnId, column_property: title, value: $value) { id title }
    }`,
    { boardId: TRAVEL.BOARD_ID, columnId: WEIGHT_COLUMN_ID, value: WEIGHT_TITLE },
  );
  console.log(`Renamed "${weight.title}" to "${WEIGHT_TITLE}" (${weight.id})`);
}

let unit = columns.find((column) => column.title === UNIT_TITLE);

if (unit && unit.type !== "status") {
  console.error(`"${UNIT_TITLE}" exists but is a ${unit.type} column, not status. Rename it on Monday first.`);
  process.exit(1);
}

if (unit) {
  console.log(`Already exists: ${UNIT_TITLE} (${unit.id})`);
} else {
  const { create_column: created } = await monday(
    `mutation ($boardId: ID!, $title: String!, $defaults: JSON) {
      create_column(board_id: $boardId, title: $title, column_type: status, defaults: $defaults) { id }
    }`,
    { boardId: TRAVEL.BOARD_ID, title: UNIT_TITLE, defaults: JSON.stringify({ labels: { 1: "kg", 2: "lb" } }) },
  );

  unit = { id: created.id };
  console.log(`Created: ${UNIT_TITLE} (${unit.id})`);
}

console.log(`\nIn src/constants/boards/travel.js:\n    CRATE_WEIGHT: "${weight.id}", // ${WEIGHT_TITLE} | numbers\n    WEIGHT_UNIT: "${unit.id}", // ${UNIT_TITLE} | status`);
