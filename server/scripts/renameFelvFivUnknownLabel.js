// One-off: renames the "Unknown" status label to "Not Tested Yet" on both
// FeLV Status and FIV Status (agreed 2026-10-05) - makes it the default
// value for a new cat rather than an ambiguous "we don't know". Keeps the
// same label index/color, so no existing data changes meaning.
//
//   node scripts/renameFelvFivUnknownLabel.js
//
// Safe to re-run: a column whose label is already "Not Tested Yet" is left alone.
import "dotenv/config";
import { CATS } from "../../src/constants/boards/cats.js";
import { mondayDirectRequest as monday } from "../mondayClient.js";

const OLD_LABEL = "Unknown";
const NEW_LABEL = "Not Tested Yet";
const COLUMNS = [CATS.COLUMNS.FELV_STATUS, CATS.COLUMNS.FIV_STATUS];

// Monday's classic status var_name (from settings_str) -> the
// StatusColumnColors enum update_status_column expects.
const VAR_NAME_TO_ENUM = {
  orange: "working_orange",
  "green-shadow": "done_green",
  "red-shadow": "stuck_red",
  "blue-links": "dark_blue",
};

const { boards } = await monday(`query ($id: [ID!]) { boards(ids: $id) { columns { id title type settings_str revision } } }`, {
  id: [CATS.BOARD_ID],
});
const columns = boards[0].columns;

for (const columnId of COLUMNS) {
  const column = columns.find((candidate) => candidate.id === columnId);

  if (!column) {
    console.error(`Column ${columnId} not found.`);
    continue;
  }

  const settings = JSON.parse(column.settings_str);
  const indices = Object.keys(settings.labels ?? {});

  if (!indices.some((index) => settings.labels[index] === OLD_LABEL)) {
    console.log(`${column.title}: no "${OLD_LABEL}" label found (already renamed?) - left alone.`);
    continue;
  }

  const labels = indices.map((index) => {
    const varName = settings.labels_colors?.[index]?.var_name;
    const color = VAR_NAME_TO_ENUM[varName];

    if (!color) {
      throw new Error(`${column.title}: no color mapping for var_name "${varName}" (index ${index}) - add it to VAR_NAME_TO_ENUM.`);
    }

    return {
      index: Number(index),
      label: settings.labels[index] === OLD_LABEL ? NEW_LABEL : settings.labels[index],
      color,
    };
  });

  await monday(
    `mutation ($boardId: ID!, $columnId: String!, $labels: [UpdateStatusLabelInput!]!, $revision: String!) {
      update_status_column(board_id: $boardId, id: $columnId, revision: $revision, settings: { labels: $labels }) { id }
    }`,
    { boardId: CATS.BOARD_ID, columnId, labels, revision: column.revision },
  );

  console.log(`${column.title}: "${OLD_LABEL}" -> "${NEW_LABEL}"`);
}
